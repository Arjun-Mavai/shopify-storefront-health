import { StoreRepository } from "../repositories/store.server";
import { ScanRepository } from "../repositories/scan.server";
import { ISSUE_CATEGORIES, ISSUE_DEF } from "../lib/issue-types";

export class HealthService {
  static async runFullStoreAudit(admin: any, shop: string, scanType: "MANUAL" | "SCHEDULED" | "WEBHOOK" = "MANUAL") {
    const store = await StoreRepository.getOrCreateStore(shop);

    let hasNextPage = true;
    let endCursor: string | null = null;
    let products: any[] = [];
    let fetchCount = 0;
    const maxBatches = 10; // 10 batches × 50 products = 500 products per scan run

    while (hasNextPage && fetchCount < maxBatches) {
      fetchCount++;
      const response: any = await admin.graphql(
        `#graphql
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
                handle
                description
                vendor
                productType
                status
                tags
                seo {
                  title
                  description
                }
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 50) {
                  edges {
                    node {
                      id
                      sku
                      price
                      compareAtPrice
                      inventoryQuantity
                      image {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        { variables: { after: endCursor } }
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

    const seenSkus = new Map<string, string[]>(); // sku -> productIds
    const seenHandles = new Map<string, string[]>(); // handle -> productIds
    
    // Pass 1: Collect Skus and Handles for duplication checks
    products.forEach(({ node }: any) => {
      const productId = node.id;
      if (node.handle) {
        const pIds = seenHandles.get(node.handle) || [];
        pIds.push(productId);
        seenHandles.set(node.handle, pIds);
      }
      
      const variants = node.variants?.edges || [];
      variants.forEach(({ node: v }: any) => {
        if (v.sku && v.sku.trim() !== "") {
          const pIds = seenSkus.get(v.sku) || [];
          pIds.push(productId);
          seenSkus.set(v.sku, pIds);
        }
      });
    });

    const categoryIssuesCount = {
      [ISSUE_CATEGORIES.IMAGES]: 0,
      [ISSUE_CATEGORIES.PRODUCT_CONTENT]: 0,
      [ISSUE_CATEGORIES.SEO]: 0,
      [ISSUE_CATEGORIES.CATALOG]: 0,
      [ISSUE_CATEGORIES.CONVERSION]: 0,
    };

    const addIssue = (productId: string, productTitle: string, def: any) => {
      issues.push({
        productId,
        productTitle,
        issueType: def.type,
        severity: def.severity,
        message: def.message,
      });
      categoryIssuesCount[def.category as keyof typeof categoryIssuesCount]++;
    };

    let globalAspectRatios = new Set<string>();

    products.forEach(({ node }: any) => {
      const productId = node.id;
      const productTitle = node.title;

      // ==========================================
      // 1. IMAGES
      // ==========================================
      const images = node.images?.edges || [];
      if (images.length === 0) {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_IMAGES);
      } else {
        let hasLowRes = false;
        images.forEach(({ node: img }: any) => {
          if (img.width && img.height) {
            if (img.width < 800 || img.height < 800) {
              hasLowRes = true;
            }
            // Aspect ratio
            const ratio = (img.width / img.height).toFixed(2);
            globalAspectRatios.add(ratio);
          }
        });
        if (hasLowRes) {
          addIssue(productId, productTitle, ISSUE_DEF.LOW_RESOLUTION);
        }
      }

      // ==========================================
      // 2. PRODUCT CONTENT
      // ==========================================
      if (!node.description || node.description.trim() === "") {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_DESCRIPTION);
      } else {
        const descLength = node.description.length;
        const wordCount = node.description.split(/\s+/).length;
        if (descLength < 100 || wordCount < 20) {
          addIssue(productId, productTitle, ISSUE_DEF.THIN_DESCRIPTION);
        }
      }

      if (!node.vendor || node.vendor.trim() === "") {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_VENDOR);
      }
      if (!node.productType || node.productType.trim() === "") {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_PRODUCT_TYPE);
      }
      if (!node.tags || node.tags.length === 0) {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_TAGS);
      }

      // ==========================================
      // 3. SEO
      // ==========================================
      if (!node.seo?.title || node.seo.title.trim() === "") {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_SEO_TITLE);
      } else {
        if (node.seo.title.length > 70) {
          addIssue(productId, productTitle, ISSUE_DEF.LONG_TITLE);
        }
        if (node.seo.title.length < 20) {
          addIssue(productId, productTitle, ISSUE_DEF.SHORT_TITLE);
        }
      }

      if (!node.seo?.description || node.seo.description.trim() === "") {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_META_DESCRIPTION);
      }

      const imagesWithoutAlt = images.filter(({ node: img }: any) => !img.altText || img.altText.trim() === "");
      if (imagesWithoutAlt.length > 0) {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_ALT_TEXT);
      }

      // ==========================================
      // 4. CATALOG
      // ==========================================
      if (node.status === "DRAFT") {
        addIssue(productId, productTitle, ISSUE_DEF.DRAFT_PRODUCT);
      } else if (node.status === "ARCHIVED") {
        addIssue(productId, productTitle, ISSUE_DEF.ARCHIVED_PRODUCT);
      }

      const variants = node.variants?.edges || [];
      let totalInventory = 0;
      let hasMissingVariantImage = false;
      let hasZeroPrice = false;
      let hasBadComparePrice = false;

      variants.forEach(({ node: v }: any) => {
        totalInventory += (v.inventoryQuantity || 0);

        if (!v.image) {
          hasMissingVariantImage = true;
        }

        const priceNum = parseFloat(v.price || "0");
        if (priceNum === 0) {
          hasZeroPrice = true;
        }

        if (v.compareAtPrice) {
          const comparePriceNum = parseFloat(v.compareAtPrice);
          if (comparePriceNum <= priceNum) {
            hasBadComparePrice = true;
          }
        } else {
           // If they have no compare at price, it could be a warning, but let's be lenient or add it if requested
           // The instructions said "Ya compareAtPrice empty. Merchant ko sirf warning."
           hasBadComparePrice = true; 
        }

        if (v.sku && seenSkus.get(v.sku)!.length > 1) {
          // Add issue only once per product for this SKU
          // to avoid multiple duplicates if variants share the same sku in the same product
        }
      });

      if (totalInventory <= 0) {
        addIssue(productId, productTitle, ISSUE_DEF.OUT_OF_STOCK);
      }

      // Check Duplicates from Map
      if (node.handle && seenHandles.get(node.handle)!.length > 1) {
        addIssue(productId, productTitle, ISSUE_DEF.DUPLICATE_HANDLE);
      }
      
      const hasDupSku = variants.some(({node: v}: any) => v.sku && seenSkus.get(v.sku)!.length > 1);
      if (hasDupSku) {
        addIssue(productId, productTitle, ISSUE_DEF.DUPLICATE_SKU);
      }

      // ==========================================
      // 5. CONVERSION
      // ==========================================
      if (hasZeroPrice) {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_PRICE);
      }
      if (hasBadComparePrice) {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_COMPARE_AT_PRICE);
      }
      if (hasMissingVariantImage) {
        addIssue(productId, productTitle, ISSUE_DEF.MISSING_VARIANT_IMAGES);
      }
    });

    // Check Inconsistent Aspect Ratio globally across the catalog
    if (globalAspectRatios.size > 2) {
      // If there are more than 2 different aspect ratios, flag all products? 
      // User says: "Your catalog contains inconsistent image ratios." This is a catalog-wide issue.
      // We will just attach it to the first product to show it, or maybe all products that have images?
      // Let's attach it to products that have images.
      products.forEach(({ node }: any) => {
        if (node.images?.edges?.length > 0) {
           // This might produce too many issues. Better to only flag it once or maybe per product.
           // Actually user says: "Suppose store me 1:1 4:5 16:9 mix hai... Show 'Your catalog contains inconsistent image ratios.'"
           // For now, let's just add it to all products that have images as a warning.
           addIssue(node.id, node.title, ISSUE_DEF.INCONSISTENT_ASPECT_RATIO);
        }
      });
    }

    const totalProducts = products.length;
    const calcCategoryScore = (issuesCount: number) => {
      if (totalProducts === 0) return 20;
      return Math.max(0, Math.round(20 - ((issuesCount / totalProducts) * 20)));
    };

    const s_images = calcCategoryScore(categoryIssuesCount[ISSUE_CATEGORIES.IMAGES]);
    const s_content = calcCategoryScore(categoryIssuesCount[ISSUE_CATEGORIES.PRODUCT_CONTENT]);
    const s_seo = calcCategoryScore(categoryIssuesCount[ISSUE_CATEGORIES.SEO]);
    const s_catalog = calcCategoryScore(categoryIssuesCount[ISSUE_CATEGORIES.CATALOG]);
    const s_conversion = calcCategoryScore(categoryIssuesCount[ISSUE_CATEGORIES.CONVERSION]);

    const calculatedScore = totalProducts === 0 ? 100 : (s_images + s_content + s_seo + s_catalog + s_conversion);

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
