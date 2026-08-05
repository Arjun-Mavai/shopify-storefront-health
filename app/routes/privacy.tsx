import { Page, Layout, Text, BlockStack } from "@shopify/polaris";

export default function PrivacyPolicy() {
  return (
    <Page title="Privacy Policy for Shop Health" fullWidth>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyLg">
              Last Updated: August 2026
            </Text>

            <Text as="h2" variant="headingLg">1. Information We Collect</Text>
            <Text as="p" variant="bodyMd">
              When you install the Shop Health App, we are automatically able to access certain types of information from your Shopify account:
              Store Information (Store name, email, currency), and Product Data (Titles, descriptions, images, SKUs, inventory levels). We only read this data to perform catalog audits. We do not modify your store data without explicit permission.
            </Text>

            <Text as="h2" variant="headingLg">2. How We Use Your Information</Text>
            <Text as="p" variant="bodyMd">
              We use the collected data strictly to provide the core functionality of the app: running health checks on your Shopify products, detecting errors, and sending you email notifications regarding your store's catalog health.
            </Text>

            <Text as="h2" variant="headingLg">3. Data Sharing</Text>
            <Text as="p" variant="bodyMd">
              We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. Your data is stored securely and is only accessible to our internal systems for the purpose of generating audit reports.
            </Text>

            <Text as="h2" variant="headingLg">4. Data Retention</Text>
            <Text as="p" variant="bodyMd">
              We retain your store's audit data as long as the app is installed. Upon uninstallation, your data will be permanently deleted from our servers within 48 hours in compliance with Shopify's data privacy requirements.
            </Text>

            <Text as="h2" variant="headingLg">5. Contact Us</Text>
            <Text as="p" variant="bodyMd">
              If you have any questions about this Privacy Policy, please contact us at support@shophealth.example.com.
            </Text>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
