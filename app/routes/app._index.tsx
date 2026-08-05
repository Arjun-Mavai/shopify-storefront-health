import { useEffect } from "react";
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
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshIcon,
  ImageIcon,
  SearchIcon,
  TextIcon,
  ProductIcon,
  CartIcon,
  OrderIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { StoreRepository } from "../repositories/store.server";
import { ScanRepository } from "../repositories/scan.server";
import { HealthService } from "../services/health.server";
import { ISSUE_DEF, ISSUE_CATEGORIES } from "../lib/issue-types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const store = await StoreRepository.syncStoreInfoFromShopify(admin, session.shop);

  let latestScan = await ScanRepository.getLatestScan(store.id);
  if (!latestScan) {
    latestScan = await HealthService.runFullStoreAudit(admin, session.shop, "MANUAL");
  }

  const categoryHealth = {
    [ISSUE_CATEGORIES.IMAGES]: { issues: 0, status: "Healthy" },
    [ISSUE_CATEGORIES.PRODUCT_CONTENT]: { issues: 0, status: "Healthy" },
    [ISSUE_CATEGORIES.SEO]: { issues: 0, status: "Healthy" },
    [ISSUE_CATEGORIES.CATALOG]: { issues: 0, status: "Healthy" },
    [ISSUE_CATEGORIES.CONVERSION]: { issues: 0, status: "Healthy" },
  };

  if (latestScan?.issues) {
    latestScan.issues.forEach(issue => {
      const def = Object.values(ISSUE_DEF).find(d => d.type === issue.issueType);
      if (def) {
        categoryHealth[def.category as keyof typeof categoryHealth].issues++;
      }
    });
  }

  (Object.keys(categoryHealth) as Array<keyof typeof categoryHealth>).forEach(cat => {
    if (categoryHealth[cat].issues > 0) {
      categoryHealth[cat].status = "Needs Attention";
    }
  });

  const totalScans = (await ScanRepository.getScanHistory(store.id, 100)).length;

  return json({
    shop: session.shop,
    store,
    latestScan,
    categoryHealth,
    totalScans,
    plan: store.subscription?.plan || "FREE",
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

function getBadgeScoreTone(score: number): "success" | "warning" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "critical";
}

function getTextScoreTone(score: number): "success" | "caution" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "caution";
  return "critical";
}

function getPlanTone(plan: string): "success" | "info" | "critical" {
  if (plan === "PRO") return "info";
  return "success";
}

