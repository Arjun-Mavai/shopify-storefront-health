// ============================================================================
// 📊 SHOP HEALTH DASHBOARD — Main Home Route (`/app`)
// ============================================================================
// Displays overall Health Score, store plan status, recent defects, and
// provides quick navigation to all features. Runs an auto-audit on first load.
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  Badge,
  InlineStack,
  Banner,
  ProgressBar,
  Divider,
  Icon,
  Grid,
  Modal,
  List,
} from "@shopify/polaris";
import { AlertCircleIcon, CheckCircleIcon, RefreshIcon, OrderIcon, ProductIcon, InfoIcon } from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { StoreRepository } from "../repositories/store.server";
import { ScanRepository } from "../repositories/scan.server";
import { HealthService } from "../services/health.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // 1. Sync official store name, email, and currency via Shopify GraphQL Admin API
  const store = await StoreRepository.syncStoreInfoFromShopify(admin, session.shop);

  // 2. Run an initial auto audit if no scan exists yet (first install)
  let latestScan = await ScanRepository.getLatestScan(store.id);
  if (!latestScan) {
    latestScan = await HealthService.runFullStoreAudit(admin, session.shop, "MANUAL");
  }

  // 3. Pull supporting metrics: total scan count + recent activity log
  const totalScans = (await ScanRepository.getScanHistory(store.id, 100)).length;
  const recentActivities = await prisma.activity.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return json({
    shop: session.shop,
    store,
    latestScan,
    totalScans,
    recentActivities,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "trigger_scan") {
    const scan = await HealthService.runFullStoreAudit(admin, session.shop, "MANUAL");
    return json({ success: true, scan });
  }

  return json({ success: false });
};

// Helper: returns the semantic color tone for a given 0–100 health score
function getScoreTone(score: number): "success" | "warning" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "critical";
}

// Helper: returns a human-readable label for a health score
function getScoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

// Helper: returns the Polaris ProgressBar tone
function getProgressTone(score: number): "success" | "highlight" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "highlight";
  return "critical";
}

// Helper: returns the plan badge tone
function getPlanTone(plan: string): "success" | "info" | "new" {
  if (plan === "ENTERPRISE") return "success";
  if (plan === "PRO") return "info";
  return "new";
}

