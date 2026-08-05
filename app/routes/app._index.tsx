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
  Divider,
  Icon,
  Grid,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  SearchIcon,
  OrderIcon,
  InfoIcon,
  ArrowUpIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  ClockIcon,
  MenuIcon,
  LinkIcon,
  SettingsIcon,
  ChatIcon,
  NoteIcon,
  ViewIcon,
  ProductIcon,
  ImageIcon,
  CartIcon
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

    const issueMap = new Map();
    latestScan.issues.forEach(issue => {
       if (!issueMap.has(issue.issueType)) {
          issueMap.set(issue.issueType, {
             type: issue.issueType,
             label: issue.issueType.replace(/_/g, " "),
             severity: issue.severity,
             count: 1,
             time: "Just now"
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
  const scanPercent = Math.min(100, Math.round((scansUsed / scanLimit) * 100));

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Store Health Audit Complete! ✅");
    }
  }, [fetcher.data, shopify]);

  const handleScanNow = () => {
    fetcher.submit({ intent: "trigger_scan" }, { method: "POST" });
  };

  const categories = [
    { name: ISSUE_CATEGORIES.IMAGES, icon: ViewIcon, data: categoryHealth[ISSUE_CATEGORIES.IMAGES], param: "Images", color: "#36C870", bg: "#e6f4ea" },
    { name: ISSUE_CATEGORIES.SEO, icon: SearchIcon, data: categoryHealth[ISSUE_CATEGORIES.SEO], param: "SEO", color: "#458FFF", bg: "#f0f4f8" },
    { name: ISSUE_CATEGORIES.PRODUCT_CONTENT, icon: NoteIcon, data: categoryHealth[ISSUE_CATEGORIES.PRODUCT_CONTENT], param: "Product Content", color: "#FF4A4A", bg: "#ffeded" },
    { name: ISSUE_CATEGORIES.CATALOG, icon: ProductIcon, data: categoryHealth[ISSUE_CATEGORIES.CATALOG], param: "Catalog", color: "#8C9196", bg: "#f4f6f8" },
    { name: ISSUE_CATEGORIES.CONVERSION, icon: CartIcon, data: categoryHealth[ISSUE_CATEGORIES.CONVERSION], param: "Conversion", color: "#FFB020", bg: "#fff6e0" },
  ];

  // Colors based on score
  const isHealthy = healthScore >= 80;
  const isWarning = healthScore >= 50 && healthScore < 80;
  const healthColor = isHealthy ? "#36C870" : isWarning ? "#FFB020" : "#FF4A4A";
  const badgeTone = isHealthy ? "success" : isWarning ? "warning" : "critical";
  const badgeText = isHealthy ? "Good" : isWarning ? "Needs Attention" : "Critical";

  const strokeDasharray = 339.29; // 2 * pi * 54
  const strokeDashoffset = strokeDasharray - (healthScore / 100) * strokeDasharray;

  return (
    <Page fullWidth>
      <TitleBar title="Dashboard">
        <button onClick={() => navigate("/app/issues")}>View Issues</button>
      </TitleBar>

      <BlockStack gap="500">
        
        {/* HERO SECTION - REFINED */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e1e3e5',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '40px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '260px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{ zIndex: 2, maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <Badge tone="info" icon={CheckCircleIcon}>Keep your store healthy</Badge>
            </div>
            <Text as="h1" variant="heading3xl" fontWeight="bold">
              Scan your Shopify store in <br />under <span style={{color: '#2c6ecb'}}>30 seconds.</span>
            </Text>
            <Text as="p" tone="subdued" variant="bodyLg">
              Find missing product information, SEO issues, catalog problems, and <br />conversion blockers before they affect your sales.
            </Text>
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
               <button 
                 onClick={handleScanNow} 
                 disabled={isScanning || atLimit}
                 style={{
                   background: '#202223', 
                   color: '#fff', 
                   border: 'none', 
                   padding: '8px 16px', 
                   borderRadius: '4px', 
                   fontWeight: 600, 
                   cursor: (isScanning || atLimit) ? 'not-allowed' : 'pointer'
                 }}>
                 {isScanning ? 'Scanning...' : 'Start Free Scan'}
               </button>
               <Button onClick={() => navigate("/app/features")} icon={SearchIcon}>
                 How It Works
               </Button>
            </div>
          </div>
          {/* Seamless background image on the right */}
          <div style={{ 
            position: 'absolute', 
            right: '2%', 
            top: '0%', 
            height: '100%', 
            width: '45%', 
            background: 'url(/images/shopify-top-left.png) no-repeat right center', 
            backgroundSize: 'contain',
            zIndex: 1
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
            <BlockStack gap="400">
              
              {/* STORE HEALTH SCORE CARD */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e3e5', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f4f6f8' }}>
                   <Text as="h2" variant="headingSm" fontWeight="bold">Store Health Score</Text>
                   <Icon source={InfoIcon} tone="subdued" />
                </div>
                
                <div style={{ display: 'flex', marginTop: '24px' }}>
                  {/* Left: Circular Chart */}
                  <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', borderRight: '1px solid #f4f6f8', paddingRight: '24px' }}>
                    <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                      <svg width="130" height="130" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#f4f6f8" strokeWidth="8" />
                        <circle cx="60" cy="60" r="54" fill="none" stroke={healthColor} strokeWidth="8" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 60 60)" />
                      </svg>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                         <Text as="p" variant="heading3xl" fontWeight="bold">{healthScore}</Text>
                         <Text as="p" tone="subdued" variant="bodySm">/100</Text>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px' }}>
                      <Badge tone={badgeTone}>{badgeText}</Badge>
                    </div>
                    
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <Text as="p" tone="subdued" variant="bodySm">Your store is doing well! There are a few issues that need your attention.</Text>
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Icon source={ArrowUpIcon} tone="success" />
                        <Text as="span" tone="success" fontWeight="bold">12 points</Text>
                        <Text as="span" tone="subdued">from last scan</Text>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Category List */}
                  <div style={{ flex: '0 0 65%', paddingLeft: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       {categories.map((cat, i) => (
                         <div key={i} style={{ 
                           display: 'flex', 
                           justifyContent: 'space-between', 
                           alignItems: 'center', 
                           padding: '10px 12px', 
                           cursor: 'pointer',
                           borderRadius: '6px',
                           transition: 'background-color 0.2s',
                         }} 
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                         onClick={() => navigate(`/app/issues?category=${encodeURIComponent(cat.param)}`)}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                             <div style={{ background: cat.bg, width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}>
                               <Icon source={cat.icon} />
                             </div>
                             <Text as="span" fontWeight="semibold" variant="bodyMd">{cat.name}</Text>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '120px', justifyContent: 'space-between' }}>
                             <Text as="span" tone="subdued" variant="bodySm">{cat.data.issues} issue{cat.data.issues !== 1 ? 's' : ''}</Text>
                             {cat.data.issues > 0 ? <Icon source={AlertTriangleIcon} tone="warning" /> : <Icon source={CheckCircleIcon} tone="success" />}
                           </div>
                         </div>
                       ))}
                     </div>
                     <div style={{ marginTop: '16px', textAlign: 'center' }}>
                       <Button variant="plain" onClick={() => navigate('/app/issues')}>View Recommendations →</Button>
                     </div>
                  </div>
                </div>
              </div>

              {/* METRICS ROW */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e3e5', padding: '32px 0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                 <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <div style={{ background: '#f0f4f8', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#458FFF', marginBottom: '8px' }}>
                       <Icon source={LinkIcon} />
                    </div>
                    <Text as="h3" variant="heading2xl" fontWeight="bold">{latestScan?.totalProductsChecked ?? 0}</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Products Audited</Text>
                    <div style={{ marginTop: '4px' }}>
                       <div onClick={() => navigate('/app/issues')} style={{cursor: 'pointer', color: '#2c6ecb', fontSize: '13px', fontWeight: 500}}>View Details →</div>
                    </div>
                 </div>
                 
                 <div style={{ width: '1px', height: '100px', background: '#f4f6f8' }}></div>
                 
                 <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <div style={{ background: '#ffeded', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF4A4A', marginBottom: '8px' }}>
                       <Icon source={AlertCircleIcon} />
                    </div>
                    <Text as="h3" variant="heading2xl" fontWeight="bold" tone="critical">{latestScan?.totalIssuesFound ?? 0}</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Active Defects</Text>
                    <div style={{ marginTop: '4px' }}>
                       <div onClick={() => navigate('/app/issues')} style={{cursor: 'pointer', color: '#2c6ecb', fontSize: '13px', fontWeight: 500}}>View Issues →</div>
                    </div>
                 </div>

                 <div style={{ width: '1px', height: '100px', background: '#f4f6f8' }}></div>
                 
                 <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <div style={{ background: '#e6f4ea', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#36C870', marginBottom: '8px' }}>
                       <Icon source={OrderIcon} />
                    </div>
                    <Text as="h3" variant="heading2xl" fontWeight="bold">{totalScans}</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Total Audits Run</Text>
                    <div style={{ marginTop: '4px' }}>
                       <div onClick={() => navigate('/app/scans')} style={{cursor: 'pointer', color: '#2c6ecb', fontSize: '13px', fontWeight: 500}}>View History →</div>
                    </div>
                 </div>
              </div>

              {/* RECENT ISSUES */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e3e5', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f4f6f8' }}>
                    <Text as="h2" variant="headingSm" fontWeight="bold">Recent Issues</Text>
                    <div onClick={() => navigate('/app/issues')} style={{cursor: 'pointer', color: '#2c6ecb', fontSize: '13px', fontWeight: 500}}>View All Issues →</div>
                 </div>
                 
                 {recentIssues.length === 0 ? (
                   <Box padding="400">
                     <Text as="p" tone="subdued" alignment="center">No recent issues found. Great job!</Text>
                   </Box>
                 ) : (
                   <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {recentIssues.map((issue, i) => (
                        <div key={i} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '16px 0', 
                          borderBottom: i < recentIssues.length - 1 ? '1px solid #f4f6f8' : 'none' 
                        }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ background: '#f0f4f8', padding: '8px', borderRadius: '8px', color: '#2c6ecb' }}>
                                 <Icon source={ImageIcon} />
                              </div>
                              <div>
                                 <Text as="p" variant="bodyMd" fontWeight="semibold">{issue.label}</Text>
                                 <Text as="p" variant="bodySm" tone="subdued">{issue.count} product{issue.count !== 1 ? 's' : ''} affected</Text>
                              </div>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '32px', minWidth: '150px', justifyContent: 'space-between' }}>
                              <Badge tone={getSeverityTone(issue.severity)}>
                                {issue.severity === "HIGH" ? "Critical" : issue.severity === "MEDIUM" ? "Warning" : "High"}
                              </Badge>
                              <Text as="span" tone="subdued" variant="bodySm">{issue.time}</Text>
                           </div>
                        </div>
                      ))}
                      <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #f4f6f8', paddingTop: '16px', cursor: 'pointer' }} onClick={() => navigate('/app/issues')}>
                         <Text as="span" variant="bodySm" fontWeight="semibold">View All Issues ⌄</Text>
                      </div>
                   </div>
                 )}
              </div>

            </BlockStack>
          </Layout.Section>

          {/* RIGHT COLUMN - 1/3 */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              
              {/* STORE & PLAN STATUS */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e3e5', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f4f6f8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Text as="h2" variant="headingSm" fontWeight="bold">Store & Plan Status</Text>
                       <Badge tone="info" size="small">PRO</Badge>
                    </div>
                    <Icon source={MenuIcon} tone="subdued" />
                 </div>

                 <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text as="p" variant="bodySm" tone="subdued">Store</Text>
                     <Text as="p" variant="bodySm" fontWeight="bold">{store.name || shop.split(".")[0]}</Text>
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text as="p" variant="bodySm" tone="subdued">Current Plan</Text>
                     <span style={{color: '#2c6ecb', fontWeight: 'bold', fontSize: '13px'}}>PRO</span>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <Text as="p" variant="bodySm" tone="subdued">Scans Used</Text>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                         <Text as="p" variant="bodySm" fontWeight="bold">{scansUsed} / {scanLimit}</Text>
                       </div>
                     </div>
                     <div style={{ width: '100%', height: '4px', background: '#f4f6f8', borderRadius: '2px', overflow: 'hidden' }}>
                       <div style={{ width: `${scanPercent}%`, height: '100%', background: scanPercent >= 100 ? '#FF4A4A' : '#2c6ecb' }}></div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       <Text as="span" variant="bodySm" tone="subdued">{scanPercent}%</Text>
                     </div>
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text as="p" variant="bodySm" tone="subdued">Auto-Scan</Text>
                     <span style={{color: '#36C870', fontWeight: 'bold', fontSize: '13px'}}>Enabled</span>
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text as="p" variant="bodySm" tone="subdued">Frequency</Text>
                     <Text as="p" variant="bodySm" fontWeight="bold">WEEKLY</Text>
                   </div>
                 </div>

                 <div style={{ marginTop: '24px' }}>
                    <button 
                      onClick={() => navigate("/app/billing")}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #c9cccf',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}>
                      <Icon source={CartIcon} />
                      Manage Billing
                    </button>
                 </div>
              </div>

              {/* QUICK NAVIGATION */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e3e5', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f4f6f8' }}>
                    <Text as="h2" variant="headingSm" fontWeight="bold">Quick Navigation</Text>
                 </div>
                 
                 <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #f4f6f8' }} onClick={() => navigate('/app/issues')}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ background: '#f0f4f8', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c6ecb' }}>
                             <Icon source={SearchIcon} />
                          </div>
                          <div>
                             <Text as="p" variant="bodySm" fontWeight="semibold">View All Product Issues</Text>
                             <Text as="p" variant="bodySm" tone="subdued">See all detected issues across your store</Text>
                          </div>
                       </div>
                       <Icon source={ChevronRightIcon} tone="subdued" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #f4f6f8' }} onClick={() => navigate('/app/scans')}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ background: '#f0f4f8', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c6ecb' }}>
                             <Icon source={ClockIcon} />
                          </div>
                          <div>
                             <Text as="p" variant="bodySm" fontWeight="semibold">Scan History & Logs</Text>
                             <Text as="p" variant="bodySm" tone="subdued">Check past scan results and logs</Text>
                          </div>
                       </div>
                       <Icon source={ChevronRightIcon} tone="subdued" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #f4f6f8' }} onClick={() => navigate('/app/settings')}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ background: '#f0f4f8', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c6ecb' }}>
                             <Icon source={SettingsIcon} />
                          </div>
                          <div>
                             <Text as="p" variant="bodySm" fontWeight="semibold">App Settings</Text>
                             <Text as="p" variant="bodySm" tone="subdued">Configure scans and notifications</Text>
                          </div>
                       </div>
                       <Icon source={ChevronRightIcon} tone="subdued" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0' }} onClick={() => navigate('/app/help')}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ background: '#f0f4f8', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c6ecb' }}>
                             <Icon source={ChatIcon} />
                          </div>
                          <div>
                             <Text as="p" variant="bodySm" fontWeight="semibold">Help & Support</Text>
                             <Text as="p" variant="bodySm" tone="subdued">Get help and view documentation</Text>
                          </div>
                       </div>
                       <Icon source={ChevronRightIcon} tone="subdued" />
                    </div>
                 </div>
              </div>

            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
