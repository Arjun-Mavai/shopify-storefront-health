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
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
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

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  if (latestScan?.issues) {
    latestScan.issues.forEach(issue => {
      // Find category
      const def = Object.values(ISSUE_DEF).find(d => d.type === issue.issueType);
      if (def) {
        categoryHealth[def.category as keyof typeof categoryHealth].issues++;
      }

      if (issue.severity === "HIGH") criticalCount++;
      else if (issue.severity === "MEDIUM") warningCount++;
      else infoCount++;
    });
  }

  // Determine status based on issues
  (Object.keys(categoryHealth) as Array<keyof typeof categoryHealth>).forEach(cat => {
    if (categoryHealth[cat].issues > 0) {
      categoryHealth[cat].status = "Needs Attention";
    }
  });

  return json({
    shop: session.shop,
    store,
    latestScan,
    categoryHealth,
    stats: {
      criticalCount,
      warningCount,
      infoCount,
    }
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

function getScoreTone(score: number): "success" | "warning" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "critical";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

function getProgressTone(score: number): "success" | "highlight" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "highlight";
  return "critical";
}

export default function Dashboard() {
  const { shop, store, latestScan, categoryHealth, stats } = useLoaderData<typeof loader>();
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
    { name: ISSUE_CATEGORIES.IMAGES, icon: ImageIcon, data: categoryHealth[ISSUE_CATEGORIES.IMAGES] },
    { name: ISSUE_CATEGORIES.SEO, icon: SearchIcon, data: categoryHealth[ISSUE_CATEGORIES.SEO] },
    { name: ISSUE_CATEGORIES.PRODUCT_CONTENT, icon: TextIcon, data: categoryHealth[ISSUE_CATEGORIES.PRODUCT_CONTENT] },
    { name: ISSUE_CATEGORIES.CATALOG, icon: ProductIcon, data: categoryHealth[ISSUE_CATEGORIES.CATALOG] },
    { name: ISSUE_CATEGORIES.CONVERSION, icon: CartIcon, data: categoryHealth[ISSUE_CATEGORIES.CONVERSION] },
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
            <BlockStack gap="400" align="center" inlineAlign="center">
              <Text as="h1" variant="heading3xl" alignment="center">
                Scan your Shopify store in under 30 seconds.
              </Text>
              <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                Find missing product information, SEO issues, catalog problems, and conversion blockers before they affect your sales.
              </Text>
              <Text as="p" variant="bodyMd" alignment="center" tone="subdued">
                Get an instant Store Health Score with actionable recommendations. No AI. No complicated setup. Just fast, practical insights.
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
          {/* MAIN HEALTH SCORE CARD */}
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingXl" fontWeight="bold">Store Health Score</Text>
                  <BlockStack gap="100" inlineAlign="end">
                    <Text as="p" variant="heading3xl">{healthScore} / 100</Text>
                    <Badge tone={getScoreTone(healthScore)} size="large">{getScoreLabel(healthScore)}</Badge>
                  </BlockStack>
                </InlineStack>

                <ProgressBar progress={healthScore} tone={getProgressTone(healthScore)} size="large" />

                <Divider />

                <Text as="h3" variant="headingLg" fontWeight="bold">Store Summary</Text>
                
                <Grid>
                  {categories.map(cat => (
                    <Grid.Cell key={cat.name} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                      <Box background="bg-surface-active" borderRadius="200" padding="400">
                        <BlockStack gap="200" inlineAlign="center">
                          <Icon source={cat.icon} tone="base" />
                          <Text as="p" variant="headingMd">{cat.name}</Text>
                          <InlineStack gap="100" blockAlign="center">
                            <Icon 
                              source={cat.data.status === "Healthy" ? CheckCircleIcon : AlertCircleIcon} 
                              tone={cat.data.status === "Healthy" ? "success" : "warning"} 
                            />
                            <Text as="p" variant="bodyMd" tone={cat.data.status === "Healthy" ? "success" : "caution"}>
                              {cat.data.status === "Healthy" ? "Good" : "Needs Attention"}
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </Box>
                    </Grid.Cell>
                  ))}
                </Grid>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* SIDEBAR METRICS */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg" fontWeight="bold">Scan Overview</Text>
                  <Divider />
                  
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">Products Scanned</Text>
                    <Text as="p" variant="headingMd">{latestScan?.totalProductsChecked ?? 0}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">Issues Found</Text>
                    <Text as="p" variant="headingMd">{latestScan?.totalIssuesFound ?? 0}</Text>
                  </InlineStack>
                  
                  <Divider />
                  
                  <InlineStack align="space-between">
                    <InlineStack gap="100"><Icon source={AlertCircleIcon} tone="critical"/><Text as="p" variant="bodyMd">Critical</Text></InlineStack>
                    <Text as="p" variant="headingMd" tone="critical">{stats.criticalCount}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <InlineStack gap="100"><Icon source={AlertCircleIcon} tone="warning"/><Text as="p" variant="bodyMd">Warnings</Text></InlineStack>
                    <Text as="p" variant="headingMd" tone="caution">{stats.warningCount}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <InlineStack gap="100"><Icon source={CheckCircleIcon} tone="success"/><Text as="p" variant="bodyMd">Healthy Checks</Text></InlineStack>
                    <Text as="p" variant="headingMd" tone="success">
                      {/* Assuming healthy checks = total checks - issues, roughly (products * categories) - issues */}
                      {Math.max(0, ((latestScan?.totalProductsChecked ?? 0) * 5) - (latestScan?.totalIssuesFound ?? 0))}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* ROADMAP CARD */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg" fontWeight="bold">Future Roadmap</Text>
                    <Badge tone="new">Coming Soon</Badge>
                  </InlineStack>
                  <Divider />
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">• Bulk Fix</Text>
                    <Text as="p" variant="bodyMd">• AI SEO Suggestions</Text>
                    <Text as="p" variant="bodyMd">• Alt Text Generator</Text>
                    <Text as="p" variant="bodyMd">• Description Generator</Text>
                    <Text as="p" variant="bodyMd">• Bulk Meta Updates</Text>
                    <Text as="p" variant="bodyMd">• Weekly Scheduled Scans</Text>
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
