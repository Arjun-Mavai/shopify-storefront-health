import { Page, Layout, Text, BlockStack } from "@shopify/polaris";

export default function TermsOfService() {
  return (
    <Page title="Terms of Service for Shop Health" fullWidth>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyLg">
              Last Updated: August 2026
            </Text>

            <Text as="h2" variant="headingLg">1. Acceptance of Terms</Text>
            <Text as="p" variant="bodyMd">
              By installing and using the Shop Health app ("the App"), you agree to these Terms of Service. If you do not agree with any part of these terms, you must uninstall the App immediately.
            </Text>

            <Text as="h2" variant="headingLg">2. Description of Service</Text>
            <Text as="p" variant="bodyMd">
              Shop Health provides automated catalog auditing, defect detection, and health monitoring for Shopify stores. The service is provided "as is" and is subject to your chosen subscription plan's limitations (e.g., product scan limits).
            </Text>

            <Text as="h2" variant="headingLg">3. Subscription and Billing</Text>
            <Text as="p" variant="bodyMd">
              The App offers both free and premium subscription tiers. All premium billing is processed exclusively through Shopify's official Billing API. Cancellations and plan changes must be managed through your Shopify Admin interface. We do not issue refunds for partial months of service.
            </Text>

            <Text as="h2" variant="headingLg">4. Limitation of Liability</Text>
            <Text as="p" variant="bodyMd">
              Shop Health is an analytical tool designed to help you identify potential issues. We do not guarantee an increase in sales or search engine rankings. We are not liable for any direct, indirect, or consequential damages resulting from the use or inability to use the App.
            </Text>

            <Text as="h2" variant="headingLg">5. Changes to Terms</Text>
            <Text as="p" variant="bodyMd">
              We reserve the right to modify these terms at any time. Continued use of the App following any changes constitutes your acceptance of the new terms.
            </Text>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