export default function Dashboard() {
  const { shop, store, latestScan, totalScans, recentActivities } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const toggleRulesModal = useCallback(() => setIsRulesModalOpen((open) => !open), []);

  const isScanning = fetcher.state !== "idle";
  const healthScore = latestScan?.healthScore ?? 100;
  const plan = store.subscription?.plan ?? "FREE";
  const scansUsed = store.subscription?.scansUsedThisMonth ?? 0;
  const scanLimit = store.subscription?.monthlyScanLimit ?? 10;
  const atLimit = scansUsed >= scanLimit;

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Store Health Audit Complete! ✅");
    }
  }, [fetcher.data, shopify]);

  const handleScanNow = () => {
    fetcher.submit({ intent: "trigger_scan" }, { method: "POST" });
  };

  return (
    <Page fullWidth>
      <TitleBar title="Dashboard">
        <button onClick={handleScanNow} disabled={isScanning || atLimit}>
          {isScanning ? "Scanning…" : "Run Audit Now"}
        </button>
      </TitleBar>

      <BlockStack gap="600">
        
        {/* Rules Information Modal */}
        <Modal
          open={isRulesModalOpen}
          onClose={toggleRulesModal}
          title="The 8 Critical eCommerce Health Rules"
          primaryAction={{
            content: "Close",
            onAction: toggleRulesModal,
          }}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Shop Health evaluates every product in your store against these 8 critical checkpoints to ensure your catalog is fully optimized for sales and search engines:
              </Text>
              <List type="bullet">
                <List.Item><strong>Draft Products:</strong> Identifies products stuck in draft status that are hidden from buyers.</List.Item>
                <List.Item><strong>Missing Images:</strong> Flags products with no main image, which severely drops conversion rates.</List.Item>
                <List.Item><strong>Missing SEO Alt Tags:</strong> Finds images missing Alt text, causing them to drop out of Google Image Search.</List.Item>
                <List.Item><strong>Thin Descriptions:</strong> Detects descriptions under 30 characters that fail to build buyer trust.</List.Item>
                <List.Item><strong>Missing Tags:</strong> Identifies untagged items that will break your storefront filters and automated collections.</List.Item>
                <List.Item><strong>Zero Price ($0.00):</strong> Flags active items priced at zero, preventing accidental free checkouts.</List.Item>
                <List.Item><strong>Low Stock (≤ 2):</strong> Alerts you when inventory runs dangerously low.</List.Item>
                <List.Item><strong>Duplicate SKUs:</strong> Detects identical SKU codes across variants that cause warehouse shipping disasters.</List.Item>
              </List>
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Scan limit warning */}
        {atLimit && (
          <Banner
            title="Monthly scan limit reached"
            tone="warning"
            action={{ content: "Upgrade Plan", url: "/app/billing" }}
          >
            <p>
              You have used all <strong>{scanLimit} free scans</strong> this month. Upgrade to
              Growth Pro to continue auditing your store with 1,000 scans per month.
            </p>
          </Banner>
        )}

        <Layout>
          {/* ─── MAIN HEALTH SCORE CARD ─────────────────────────── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingXl" fontWeight="bold">
                      Overall Catalog Health Score
                    </Text>
                    <InlineStack gap="100" blockAlign="center">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Calculated across 8 critical eCommerce health rules
                      </Text>
                      <div style={{ cursor: "pointer" }} onClick={toggleRulesModal}>
                        <Icon source={InfoIcon} tone="subdued" />
                      </div>
                    </InlineStack>
                  </BlockStack>
                  <BlockStack gap="100" inlineAlign="end">
                    <Text as="p" variant="heading3xl">
                      {healthScore}%
                    </Text>
                    <Badge tone={getScoreTone(healthScore)} size="large">
                      {getScoreLabel(healthScore).toUpperCase()}
                    </Badge>
                  </BlockStack>
                </InlineStack>

                <ProgressBar
                  progress={healthScore}
                  tone={getProgressTone(healthScore)}
                  size="large"
                />

                <Divider />

                {/* ── Metric Tiles ── */}
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <Box
                      background="bg-surface-active"
                      borderRadius="200"
                      padding="400"
                    >
                      <BlockStack gap="100" inlineAlign="center">
                        <Text as="p" variant="heading3xl">
                          {latestScan?.totalProductsChecked ?? 0}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Products Audited
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <Box
                      background={latestScan?.totalIssuesFound ? "bg-surface-critical-active" : "bg-surface-success"}
                      borderRadius="200"
                      padding="400"
                    >
                      <BlockStack gap="100" inlineAlign="center">
                        <Text
                          as="p"
                          variant="heading3xl"
                          tone={latestScan?.totalIssuesFound ? "critical" : "success"}
                        >
                          {latestScan?.totalIssuesFound ?? 0}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Active Defects
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <Box
                      background="bg-surface-active"
                      borderRadius="200"
                      padding="400"
                    >
                      <BlockStack gap="100" inlineAlign="center">
                        <Text as="p" variant="heading3xl">
                          {totalScans}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Total Audits Run
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                </Grid>

                <InlineStack gap="300">
                  <Button
                    variant="primary"
                    loading={isScanning}
                    onClick={handleScanNow}
                    icon={RefreshIcon}
                    disabled={atLimit}
                    size="large"
                  >
                    {isScanning ? "Scanning Store…" : "Run Full Audit"}
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate("/app/issues")}
                    icon={AlertCircleIcon}
                  >
                    {`View All Issues (${latestScan?.totalIssuesFound ?? 0})`}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ─── STORE STATUS SIDEBAR ───────────────────────────── */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Plan Card */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Store & Plan Status
                  </Text>
                  <Divider />

                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">Store</Text>
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        {store.name || shop.split(".")[0]}
                      </Text>
                    </InlineStack>

                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">Current Plan</Text>
                      <Badge tone={getPlanTone(plan)}>{plan}</Badge>
                    </InlineStack>

                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">Scans Used</Text>
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        {scansUsed} / {scanLimit}
                      </Text>
                    </InlineStack>

                    <ProgressBar
                      progress={Math.round((scansUsed / scanLimit) * 100)}
                      tone={scansUsed >= scanLimit ? "critical" : "primary"}
                    />

                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">Auto-Scan</Text>
                      <Badge tone={store.settings?.autoScanEnabled ? "success" : "new"}>
                        {store.settings?.autoScanEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </InlineStack>

                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">Frequency</Text>
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        {store.settings?.scanFrequency ?? "Weekly"}
                      </Text>
                    </InlineStack>
                  </BlockStack>

                  <Box paddingBlockStart="100">
                    <Button
                      variant={plan === "FREE" ? "primary" : "secondary"}
                      onClick={() => navigate("/app/billing")}
                      fullWidth
                    >
                      {plan === "FREE" ? "Upgrade to Pro →" : "Manage Billing"}
                    </Button>
                  </Box>
                </BlockStack>
              </Card>

              {/* Quick Links Card */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Quick Navigation
                  </Text>
                  <Divider />
                  <BlockStack gap="200">
                    <Button fullWidth onClick={() => navigate("/app/issues")} icon={AlertCircleIcon}>
                      Product Issues
                    </Button>
                    <Button fullWidth onClick={() => navigate("/app/scans")} icon={OrderIcon}>
                      Scan History
                    </Button>
                    <Button fullWidth onClick={() => navigate("/app/settings")} icon={ProductIcon}>
                      App Settings
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* ─── RECENT DEFECTS PREVIEW ─────────────────────────── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Most Impactful Active Issues
                  </Text>
                  <Button variant="plain" onClick={() => navigate("/app/issues")}>
                    {`View All (${latestScan?.issues?.length ?? 0}) →`}
                  </Button>
                </InlineStack>

                <Divider />

                {!latestScan?.issues || latestScan.issues.length === 0 ? (
                  <Box padding="400">
                    <InlineStack gap="300" blockAlign="center" align="center">
                      <Icon source={CheckCircleIcon} tone="success" />
                      <Text as="p" variant="bodyLg" tone="success">
                        Your store catalog is clean — no defects detected! 🎉
                      </Text>
                    </InlineStack>
                  </Box>
                ) : (
                  <BlockStack gap="200">
                    {latestScan.issues.slice(0, 5).map((issue) => (
                      <Box
                        key={issue.id}
                        padding="300"
                        background={issue.severity === "HIGH" ? "bg-surface-critical-active" : "bg-surface-caution-active"}
                        borderRadius="200"
                      >
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="200" blockAlign="start">
                            <Icon
                              source={AlertCircleIcon}
                              tone={issue.severity === "HIGH" ? "critical" : "caution"}
                            />
                            <BlockStack gap="050">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                {issue.productTitle}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {issue.message}
                              </Text>
                            </BlockStack>
                          </InlineStack>
                          <Badge tone={issue.severity === "HIGH" ? "critical" : "warning"}>
                            {issue.issueType.replace("_", " ")}
                          </Badge>
                        </InlineStack>
                      </Box>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ─── RECENT ACTIVITY LOG ────────────────────────────── */}
          {recentActivities.length > 0 && (
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Recent Activity
                  </Text>
                  <Divider />
                  <BlockStack gap="200">
                    {recentActivities.map((activity) => (
                      <BlockStack key={activity.id} gap="050">
                        <Text as="p" variant="bodySm" fontWeight="semibold">
                          {activity.action.replace(/_/g, " ")}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {activity.description}
                        </Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          {new Date(activity.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </Text>
                        <Divider />
                      </BlockStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </BlockStack>
    </Page>
  );
}
