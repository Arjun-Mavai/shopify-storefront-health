import { Page, Layout, Text, Card, BlockStack, InlineStack, Box, Badge, Grid, Icon } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { ImageIcon, SearchIcon, TextIcon, ProductIcon, CartIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function FeaturesPage() {
  const featureCards = [
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
      subtitle="Shop Health runs 21 deterministic rule checks across these 5 core pillars to ensure your store is perfectly optimized."
    >
      <BlockStack gap="600">
        <Grid>
          {featureCards.map((card) => (
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
    </Page>
  );
}
