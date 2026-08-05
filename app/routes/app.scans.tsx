// ============================================================================
// 📜 SCAN HISTORY ROUTE (`/app/scans`)
// ============================================================================
// Display historical store audit runs and overall score progression.
// ============================================================================

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Box,
  Badge,
  InlineStack,
  ResourceList,
  ResourceItem,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { StoreRepository } from "../repositories/store.server";
import { ScanRepository } from "../repositories/scan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await StoreRepository.getOrCreateStore(session.shop);
  const scans = await ScanRepository.getScanHistory(store.id, 20);

  return json({
    scans,
  });
};

export default function ScansHistoryPage() {
  const { scans } = useLoaderData<typeof loader>();

  return (
    <Page
      fullWidth
      backAction={{ content: "Dashboard", url: "/app" }}
      title="Scan History 📜"
      subtitle="Track historical store health scans and score trends"
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <Box padding="400">
                <Text as="h2" variant="headingMd">
                  Audit Execution History ({scans.length} Scans)
                </Text>
              </Box>

              <Divider />

              <ResourceList
                resourceName={{ singular: "scan", plural: "scans" }}
                items={scans}
                renderItem={(scan) => {
                  const dateStr = new Date(scan.scannedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <ResourceItem id={scan.id} onClick={() => {}}>
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="h3" variant="headingSm" fontWeight="bold">
                              Health Score: {scan.healthScore}%
                            </Text>
                            <Badge tone={scan.healthScore >= 80 ? "success" : scan.healthScore >= 50 ? "warning" : "critical"}>
                              {scan.healthScore >= 80 ? "HEALTHY" : scan.healthScore >= 50 ? "MODERATE" : "CRITICAL"}
                            </Badge>
                            <Badge tone="info">{scan.scanType}</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Scanned {scan.totalProductsChecked} products • Found {scan.totalIssuesFound} defects
                          </Text>
                        </BlockStack>

                        <Text as="p" variant="bodySm" tone="subdued">
                          {dateStr}
                        </Text>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
