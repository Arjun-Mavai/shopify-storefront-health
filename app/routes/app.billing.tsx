// ============================================================================
// 💳 BILLING & SUBSCRIPTION MANAGEMENT — (`/app/billing`)
// ============================================================================
// Manages Shopify recurring charges via the official billing API.
// Active subscribers see their plan details & invoice history.
// Free-tier users see a clean upgrade comparison table.
// ============================================================================

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
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
  Grid,
  Divider,
  Banner,
  IndexTable,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { MONTHLY_PLAN, ANNUAL_PLAN } from "../billing.constants";
import { StoreRepository } from "../repositories/store.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const store = await StoreRepository.getOrCreateStore(session.shop);

  const isTestMode = process.env.SHOPIFY_BILLING_TEST_MODE !== "false";

  const billingCheck = await billing.check({
    plans: [MONTHLY_PLAN, ANNUAL_PLAN],
    isTest: isTestMode,
  });

  const hasActivePayment = billingCheck.hasActivePayment;
  const activeSubscription = hasActivePayment ? billingCheck.appSubscriptions[0] : null;
  const activePlanName = activeSubscription ? activeSubscription.name : "FREE";

  // Sync local subscription state with the live Shopify billing status
  if (hasActivePayment && activeSubscription) {
    const planKey = activePlanName === ANNUAL_PLAN ? "ENTERPRISE" : "PRO";
    const amount = activePlanName === ANNUAL_PLAN ? 99.0 : 9.99;
    await StoreRepository.updateSubscription(store.id, planKey, activeSubscription.id, {
      amount,
      planName: activePlanName,
    });
  } else if (!hasActivePayment && store.subscription?.plan !== "FREE") {
    await StoreRepository.updateSubscription(store.id, "FREE");
  }

  const paymentLogs = await StoreRepository.getPaymentLogs(store.id);

  return json({
    shop: session.shop,
    store,
    subscription: store.subscription,
    activeSubscription,
    hasActivePayment,
    activePlanName,
    paymentLogs,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planIntent = formData.get("plan") as string;
  const actionType = formData.get("actionType") as string;

  const store = await StoreRepository.getOrCreateStore(session.shop);
  const isTestMode = process.env.SHOPIFY_BILLING_TEST_MODE !== "false";

  if (actionType === "cancel") {
    const billingCheck = await billing.check({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: isTestMode,
    });

    if (billingCheck.hasActivePayment) {
      await billing.cancel({
        subscriptionId: billingCheck.appSubscriptions[0].id,
        isTest: isTestMode,
        prorate: true,
      });
    }

    await StoreRepository.updateSubscription(store.id, "FREE");
    return json({ success: true, cancelled: true });
  }

  const targetPlan = planIntent === "ENTERPRISE" ? ANNUAL_PLAN : MONTHLY_PLAN;
  const returnUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`;

  try {
    return await billing.request({
      plan: targetPlan,
      isTest: isTestMode,
      returnUrl,
    });
  } catch (error: any) {
    console.error("🔥 BILLING ERROR:", error.message);
    if (error.errorData) {
      console.error("🔥 BILLING ERROR DATA:", JSON.stringify(error.errorData, null, 2));
    }
    throw error;
  }
};

// ─── Helper: plan comparison data ──────────────────────────────────────────
const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "/ month",
    features: [
      "10 audit scans per month",
      "Up to 50 products checked",
      "8 defect rule checks",
      "Email scan reports",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    key: "PRO",
    name: "Growth Pro",
    price: "$9.99",
    period: "/ month",
    features: [
      "1,000 audit scans per month",
      "Full product catalog (250+ products)",
      "All 8 defect rules",
      "Priority email support",
      "Automated weekly reports",
    ],
    cta: "Upgrade to Growth Pro",
    highlight: true,
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "$99",
    period: "/ year",
    savings: "Save 17% vs monthly",
    features: [
      "10,000 audit scans per year",
      "Unlimited product catalog",
      "All 8 defect rules",
      "Dedicated support",
      "Custom webhook automation",
      "Real-time defect alerts",
    ],
    cta: "Upgrade to Enterprise",
    highlight: false,
  },
];

export default function BillingPage() {
  const { subscription, activeSubscription, hasActivePayment, activePlanName, paymentLogs } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isProcessing = fetcher.state !== "idle";

  const handleUpgrade = (plan: "PRO" | "ENTERPRISE") => {
    fetcher.submit({ plan, actionType: "subscribe" }, { method: "POST" });
  };

  const handleCancel = () => {
    fetcher.submit({ actionType: "cancel" }, { method: "POST" });
  };

  // What plan is currently active?
  const activePlanKey = hasActivePayment
    ? activePlanName === ANNUAL_PLAN
      ? "ENTERPRISE"
      : "PRO"
    : "FREE";

  return (
    <Page
      fullWidth
      backAction={{ content: "Dashboard", url: "/app" }}
      title="Plan & Billing"
      subtitle="Manage your subscription and view your billing history"
    >
      <BlockStack gap="600">

        {/* ─── Active subscription confirmation banner ─── */}
        {hasActivePayment && (
          <Banner tone="success" title="Your subscription is active">
            <p>
              You are currently on the <strong>{activePlanName}</strong> plan. Your current
              billing period ends on{" "}
              <strong>
                {activeSubscription?.currentPeriodEnd
                  ? new Date(activeSubscription.currentPeriodEnd).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </strong>
              . Shopify manages all renewals automatically.
            </p>
          </Banner>
        )}

        {!hasActivePayment && (
          <Banner tone="info" title="You are on the Free plan">
            <p>
              Upgrade to Growth Pro or Enterprise to unlock more audit scans, full catalog
              coverage, and automated weekly reports.
            </p>
          </Banner>
        )}

        <Layout>

          {/* ─── Plan Cards ─────────────────────────────── */}
          <Layout.Section>
            <Grid>
              {PLANS.map((plan) => {
                const isCurrentPlan = plan.key === activePlanKey;
                const isHighlighted = plan.highlight && !hasActivePayment;

                return (
                  <Grid.Cell
                    key={plan.key}
                    columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}
                  >
                    <Card>
                      <BlockStack gap="500">
                        {/* Plan header */}
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h2" variant="headingLg" fontWeight="bold">
                            {plan.name}
                          </Text>
                          {isCurrentPlan && (
                            <Badge tone="success">Current plan</Badge>
                          )}
                          {isHighlighted && (
                            <Badge tone="info">Most popular</Badge>
                          )}
                        </InlineStack>

                        {/* Pricing */}
                        <BlockStack gap="100">
                          <InlineStack gap="100" blockAlign="baseline">
                            <Text as="p" variant="heading3xl" fontWeight="bold">
                              {plan.price}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {plan.period}
                            </Text>
                          </InlineStack>
                          {plan.savings && (
                            <Badge tone="success">{plan.savings}</Badge>
                          )}
                        </BlockStack>

                        <Divider />

                        {/* Feature list */}
                        <BlockStack gap="200">
                          {plan.features.map((feature) => (
                            <InlineStack key={feature} gap="200" blockAlign="center">
                              <Text as="span" tone="success">✓</Text>
                              <Text as="p" variant="bodyMd">{feature}</Text>
                            </InlineStack>
                          ))}
                        </BlockStack>

                        {/* CTA */}
                        <Box paddingBlockStart="200">
                          {isCurrentPlan && plan.key !== "FREE" ? (
                            <BlockStack gap="200">
                              <Button disabled fullWidth>
                                Active plan
                              </Button>
                              <Button
                                fullWidth
                                tone="critical"
                                loading={isProcessing}
                                onClick={handleCancel}
                              >
                                Cancel subscription
                              </Button>
                            </BlockStack>
                          ) : isCurrentPlan && plan.key === "FREE" ? (
                            <Button disabled fullWidth>
                              Active plan
                            </Button>
                          ) : plan.key === "FREE" ? (
                            <Button disabled fullWidth>
                              Free tier
                            </Button>
                          ) : plan.key === "PRO" ? (
                            <Button
                              variant="primary"
                              fullWidth
                              loading={isProcessing}
                              onClick={() => handleUpgrade("PRO")}
                            >
                              {plan.cta}
                            </Button>
                          ) : (
                            <Button
                              fullWidth
                              loading={isProcessing}
                              onClick={() => handleUpgrade("ENTERPRISE")}
                            >
                              {plan.cta}
                            </Button>
                          )}
                        </Box>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                );
              })}
            </Grid>
          </Layout.Section>

          {/* ─── Invoice History ─────────────────────────── */}
          <Layout.Section>
            <Card padding="0">
              <Box padding="400">
                <BlockStack gap="050">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Billing History
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    All charges are processed and managed by Shopify. Invoices are generated automatically on each billing cycle.
                  </Text>
                </BlockStack>
              </Box>

              <Divider />

              {paymentLogs.length === 0 ? (
                <Box padding="600">
                  <EmptyState
                    heading="No billing history yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      Your invoice history will appear here once you subscribe to a paid plan.
                    </p>
                  </EmptyState>
                </Box>
              ) : (
                <IndexTable
                  resourceName={{ singular: "invoice", plural: "invoices" }}
                  itemCount={paymentLogs.length}
                  headings={[
                    { title: "Plan" },
                    { title: "Amount" },
                    { title: "Status" },
                    { title: "Billing Period Start" },
                    { title: "Billing Period End" },
                    { title: "Charge Reference" },
                  ]}
                  selectable={false}
                >
                  {paymentLogs.map((log: any, index: number) => {
                    const {
                      id,
                      shopifyChargeId,
                      planName,
                      amount,
                      currency,
                      status,
                      periodStart,
                      periodEnd,
                    } = log;

                    return (
                      <IndexTable.Row id={id} key={id} position={index}>
                        <IndexTable.Cell>
                          <Text variant="bodyMd" fontWeight="semibold" as="span">
                            {planName}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {`$${Number(amount || 0).toFixed(2)} ${currency || "USD"}`}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Badge tone={status === "ACTIVE" ? "success" : "info"}>
                            {status === "ACTIVE" ? "Active" : status}
                          </Badge>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {periodStart
                            ? new Date(periodStart).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {periodEnd
                            ? new Date(periodEnd).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {shopifyChargeId
                              ? shopifyChargeId.replace("gid://shopify/AppSubscription/", "#")
                              : "—"}
                          </Text>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    );
                  })}
                </IndexTable>
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
