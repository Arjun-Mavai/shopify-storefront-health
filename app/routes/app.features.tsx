import { Page, Layout, Text, Card, BlockStack, InlineStack, Box, Badge, Grid, Icon } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { ImageIcon, SearchIcon, TextIcon, ProductIcon, CartIcon, LinkIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function FeaturesPage() {
  const oldFeatureCards = [
    {
      title: "Missing Images & Alt Tags",
      badge: "SEO Impact",
      badgeTone: "warning" as const,
      image: "/images/missing-images-altTags.png",
      description:
        "Products without images or ALT tags drop out of Google Search & Shopping results. We flag unindexed media instantly so your store stays visible and indexed.",
    },
    {
      title: "Thin & Missing Descriptions",
      badge: "Conversion Loss",
      badgeTone: "critical" as const,
      image: "/images/missing-descriptions.png",
      description:
        "Shoppers abandon carts when product descriptions lack detail. Shop Health catches empty or short descriptions that cause buyers to lose trust.",
    },
    {
      title: "Duplicate SKUs & Draft Products",
      badge: "Fulfillment Errors",
      badgeTone: "info" as const,
      image: "/images/duplicate-skus.png",
      description:
        "Duplicate SKU codes cause warehouse shipping mistakes. Draft products hide live inventory from customers who are ready to buy.",
    },
    {
      title: "Zero-Price & Low Stock Leaks",
      badge: "Revenue Risk",
      badgeTone: "critical" as const,
      image: "/images/zero-price.png",
      description:
        "A $0.00 price error can trigger accidental free checkouts. We catch zero-priced variants and low inventory before revenue is lost.",
    },
  ];

  const newFeatureCards = [
    {
      title: "Image & Media Health",
      badge: "Visual Impact",
      badgeTone: "info" as const,
      icon: ImageIcon,
      description:
        "Detect missing product images, low-resolution media, and inconsistent aspect ratios. Ensure your catalog looks premium and shoppers can clearly see what they are buying.",
    },
    {
      title: "Product Content Quality",
      badge: "Trust & Details",
      badgeTone: "success" as const,
      icon: TextIcon,
      description:
        "Find thin or missing descriptions, missing vendors, product types, and tags. Detailed content builds buyer trust and improves internal store search and filtering.",
    },
    {
      title: "Technical SEO Checks",
      badge: "Organic Traffic",
      badgeTone: "warning" as const,
      icon: SearchIcon,
      description:
        "Automatically flag missing SEO titles, meta descriptions, and image ALT text. Fix these quickly to prevent products from dropping out of Google Search & Shopping results.",
    },
    {
      title: "Catalog Integrity",
      badge: "Fulfillment & Organization",
      badgeTone: "critical" as const,
      icon: ProductIcon,
      description:
        "Identify duplicate SKU codes, duplicate handles, draft/archived products taking up space, and items that are completely out of stock to avoid fulfillment disasters.",
    },
    {
      title: "Conversion Blockers",
      badge: "Revenue Leakage",
      badgeTone: "critical" as const,
      icon: CartIcon,
      description:
        "Catch variants with zero-pricing ($0), missing prices, or missing variant images. Prevent accidental free checkouts and ensure every variant is ready to sell.",
    },
  ];

  return (
    <Page
      fullWidth
      backAction={{ content: "Dashboard", url: "/app" }}
      title="Platform Capabilities"
      subtitle="Discover how Shop Health protects your store and streamlines your workflow."
    >
      <BlockStack gap="800">
        
        {/* Highlight Feature: 1-Click Fix */}
        <Box paddingBlockEnd="400">
          <Card>
            <BlockStack gap="400">
              <Box borderRadius="200" overflowX="hidden" overflowY="hidden" background="bg-surface-secondary">
                <img 
                   src="/images/fix-the-issue.png" 
                   alt="Fix the Issue Graphic" 
                   style={{ 
                     width: "100%",
                     height: "auto",
                     display: "block",
                     borderRadius: "8px",
                     border: "1px solid #e1e3e5"
                   }}
                />
              </Box>
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingLg" fontWeight="bold">Find the Issue. Fix It Instantly.</Text>
                <Badge tone="success" size="large">1-Click Fix</Badge>
              </InlineStack>
              <Text as="p" variant="bodyLg" tone="subdued">
                Every detected issue comes with a direct "Fix in Shopify Admin" link. Don't waste time searching for the broken product — click the link and fix the problem immediately.
              </Text>
            </BlockStack>
          </Card>
        </Box>

        <BlockStack gap="400">
          <Text as="h2" variant="headingXl" fontWeight="bold">Key Audit Capabilities</Text>
          <Grid>
            {oldFeatureCards.map((card) => (
              <Grid.Cell key={card.title} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                <Card>
                  <BlockStack gap="400">
                    <Box borderRadius="200" overflowX="hidden" overflowY="hidden" background="bg-surface-secondary">
                      <img
                        src={card.image}
                        alt={card.title}
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                          borderRadius: "8px",
                          border: "1px solid #e1e3e5"
                        }}
                      />
                    </Box>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingLg" fontWeight="bold">
                        {card.title}
                      </Text>
                      <Badge tone={card.badgeTone} size="large">{card.badge}</Badge>
                    </InlineStack>
                    <Text as="p" variant="bodyLg" tone="subdued">
                      {card.description}
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            ))}
          </Grid>
        </BlockStack>

        <Box paddingBlockStart="600">
          <BlockStack gap="400">
            <Text as="h2" variant="headingXl" fontWeight="bold">5 Core Health Pillars</Text>
            <Text as="p" variant="bodyMd" tone="subdued">Shop Health runs 21 deterministic rule checks across these pillars to ensure your store is perfectly optimized.</Text>
            <Grid>
              {newFeatureCards.map((card) => (
                <Grid.Cell key={card.title} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 4 }}>
                  <Card>
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Icon source={card.icon} tone="base" />
                          <Text as="h3" variant="headingLg" fontWeight="bold">
                            {card.title}
                          </Text>
                        </InlineStack>
                        <Badge tone={card.badgeTone} size="large">{card.badge}</Badge>
                      </InlineStack>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {card.description}
                      </Text>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
              ))}
            </Grid>
          </BlockStack>
        </Box>
      </BlockStack>
    </Page>
  );
}
