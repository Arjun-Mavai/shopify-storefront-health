// ============================================================================
// ⚙️ SETTINGS ROUTE (`/app/settings`)
// ============================================================================
// Store level preferences, auto-scan frequencies, alert email thresholds.
// ============================================================================

import { useEffect, useState } from "react";
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
  FormLayout,
  TextField,
  Checkbox,
  Select,
  Divider,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { StoreRepository } from "../repositories/store.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await StoreRepository.getOrCreateStore(session.shop);

  return json({
    settings: store.settings,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const store = await StoreRepository.getOrCreateStore(session.shop);
  const autoScanEnabled = formData.get("autoScanEnabled") === "true";
  const scanFrequency = formData.get("scanFrequency") as string;
  const minHealthScore = parseInt(formData.get("minHealthScore") as string || "70", 10);
  const alertEmail = formData.get("alertEmail") as string;

  const updatedSettings = await StoreRepository.updateSettings(store.id, {
    autoScanEnabled,
    scanFrequency,
    minHealthScore,
    alertEmail,
  });

  return json({ success: true, updatedSettings });
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [autoScanEnabled, setAutoScanEnabled] = useState(settings?.autoScanEnabled ?? true);
  const [scanFrequency, setScanFrequency] = useState(settings?.scanFrequency ?? "WEEKLY");
  const [minHealthScore, setMinHealthScore] = useState(String(settings?.minHealthScore ?? 70));
  const [alertEmail, setAlertEmail] = useState(settings?.alertEmail ?? "");

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Store Settings Saved Successfully! ⚙️");
    }
  }, [fetcher.data, shopify]);

  const handleSave = () => {
    fetcher.submit(
      {
        autoScanEnabled: String(autoScanEnabled),
        scanFrequency,
        minHealthScore,
        alertEmail,
      },
      { method: "POST" }
    );
  };

  return (
    <Page
      fullWidth
      backAction={{ content: "Dashboard", url: "/app" }}
      title="App Settings"
      subtitle="Configure automated scan schedules, alert thresholds, and notification preferences"
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Automated Audit Preferences
                </Text>

                <Divider />

                <FormLayout>
                  <Checkbox
                    label="Enable Automatic Periodic Store Scans"
                    checked={autoScanEnabled}
                    onChange={setAutoScanEnabled}
                  />

                  <Select
                    label="Scan Frequency Schedule"
                    options={[
                      { label: "Daily (Pro/Enterprise)", value: "DAILY" },
                      { label: "Weekly (Recommended)", value: "WEEKLY" },
                      { label: "Monthly", value: "MONTHLY" },
                    ]}
                    value={scanFrequency}
                    onChange={setScanFrequency}
                  />

                  <TextField
                    label="Minimum Health Score Alert Threshold (%)"
                    type="number"
                    value={minHealthScore}
                    onChange={setMinHealthScore}
                    autoComplete="off"
                    helpText="If health score falls below this number, an alert email will be triggered."
                  />

                  <TextField
                    label="Notification Email Address"
                    type="email"
                    value={alertEmail}
                    onChange={setAlertEmail}
                    placeholder="admin@yourstore.com"
                    autoComplete="off"
                    helpText="Email address where critical defect alerts are sent."
                  />

                  <Button variant="primary" loading={isSaving} onClick={handleSave}>
                    Save Settings
                  </Button>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
