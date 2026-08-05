// ============================================================================
// 🚀 FEATURES & CAPABILITIES ROUTE (`/app/features`)
// ============================================================================
// Showcases the 4 key audit capabilities with their respective uploaded images.
// ============================================================================

import { Page, Layout, Text, Card, BlockStack, InlineStack, Box, Badge, Grid } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function FeaturesPage() {
  const featureCards = [
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

  return (
    <Page
      fullWidth
      backAction={{ content: "Dashboard", url: "/app" }}
      title="How Shop Health Protects You"
      subtitle="The 4 critical eCommerce issues our automated audit engine prevents"
    >
      <BlockStack gap="600">
        <Grid>
          {featureCards.map((card) => (
            <Grid.Cell key={card.title} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Card>
                <BlockStack gap="400">
                  <Box borderRadius="200">
                    <img
                      src={card.image}
                      alt={card.title}
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "350px",
                        objectFit: "contain",
                        borderRadius: "8px",
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
    </Page>
  );
}
