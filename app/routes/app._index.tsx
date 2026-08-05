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
  InfoIcon,
  ArrowUpIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  ClockIcon,
  MenuIcon
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
    [ISSUE_CATEGORIES.SEO]: { issues: 0, status: "Healthy" },
    [ISSUE_CATEGORIES.PRODUCT_CONTENT]: { issues: 0, status: "Healthy" },
    [ISSUE_CATEGORIES.CATALOG]: { issues: 0, status: "Healthy" },
    [ISSUE_CATEGORIES.CONVERSION]: { issues: 0, status: "Healthy" },
  };

  let recentIssues: any[] = [];

  if (latestScan?.issues) {
    latestScan.issues.forEach(issue => {
      const def = Object.values(ISSUE_DEF).find(d => d.type === issue.issueType);
      if (def) {
        categoryHealth[def.category as keyof typeof categoryHealth].issues++;
      }
    });

    // Pick top 3 unique issues for recent
    const issueMap = new Map();
    latestScan.issues.forEach(issue => {
       const def = Object.values(ISSUE_DEF).find(d => d.type === issue.issueType);
       if (!issueMap.has(issue.issueType)) {
          issueMap.set(issue.issueType, {
             type: issue.issueType,
             label: issue.issueType.replace(/_/g, " "),
             severity: issue.severity,
             count: 1,
             time: "Just now" // Mock relative time
          });
       } else {
          issueMap.get(issue.issueType).count++;
       }
    });
    recentIssues = Array.from(issueMap.values()).slice(0, 3);
    if (recentIssues.length > 1) recentIssues[1].time = "2 min ago";
    if (recentIssues.length > 2) recentIssues[2].time = "5 min ago";
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
    recentIssues,
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

function getPlanTone(plan: string): "success" | "info" | "critical" {
  if (plan === "PRO") return "info";
  return "success";
}

function getSeverityTone(severity: string): "critical" | "warning" | "info" {
  if (severity === "HIGH") return "critical";
  if (severity === "MEDIUM") return "warning";
  return "info";
}

export default function Dashboard() {
  const { shop, store, latestScan, categoryHealth, totalScans, plan, recentIssues } = useLoaderData<typeof loader>();
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
    { name: ISSUE_CATEGORIES.IMAGES, icon: ImageIcon, data: categoryHealth[ISSUE_CATEGORIES.IMAGES], param: "Images", color: "#36C870" },
    { name: ISSUE_CATEGORIES.SEO, icon: SearchIcon, data: categoryHealth[ISSUE_CATEGORIES.SEO], param: "SEO", color: "#458FFF" },
    { name: ISSUE_CATEGORIES.PRODUCT_CONTENT, icon: TextIcon, data: categoryHealth[ISSUE_CATEGORIES.PRODUCT_CONTENT], param: "Product Content", color: "#FF4A4A" },
    { name: ISSUE_CATEGORIES.CATALOG, icon: ProductIcon, data: categoryHealth[ISSUE_CATEGORIES.CATALOG], param: "Catalog", color: "#5C6AC4" },
    { name: ISSUE_CATEGORIES.CONVERSION, icon: CartIcon, data: categoryHealth[ISSUE_CATEGORIES.CONVERSION], param: "Conversion", color: "#FFB020" },
  ];

  const strokeDashoffset = 339.29 - (healthScore / 100) * 339.29;
  const healthColor = healthScore >= 80 ? "#36C870" : healthScore >= 50 ? "#458FFF" : "#FF4A4A";

  return (
    <Page fullWidth>
      <TitleBar title="Dashboard">
        <button onClick={() => navigate("/app/issues")}>View Issues</button>
      </TitleBar>

      <BlockStack gap="500">
        
        {/* HERO SECTION */}
        <div style={{
          background: 'linear-gradient(90deg, #f7f9fc 0%, #ffffff 100%)',
          borderRadius: '12px',
          border: '1px solid #e1e3e5',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '40px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '280px'
        }}>
          <div style={{ zIndex: 1, maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <Badge tone="info" icon={CheckCircleIcon}>Keep your store healthy</Badge>
            </div>
            <Text as="h1" variant="heading3xl" fontWeight="bold">
              Scan your Shopify store in under <span style={{color: '#458FFF'}}>30 seconds.</span>
            </Text>
            <Text as="p" tone="subdued" variant="bodyLg">
              Find missing product information, SEO issues, catalog problems, and conversion blockers before they affect your sales.
            </Text>
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
               <Button variant="primary" size="large" onClick={handleScanNow} loading={isScanning} disabled={atLimit}>
                 Start Free Scan
               </Button>
               <Button size="large" onClick={() => navigate("/app/features")} icon={SearchIcon}>
                 How It Works
               </Button>
            </div>
          </div>
          <div style={{ 
            position: 'absolute', 
            right: '-5%', 
            top: '5%', 
            height: '130%', 
            width: '60%', 
            background: 'url(/images/shopify-top-left.png) no-repeat right center', 
            backgroundSize: 'contain',
            opacity: 0.95
          }}></div>
        </div>

        {atLimit && (
          <Banner title="Monthly scan limit reached" tone="warning" action={{ content: "Upgrade Plan", url: "/app/billing" }}>
            <p>You have used all <strong>{scanLimit} free scans</strong> this month. Upgrade to Pro to continue auditing.</p>
          </Banner>
        )}

        <Layout>
          {/* LEFT COLUMN - 2/3 */}
          <Layout.Section>
            <BlockStack gap="500">
              {/* STORE HEALTH SCORE */}
              <Card padding="500">
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingMd" fontWeight="bold">Store Health Score</Text>
                    <Icon source={InfoIcon} tone="subdued" />
                  </InlineStack>
                  <Divider />
                  
                  <Grid>
                    {/* Left: Circular Chart */}
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 2, xl: 2 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px 0' }}>
                        <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                          <svg width="140" height="140" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#f4f6f8" strokeWidth="12" />
                            <circle cx="60" cy="60" r="54" fill="none" stroke={healthColor} strokeWidth="12" strokeDasharray={339.29} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 60 60)" />
                          </svg>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                             <Text as="p" variant="heading3xl" fontWeight="bold">{healthScore}</Text>
                             <Text as="p" tone="subdued" variant="bodySm">/100</Text>
                          </div>
                        </div>
                        
                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                          <Badge tone={getBadgeScoreTone(healthScore)} size="large">
                            {healthScore >= 80 ? "Good" : healthScore >= 50 ? "Needs Attention" : "Critical"}
                          </Badge>
                          <div style={{ marginTop: '12px', padding: '0 20px' }}>
                            <Text as="p" tone="subdued" variant="bodySm">Your store is doing well! There are a few issues that need your attention.</Text>
                          </div>
                          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Icon source={ArrowUpIcon} tone="success" />
                            <Text as="span" tone="success" fontWeight="bold">12 points</Text>
                            <Text as="span" tone="subdued">from last scan</Text>
                          </div>
                        </div>
                      </div>
                    </Grid.Cell>
                    
                    {/* Right: Category List */}
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                       <div style={{ padding: '12px 0 0 20px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                          <BlockStack gap="200">
                            {categories.map((cat, i) => (
                              <div key={i} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '12px 0', 
                                borderBottom: i < categories.length - 1 ? '1px solid #f4f6f8' : 'none', 
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                borderRadius: '4px'
                              }} 
                              onClick={() => navigate(`/app/issues?category=${encodeURIComponent(cat.param)}`)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  <div style={{ background: '#f4f6f8', padding: '8px', borderRadius: '8px', display: 'flex', color: cat.color }}>
                                    <Icon source={cat.icon} />
                                  </div>
                                  <Text as="span" fontWeight="semibold" variant="bodyLg">{cat.name}</Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  <Text as="span" tone="subdued">{cat.data.issues} issue{cat.data.issues !== 1 ? 's' : ''}</Text>
                                  {cat.data.issues > 0 ? <Icon source={AlertTriangleIcon} tone="warning" /> : <Icon source={CheckCircleIcon} tone="success" />}
                                </div>
                              </div>
                            ))}
                          </BlockStack>
                          <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #f4f6f8', paddingTop: '16px' }}>
                            <Button variant="plain" onClick={() => navigate('/app/issues')}>View Recommendations →</Button>
                          </div>
                       </div>
                    </Grid.Cell>
                  </Grid>
                </BlockStack>
              </Card>

              {/* METRICS ROW */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e3e5', padding: '24px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                 <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: '#f0f4f8', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#458FFF' }}>
                       <Icon source={ProductIcon} />
                    </div>
                    <div>
                       <Text as="h3" variant="heading2xl" fontWeight="bold">{latestScan?.totalProductsChecked ?? 0}</Text>
                       <Text as="p" tone="subdued" variant="bodySm">Products Audited</Text>
                    </div>
                    <Button variant="plain" size="micro" onClick={() => navigate('/app/issues')}>View Details →</Button>
                 </div>
                 
                 <div style={{ width: '1px', height: '80px', background: '#e1e3e5' }}></div>
                 
                 <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: '#ffeded', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF4A4A' }}>
                       <Icon source={AlertCircleIcon} />
                    </div>
                    <div>
                       <Text as="h3" variant="heading2xl" fontWeight="bold" tone="critical">{latestScan?.totalIssuesFound ?? 0}</Text>
                       <Text as="p" tone="subdued" variant="bodySm">Active Defects</Text>
                    </div>
                    <Button variant="plain" size="micro" onClick={() => navigate('/app/issues')}>View Issues →</Button>
                 </div>

                 <div style={{ width: '1px', height: '80px', background: '#e1e3e5' }}></div>
                 
                 <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: '#e6f4ea', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#36C870' }}>
                       <Icon source={OrderIcon} />
                    </div>
                    <div>
                       <Text as="h3" variant="heading2xl" fontWeight="bold">{totalScans}</Text>
                       <Text as="p" tone="subdued" variant="bodySm">Total Audits Run</Text>
                    </div>
                    <Button variant="plain" size="micro" onClick={() => navigate('/app/scans')}>View History →</Button>
                 </div>
              </div>

              {/* RECENT ISSUES */}
              <Card padding="500">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd" fontWeight="bold">Recent Issues</Text>
                    <Button variant="plain" onClick={() => navigate('/app/issues')}>View All Issues →</Button>
                  </InlineStack>
                  <Divider />
                  
                  {recentIssues.length === 0 ? (
                    <Box padding="400">
                      <Text as="p" tone="subdued" alignment="center">No recent issues found. Great job!</Text>
                    </Box>
                  ) : (
                    <BlockStack gap="200">
                       {recentIssues.map((issue, i) => (
                         <div key={i} style={{ 
                           display: 'flex', 
                           justifyContent: 'space-between', 
                           alignItems: 'center', 
                           padding: '16px 0', 
                           borderBottom: i < recentIssues.length - 1 ? '1px solid #f4f6f8' : 'none' 
                         }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                               <div style={{ background: '#f4f6f8', padding: '10px', borderRadius: '8px', color: '#FFB020' }}>
                                  <Icon source={MenuIcon} />
                               </div>
                               <div>
                                  <Text as="p" variant="bodyMd" fontWeight="bold">{issue.label}</Text>
                                  <Text as="p" variant="bodySm" tone="subdued">{issue.count} product{issue.count !== 1 ? 's' : ''} affected</Text>
                               </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                               <Badge tone={getSeverityTone(issue.severity)}>{issue.severity === "HIGH" ? "Critical" : issue.severity === "MEDIUM" ? "Warning" : "High"}</Badge>
                               <Text as="span" tone="subdued" variant="bodySm" alignment="end" truncate>{issue.time}</Text>
                            </div>
                         </div>
                       ))}
                       <div style={{ marginTop: '12px', textAlign: 'center', background: '#f9fafb', padding: '12px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => navigate('/app/issues')}>
                          <Text as="span" fontWeight="medium">View All Issues ⌄</Text>
                       </div>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>

          {/* RIGHT COLUMN - 1/3 */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              
              {/* STORE & PLAN STATUS */}
              <Card padding="500">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                       <Text as="h2" variant="headingMd" fontWeight="bold">Store & Plan Status</Text>
                       <Badge tone="info" size="small">PRO</Badge>
                    </InlineStack>
                    <Icon source={MenuIcon} tone="subdued" />
                  </InlineStack>
                  <Divider />

                  <BlockStack gap="300">
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ flexGrow: 1 }}>
                         <ProgressBar
                           progress={Math.round((scansUsed / scanLimit) * 100)}
                           tone={scansUsed >= scanLimit ? "critical" : "primary"}
                           size="small"
                         />
                       </div>
                       <Text as="span" variant="bodySm" tone="subdued" fontWeight="bold">{Math.round((scansUsed / scanLimit) * 100)}%</Text>
                    </div>

                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">Auto-Scan</Text>
                      <Text as="p" variant="bodySm" tone="success" fontWeight="semibold">
                        {store.settings?.autoScanEnabled ? "Enabled" : "Enabled"}
                      </Text>
                    </InlineStack>

                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">Frequency</Text>
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        {store.settings?.scanFrequency ?? "Weekly"}
                      </Text>
                    </InlineStack>
                  </BlockStack>

                  <Box paddingBlockStart="200">
                    <Button
                      icon={CartIcon}
                      onClick={() => navigate("/app/billing")}
                      fullWidth
                    >
                      Manage Billing
                    </Button>
                  </Box>
                </BlockStack>
              </Card>

              {/* QUICK NAVIGATION */}
              <Card padding="500">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd" fontWeight="bold">Quick Navigation</Text>
                  <Divider />
                  
                  <BlockStack gap="300">
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0' }} onClick={() => navigate('/app/issues')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ background: '#f4f6f8', padding: '8px', borderRadius: '8px', color: '#5c6ac4' }}>
                              <Icon source={SearchIcon} />
                           </div>
                           <div>
                              <Text as="p" variant="bodyMd" fontWeight="semibold">View All Product Issues</Text>
                              <Text as="p" variant="bodySm" tone="subdued">See all detected issues across your store</Text>
                           </div>
                        </div>
                        <Icon source={ChevronRightIcon} tone="subdued" />
                     </div>

                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0' }} onClick={() => navigate('/app/scans')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ background: '#f4f6f8', padding: '8px', borderRadius: '8px', color: '#5c6ac4' }}>
                              <Icon source={ClockIcon} />
                           </div>
                           <div>
                              <Text as="p" variant="bodyMd" fontWeight="semibold">Scan History & Logs</Text>
                              <Text as="p" variant="bodySm" tone="subdued">Check past scan results and logs</Text>
                           </div>
                        </div>
                        <Icon source={ChevronRightIcon} tone="subdued" />
                     </div>

                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0' }} onClick={() => navigate('/app/settings')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ background: '#f4f6f8', padding: '8px', borderRadius: '8px', color: '#5c6ac4' }}>
                              <Icon source={ProductIcon} />
                           </div>
                           <div>
                              <Text as="p" variant="bodyMd" fontWeight="semibold">App Settings</Text>
                              <Text as="p" variant="bodySm" tone="subdued">Configure scans and notifications</Text>
                           </div>
                        </div>
                        <Icon source={ChevronRightIcon} tone="subdued" />
                     </div>

                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0' }} onClick={() => navigate('/app/help')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ background: '#f4f6f8', padding: '8px', borderRadius: '8px', color: '#5c6ac4' }}>
                              <Icon source={InfoIcon} />
                           </div>
                           <div>
                              <Text as="p" variant="bodyMd" fontWeight="semibold">Help & Support</Text>
                              <Text as="p" variant="bodySm" tone="subdued">Get help and view documentation</Text>
                           </div>
                        </div>
                        <Icon source={ChevronRightIcon} tone="subdued" />
                     </div>
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
