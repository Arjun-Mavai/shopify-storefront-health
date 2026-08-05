// ============================================================================
// ❓ HELP & ARCHITECTURE DOCUMENTATION ROUTE (`/app/help`)
// ============================================================================
// Senior Staff Engineer level explanation of Shop Health Architecture,
// Database Normalization, Webhooks, OAuth, and System Design decisions.
// ============================================================================

import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Box,
  Divider,
} from "@shopify/polaris";

export default function HelpPage() {
  return (
    <Page
      fullWidth
      backAction={{ content: "Dashboard", url: "/app" }}
      title="Help & Architecture Documentation"
      subtitle="How Shop Health works — from GraphQL API audits to database storage and webhook automation"
    >
      <BlockStack gap="500">
        <Layout>
          {/* Section 1: Architectural Philosophy */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  1. Core Architecture Philosophy
                </Text>
                <Divider />
                <Text as="p" variant="bodyMd">
                  <strong>Why we NEVER duplicate Shopify Products in our database:</strong>
                  <br />
                  Shopify is the <em>Single Source of Truth</em> for Products, Orders, Inventory, and Customers. If an app duplicates product records into its own database, it creates data sync issues, high storage overhead, and risks serving stale information to merchants.
                </Text>
                <Text as="p" variant="bodyMd">
                  Instead, Shop Health uses a <strong>Lightweight Audit Intelligence Model</strong>:
                  <br />
                  - <strong>Shopify:</strong> Holds heavy product data (Images, Descriptions, Variants).
                  - <strong>Shop Health Local DB:</strong> Stores only lightweight metadata (Stores, Settings, Subscriptions, Audit Reports, Defect Logs).
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Section 2: Database Schema & Table Explanations */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  2. Normalized Database Tables & Relations
                </Text>
                <Divider />

                <BlockStack gap="300">
                  <Box padding="300" background="bg-surface-active" borderRadius="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      🔑 Session Table (Shopify OAuth Tokens)
                    </Text>
                    <Text as="p" variant="bodySm">
                      Stores <code>accessToken</code> obtained during OAuth handshake. Used by Remix <code>authenticate.admin(request)</code> middleware to execute GraphQL Admin API calls.
                    </Text>
                  </Box>

                  <Box padding="300" background="bg-surface-active" borderRadius="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      🏬 Store Table (Merchant Profile)
                    </Text>
                    <Text as="p" variant="bodySm">
                      Contains myshopify domain, installation status, currency, and primary contact email. Connects to <code>Settings (1-1)</code>, <code>Subscription (1-1)</code>, <code>Scan (1-N)</code>, and <code>Activity (1-N)</code>.
                    </Text>
                  </Box>

                  <Box padding="300" background="bg-surface-active" borderRadius="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      ⚙️ Settings Table (Store Audit Preferences)
                    </Text>
                    <Text as="p" variant="bodySm">
                      Configures auto-scan schedules (DAILY/WEEKLY/MONTHLY) and email alert threshold percentages.
                    </Text>
                  </Box>

                  <Box padding="300" background="bg-surface-active" borderRadius="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      💳 Subscription Table (SaaS Monetization)
                    </Text>
                    <Text as="p" variant="bodySm">
                      Tracks plan tiers (FREE, PRO, ENTERPRISE) and monthly scan limits.
                    </Text>
                  </Box>

                  <Box padding="300" background="bg-surface-active" borderRadius="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      🔍 Scan Table & Issue Table (Audit Engine Records)
                    </Text>
                    <Text as="p" variant="bodySm">
                      Each <code>Scan</code> record captures overall calculated Health Score (0-100%) and relates to 1-to-many <code>Issue</code> rows detailing product defects.
                    </Text>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Section 3: Webhooks & Event Driven Rescans */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  3. Webhook Architecture & Webhook Rescan Flow
                </Text>
                <Divider />

                <Text as="p" variant="bodyMd">
                  Instead of polling Shopify continuously (which causes rate limit bans), Shop Health registers <strong>Webhooks</strong>:
                </Text>
                <Text as="p" variant="bodySm">
                  - <code>app/uninstalled</code>: Triggers cleanup when a merchant removes the app.
                  <br />
                  - <code>products/update</code>: Triggers instantaneous single-product rescan when a merchant edits a product in Shopify Admin.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
