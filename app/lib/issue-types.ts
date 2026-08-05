export const ISSUE_CATEGORIES = {
  IMAGES: "Images",
  PRODUCT_CONTENT: "Product Content",
  SEO: "SEO",
  CATALOG: "Catalog",
  CONVERSION: "Conversion",
} as const;

export const ISSUE_DEF = {
  // Images
  MISSING_IMAGES: { type: "MISSING_IMAGES", category: ISSUE_CATEGORIES.IMAGES, severity: "HIGH", message: "Customers cannot see what they're buying. Upload at least one product image.", weight: 1 },
  LOW_RESOLUTION: { type: "LOW_RESOLUTION", category: ISSUE_CATEGORIES.IMAGES, severity: "MEDIUM", message: "Image resolution is low (< 800px). Recommended 1000x1000 or higher.", weight: 1 },
  INCONSISTENT_ASPECT_RATIO: { type: "INCONSISTENT_ASPECT_RATIO", category: ISSUE_CATEGORIES.IMAGES, severity: "LOW", message: "Your catalog contains inconsistent image ratios. Use one consistent ratio across products.", weight: 1 },

  // Product Content
  MISSING_DESCRIPTION: { type: "MISSING_DESCRIPTION", category: ISSUE_CATEGORIES.PRODUCT_CONTENT, severity: "HIGH", message: "Missing description. Customers don't understand the product. Lower trust. Lower conversion.", weight: 1 },
  THIN_DESCRIPTION: { type: "THIN_DESCRIPTION", category: ISSUE_CATEGORIES.PRODUCT_CONTENT, severity: "MEDIUM", message: "Very short description. Less than 100 characters or 20 words.", weight: 1 },
  MISSING_VENDOR: { type: "MISSING_VENDOR", category: ISSUE_CATEGORIES.PRODUCT_CONTENT, severity: "LOW", message: "Vendor not assigned.", weight: 1 },
  MISSING_PRODUCT_TYPE: { type: "MISSING_PRODUCT_TYPE", category: ISSUE_CATEGORIES.PRODUCT_CONTENT, severity: "LOW", message: "Product type missing.", weight: 1 },
  MISSING_TAGS: { type: "MISSING_TAGS", category: ISSUE_CATEGORIES.PRODUCT_CONTENT, severity: "LOW", message: "No tags added.", weight: 1 },

  // SEO
  MISSING_SEO_TITLE: { type: "MISSING_SEO_TITLE", category: ISSUE_CATEGORIES.SEO, severity: "HIGH", message: "SEO Title is empty.", weight: 1 },
  MISSING_META_DESCRIPTION: { type: "MISSING_META_DESCRIPTION", category: ISSUE_CATEGORIES.SEO, severity: "HIGH", message: "SEO Description is empty. Search engines may display poor snippets.", weight: 1 },
  MISSING_ALT_TEXT: { type: "MISSING_ALT_TEXT", category: ISSUE_CATEGORIES.SEO, severity: "MEDIUM", message: "Missing alt text on images.", weight: 1 },
  LONG_TITLE: { type: "LONG_TITLE", category: ISSUE_CATEGORIES.SEO, severity: "LOW", message: "Title is too long (> 70 chars). May be truncated in search.", weight: 1 },
  SHORT_TITLE: { type: "SHORT_TITLE", category: ISSUE_CATEGORIES.SEO, severity: "LOW", message: "Title is too short (< 20 chars). Not descriptive enough.", weight: 1 },

  // Catalog
  DUPLICATE_SKU: { type: "DUPLICATE_SKU", category: ISSUE_CATEGORIES.CATALOG, severity: "HIGH", message: "Duplicate SKU found. This can cause fulfillment errors.", weight: 1 },
  DUPLICATE_HANDLE: { type: "DUPLICATE_HANDLE", category: ISSUE_CATEGORIES.CATALOG, severity: "HIGH", message: "Duplicate URL handle found.", weight: 1 },
  DRAFT_PRODUCT: { type: "DRAFT_PRODUCT", category: ISSUE_CATEGORIES.CATALOG, severity: "MEDIUM", message: "Product is in draft status.", weight: 1 },
  ARCHIVED_PRODUCT: { type: "ARCHIVED_PRODUCT", category: ISSUE_CATEGORIES.CATALOG, severity: "MEDIUM", message: "Product is archived.", weight: 1 },
  OUT_OF_STOCK: { type: "OUT_OF_STOCK", category: ISSUE_CATEGORIES.CATALOG, severity: "HIGH", message: "Product is completely out of stock.", weight: 1 },

  // Conversion
  MISSING_PRICE: { type: "MISSING_PRICE", category: ISSUE_CATEGORIES.CONVERSION, severity: "HIGH", message: "Product has no price ($0).", weight: 1 },
  MISSING_COMPARE_AT_PRICE: { type: "MISSING_COMPARE_AT_PRICE", category: ISSUE_CATEGORIES.CONVERSION, severity: "LOW", message: "Missing or invalid compare-at price.", weight: 1 },
  MISSING_VARIANT_IMAGES: { type: "MISSING_VARIANT_IMAGES", category: ISSUE_CATEGORIES.CONVERSION, severity: "MEDIUM", message: "Some variants are missing images.", weight: 1 },
};
