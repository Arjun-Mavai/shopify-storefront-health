// ============================================================================
// 🚀 MERCHANT ONBOARDING ROUTE (`/app/onboarding`)
// ============================================================================
// First-time welcome screen shown after installation.
// Clutter-free email input that saves notification preferences.
// ============================================================================

import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { StoreRepository } from "../repositories/store.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const store = await StoreRepository.syncStoreInfoFromShopify(admin, session.shop);

  return json({
    shop: session.shop,
    store,
    prefilledEmail: store.email || store.settings?.alertEmail || `admin@${session.shop}`,
    storeName: store.name || session.shop.split(".")[0],
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await StoreRepository.getOrCreateStore(session.shop);
  const formData = await request.formData();

  const alertEmail = formData.get("alertEmail") as string;

  if (alertEmail) {
    await StoreRepository.updateSettings(store.id, {
      alertEmail,
      autoScanEnabled: true,
    });
  }

  await StoreRepository.logActivity(
    store.id,
    "ONBOARDING_COMPLETED",
    `Merchant completed onboarding setup with alert email: ${alertEmail}`
  );

  return redirect("/app");
};

export default function MerchantOnboardingPage() {
  const { storeName, prefilledEmail } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  const [email, setEmail] = useState(prefilledEmail);
  const isSubmitting = fetcher.state !== "idle";

  const handleSaveAndContinue = () => {
    fetcher.submit({ alertEmail: email }, { method: "POST" });
  };

  return (
    <Page fullWidth>
      <Box paddingBlockStart="800" paddingBlockEnd="800">
        <BlockStack gap="600" inlineAlign="center">
          
          <BlockStack gap="200" inlineAlign="center">
            <Text as="h1" variant="heading3xl" fontWeight="bold">
              Welcome to Shop Health, {storeName}! 👋
            </Text>
            <Text as="p" variant="bodyLg" tone="subdued">
              Let's set up your store's automated catalog protection in 1 step.
            </Text>
          </BlockStack>

          <Box width="100%" maxWidth="600px">
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingLg" fontWeight="bold">
                    Where should we send your audit reports?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    We'll email you weekly store health digests and urgent alerts if a critical defect is found.
                  </Text>
                </BlockStack>

                <TextField
                  label="Notification Email Address"
                  type="email"
                  value={email}
                  onChange={(val) => setEmail(val)}
                  autoComplete="email"
                  size="medium"
                />

                <InlineStack align="space-between" blockAlign="center">
                  <Button variant="plain" onClick={() => navigate("/app/features")}>
                    Learn what we check →
                  </Button>
                  <Button
                    size="large"
                    variant="primary"
                    loading={isSubmitting}
                    onClick={handleSaveAndContinue}
                  >
                    Complete Setup & Go to Dashboard
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Box>
        </BlockStack>
      </Box>
    </Page>
  );
}