export default function Dashboard() {
  const { shop, store, latestScan, categoryHealth, totalScans, plan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const isScanning = fetcher.state !== "idle";
  const healthScore = latestScan?.healthScore ?? 100;
  
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

  const categories = [
    { name: ISSUE_CATEGORIES.IMAGES, icon: ImageIcon, data: categoryHealth[ISSUE_CATEGORIES.IMAGES], param: "Images" },
    { name: ISSUE_CATEGORIES.SEO, icon: SearchIcon, data: categoryHealth[ISSUE_CATEGORIES.SEO], param: "SEO" },
    { name: ISSUE_CATEGORIES.PRODUCT_CONTENT, icon: TextIcon, data: categoryHealth[ISSUE_CATEGORIES.PRODUCT_CONTENT], param: "Product Content" },
    { name: ISSUE_CATEGORIES.CATALOG, icon: ProductIcon, data: categoryHealth[ISSUE_CATEGORIES.CATALOG], param: "Catalog" },
    { name: ISSUE_CATEGORIES.CONVERSION, icon: CartIcon, data: categoryHealth[ISSUE_CATEGORIES.CONVERSION], param: "Conversion" },
  ];

  return (
    <Page fullWidth>
      <TitleBar title="Dashboard">
        <button onClick={() => navigate("/app/issues")}>View Issues</button>
      </TitleBar>

      <BlockStack gap="600">
        
        {/* HERO SECTION */}
        <Box paddingBlockEnd="400">
          <Card background="bg-surface-secondary">
            <BlockStack gap="400" align="start">
              <Text as="h1" variant="heading3xl">
                Scan your Shopify store in under 30 seconds.
              </Text>
              <Text as="p" variant="bodyLg" tone="subdued">
                Find missing product information, SEO issues, catalog problems, and conversion blockers before they affect your sales.
              </Text>
              <Box paddingBlockStart="200">
                <Button size="large" variant="primary" onClick={handleScanNow} loading={isScanning} disabled={atLimit}>
                  Start Free Scan
                </Button>
              </Box>
            </BlockStack>
          </Card>
        </Box>

        {atLimit && (
          <Banner title="Monthly scan limit reached" tone="warning" action={{ content: "Upgrade Plan", url: "/app/billing" }}>
            <p>You have used all <strong>{scanLimit} free scans</strong> this month. Upgrade to Pro to continue auditing.</p>
          </Banner>
        )}

        <Layout>
          {/* LEFT COLUMN */}
          <Layout.Section>
            <BlockStack gap="500">
              {/* STORE HEALTH CARD */}
              <Card>
                <BlockStack gap="500">
                  <Text as="h2" variant="headingXl" fontWeight="bold">Store Health Score</Text>
                  
                  <InlineStack align="space-between" blockAlign="center">
                    {/* Big Score */}
                    <BlockStack gap="200" inlineAlign="center">
                      <Box padding="400" background="bg-surface-active" borderRadius="300" minWidth="200px">
                        <BlockStack gap="200" inlineAlign="center">
                          <Text as="p" variant="heading3xl" tone={getTextScoreTone(healthScore)}>
                            {healthScore} / 100
                          </Text>
                          <Badge tone={getBadgeScoreTone(healthScore)} size="large">
                            {healthScore >= 80 ? "Healthy" : healthScore >= 50 ? "Needs Attention" : "Critical"}
                          </Badge>
                        </BlockStack>
                      </Box>
                    </BlockStack>

                    {/* Category List */}
                    <Box padding="400" background="bg-surface" borderRadius="200" minWidth="300px">
                      <BlockStack gap="300">
                        {categories.map(cat => {
                          const hasIssues = cat.data.status !== "Healthy";
                          return (
                            <div key={cat.name} onClick={() => navigate(`/app/issues?category=${encodeURIComponent(cat.param)}`)} style={{ cursor: "pointer" }}>
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p" variant="bodyLg" fontWeight={hasIssues ? "bold" : "regular"}>{cat.name}</Text>
                                <InlineStack gap="200" blockAlign="center">
                                  {hasIssues && <Text as="p" variant="bodySm" tone="subdued">{cat.data.issues} issues</Text>}
                                  {hasIssues ? "⚠️" : "✅"}
                                </InlineStack>
                              </InlineStack>
                            </div>
                          );
                        })}
                      </BlockStack>
                    </Box>
                  </InlineStack>
                  
                  <Box paddingBlockStart="200">
                     <Button size="large" onClick={() => navigate("/app/issues")} fullWidth>
                      Improve Store Score →
                     </Button>
                  </Box>
                </BlockStack>
              </Card>

              {/* ── Metric Tiles ── */}
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box background="bg-surface-active" borderRadius="200" padding="400">
                    <BlockStack gap="100" inlineAlign="center">
                      <Text as="p" variant="heading3xl">{latestScan?.totalProductsChecked ?? 0}</Text>
                      <Text as="p" variant="bodySm" tone="subdued">Products Audited</Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box background={latestScan?.totalIssuesFound ? "bg-surface-critical-active" : "bg-surface-success"} borderRadius="200" padding="400">
                    <BlockStack gap="100" inlineAlign="center">
                      <Text as="p" variant="heading3xl" tone={latestScan?.totalIssuesFound ? "critical" : "success"}>
                        {latestScan?.totalIssuesFound ?? 0}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">Active Defects</Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box background="bg-surface-active" borderRadius="200" padding="400">
                    <BlockStack gap="100" inlineAlign="center">
                      <Text as="p" variant="heading3xl">{totalScans}</Text>
                      <Text as="p" variant="bodySm" tone="subdued">Total Audits Run</Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>

              <InlineStack gap="300">
                <Button variant="primary" loading={isScanning} onClick={handleScanNow} icon={RefreshIcon} disabled={atLimit} size="large">
                  {isScanning ? "Scanning Store…" : "Run Full Audit"}
                </Button>
                <Button size="large" onClick={() => navigate("/app/issues")} icon={AlertCircleIcon}>
                  {`View All Issues (${latestScan?.totalIssuesFound ?? 0})`}
                </Button>
              </InlineStack>
            </BlockStack>
          </Layout.Section>

          {/* RIGHT COLUMN */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Store & Plan Status */}
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
                    <Button fullWidth onClick={() => navigate("/app/issues")} icon={AlertCircleIcon} textAlign="left">
                      View All Product Issues
                    </Button>
                    <Button fullWidth onClick={() => navigate("/app/scans")} icon={OrderIcon} textAlign="left">
                      Scan History & Logs
                    </Button>
                    <Button fullWidth onClick={() => navigate("/app/settings")} icon={ProductIcon} textAlign="left">
                      App Settings
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
