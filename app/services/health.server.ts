// ============================================================================
// 🩺 HEALTH AUDIT SERVICE — Core Scan Engine (`app/services/health.server.ts`)
// ============================================================================
// Fetches live product data from the Shopify GraphQL Admin API and evaluates
// each product against 8 defect rules. Only lightweight audit metadata is
// stored locally — product data is never duplicated in our database.
// ============================================================================

import { StoreRepository } from "../repositories/store.server";
import { ScanRepository } from "../repositories/scan.server";

export class HealthService {
  /**
   * Runs a full catalog audit for a given store.
   *
   * HOW IT WORKS:
   * 1. Looks up (or creates) the store record in our local database.
   * 2. Fetches products from the Shopify GraphQL Admin API in batches of 50
   *    using cursor-based pagination (up to 5 batches = 250 products per run).
   * 3. Evaluates each product against 8 defect rules:
   *    - Draft status (product not visible to customers)
   *    - Missing featured image
   *    - Missing image alt text (SEO impact)
   *    - Empty or thin description (< 30 chars)
   *    - No tags assigned
   *    - Variant price set to $0.00
   *    - Inventory quantity <= 2
   *    - Duplicate SKU codes across variants
   * 4. Calculates a normalized health score (0–100%) and persists the result
   *    to the Scan and Issue tables in the database.
   */
  static async runFullStoreAudit(admin: any, shop: string, scanType: "MANUAL" | "SCHEDULED" | "WEBHOOK" = "MANUAL") {
    // 1. Get or create the local store record
    const store = await StoreRepository.getOrCreateStore(shop);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: Fetch products via GraphQL cursor pagination
    //
    // SCALABILITY DESIGN:
    //   - Each GraphQL request fetches 50 products (Shopify's safe per-request limit).
    //   - `maxBatches = 5` means we fetch up to 5 × 50 = 250 products per scan run.
    //   - `after: $cursor` tells Shopify where the previous batch ended so we
    //     pick up exactly where we left off — no duplicates, no gaps.
    //
    // WHAT HAPPENS BY PRODUCT COUNT:
    //   ≤ 50 products  → 1 API call  (1 batch, loop exits because hasNextPage = false)
    //   51–100         → 2 API calls
    //   101–150        → 3 API calls
    //   151–200        → 4 API calls
    //   201–250        → 5 API calls  ← current cap for manual scans
    //   251–50,000+    → Still only 5 batches for a synchronous manual scan.
    //                    Remaining products are handled by webhook-driven delta
    //                    scans: Shopify calls our /webhooks/products_update
    //                    endpoint whenever a merchant edits a product, so only
    //                    that single changed product is re-evaluated in real time.
    //
    // TO INCREASE COVERAGE: raise maxBatches (e.g. 20 = 1,000 products) or move
    // large scans to a background job queue (e.g. BullMQ / Shopify Flow).
    // ──────────────────────────────────────────────────────────────────────────
    let hasNextPage = true;
    let endCursor: string | null = null;
    let products: any[] = [];
    let fetchCount = 0;
    const maxBatches = 5; // 5 batches × 50 products = 250 products per scan run

    while (hasNextPage && fetchCount < maxBatches) {
      fetchCount++;
      const response: any = await admin.graphql(
        `
        #graphql
        query getProductsForAudit($after: String) {
          products(first: 50, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                description
                status
                tags
                featuredImage {
                  url
                  altText
                }
                images(first: 10) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      sku
                      price
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `,
        {
          variables: { after: endCursor },
        }
      );

      const json = await response.json();
      const pageData = json.data?.products;
      const fetchedEdges = pageData?.edges || [];
      products = [...products, ...fetchedEdges];

      hasNextPage = pageData?.pageInfo?.hasNextPage || false;
      endCursor = pageData?.pageInfo?.endCursor || null;
    }

    const issues: Array<{
      productId: string;
      productTitle: string;
      issueType: string;
      severity: string;
      message: string;
    }> = [];

    const seenSkus = new Set<string>();
    let totalPenalty = 0;

    // 3. 🔍 CORE AUDIT ENGINE: Run 8 strict rules on each product
    // -> Now properly translated to English for enterprise clarity.
    products.forEach(({ node }: any) => {
      const productId = node.id;
      const productTitle = node.title;

      // ----------------------------------------------------------------------
      // 🛑 RULE 1: DRAFT PRODUCT (Status is DRAFT)
      // ----------------------------------------------------------------------
      // Rule: Draft products are not visible to customers, wasting inventory space.
      if (node.status === "DRAFT") {
        totalPenalty += 10;
        issues.push({
          productId,
          productTitle,
          issueType: "DRAFT_PRODUCT",
          severity: "MEDIUM",
          message: "Product is in draft status and not visible to customers on your storefront.",
        });
      }

      // ----------------------------------------------------------------------
      // 🖼️ RULE 2: MISSING FEATURED IMAGE
      // ----------------------------------------------------------------------
      // Rule: Products without images do not convert and look unprofessional.
      if (!node.featuredImage) {
        totalPenalty += 35;
        issues.push({
          productId,
          productTitle,
          issueType: "MISSING_IMAGE",
          severity: "HIGH",
          message: "Main product image is missing. Shoppers are unlikely to purchase without product visuals.",
        });
      } else {
        // --------------------------------------------------------------------
        // 🔍 RULE 3: MISSING ALT TEXT ON IMAGES (Google SEO Penalty)
        // --------------------------------------------------------------------
        // Rule: Images without alt text fail to rank on Google Images and hurt accessibility.
        const imagesWithoutAlt = (node.images?.edges || []).filter(({ node: img }: any) => !img.altText || img.altText.trim() === "");
        if (imagesWithoutAlt.length > 0) {
          totalPenalty += 15;
          issues.push({
            productId,
            productTitle,
            issueType: "MISSING_ALT",
            severity: "MEDIUM",
            message: `${imagesWithoutAlt.length} product image(s) missing SEO Alt Text, hurting Google search ranking.`,
          });
        }
      }

      // ----------------------------------------------------------------------
      // 📝 RULE 4: MISSING OR TOO SHORT DESCRIPTION
      // ----------------------------------------------------------------------
      // Rule: Empty or thin descriptions (< 30 characters) lead to cart abandonment.
      if (!node.description || node.description.trim().length < 30) {
        totalPenalty += 25;
        issues.push({
          productId,
          productTitle,
          issueType: "MISSING_DESCRIPTION",
          severity: "HIGH",
          message: "Product description is empty or too short. Detailed descriptions increase conversions.",
        });
      }

      // ----------------------------------------------------------------------
      // 🏷️ RULE 5: NO TAGS ASSIGNED
      // ----------------------------------------------------------------------
      // Rule: Untagged products break store filtering and automated collections.
      if (!node.tags || node.tags.length === 0) {
        totalPenalty += 10;
        issues.push({
          productId,
          productTitle,
          issueType: "NO_TAGS",
          severity: "LOW",
          message: "Product has no tags assigned. This can break storefront collections and filtering.",
        });
      }

      // ----------------------------------------------------------------------
      // 📦 VARIANT LEVEL RULES (SKU, Price, Inventory Stock)
      // ----------------------------------------------------------------------
      const variants = node.variants?.edges || [];
      variants.forEach(({ node: v }: any) => {
        // --------------------------------------------------------------------
        // 💰 RULE 6: PRICE ZERO CHECK ($0.00 / ₹0.00 Price Error)
        // --------------------------------------------------------------------
        // Rule: Zero-priced items can be ordered for free by accident, causing revenue loss.
        const priceNum = parseFloat(v.price || "0");
        if (priceNum === 0) {
          totalPenalty += 30;
          issues.push({
            productId,
            productTitle,
            issueType: "PRICE_ZERO",
            severity: "HIGH",
            message: "Variant price is set to $0.00. Customers may check out this item for free accidentally.",
          });
        }

        // --------------------------------------------------------------------
        // ⚠️ RULE 7: LOW STOCK WARNING (Inventory <= 2)
        // --------------------------------------------------------------------
        // Rule: Alert merchant before a product completely runs out of stock.
        if (v.inventoryQuantity !== undefined && v.inventoryQuantity <= 2) {
          totalPenalty += 15;
          issues.push({
            productId,
            productTitle,
            issueType: "LOW_STOCK",
            severity: "MEDIUM",
            message: `Low Stock Alert: Only ${v.inventoryQuantity} units remaining for this variant.`,
          });
        }

        // --------------------------------------------------------------------
        // 🏷️ RULE 8: DUPLICATE SKU CODE CHECK
        // --------------------------------------------------------------------
        // Rule: Duplicate SKUs cause warehouse shipping errors.
        if (v.sku && v.sku.trim() !== "") {
          if (seenSkus.has(v.sku)) {
            totalPenalty += 20;
            issues.push({
              productId,
              productTitle,
              issueType: "DUPLICATE_SKU",
              severity: "HIGH",
              message: `Duplicate SKU code '${v.sku}' detected. This can cause warehouse fulfillment errors.`,
            });
          } else {
            seenSkus.add(v.sku);
          }
        }
      });
    });

    // 4. 🧮 HEALTH SCORE FORMULA: Normalized 0 to 100 Health Score
    const totalProducts = products.length;
    const maxScore = 100;
    const calculatedScore = totalProducts === 0 ? 100 : Math.max(0, Math.round(maxScore - (totalPenalty / (totalProducts * 2.5 || 1))));

    // 5. 💾 PERSISTENCE: Save Scan & Issue Metadata to Local Database
    return ScanRepository.saveScanResult({
      storeId: store.id,
      healthScore: calculatedScore,
      totalProductsChecked: totalProducts,
      totalIssuesFound: issues.length,
      scanType,
      issues,
    });
  }
}
