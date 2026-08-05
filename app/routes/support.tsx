import { Page, Layout, Text, BlockStack, Card } from "@shopify/polaris";

export default function SupportPage() {
  return (
    <Page title="Shop Health Support" fullWidth>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Need Help?</Text>
              <Text as="p" variant="bodyMd">
                If you are experiencing issues with the Shop Health app, need help understanding your catalog audit results, or want to report a bug, we are here to help!
              </Text>
              
              <Text as="h3" variant="headingMd">Contact Email</Text>
              <Text as="p" variant="bodyMd">
                Reach out to us anytime at: <strong>support@shophealth.example.com</strong>
              </Text>
              <Text as="p" variant="bodyMd">
                We aim to respond to all inquiries within 24 hours on business days.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
