// ============================================================================
// 📱 SHOP HEALTH EMBEDDED MAIN LAYOUT FRAME
// ============================================================================
// Integrates AppBridge AppProvider and NavMenu sidebar links for all 6 app sections.
// ============================================================================

import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      {/* 🧭 Shopify App Bridge Navigation Menu Sidebar */}
      <NavMenu>
        <Link to="/app" rel="home">Home</Link>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/issues">Issues</Link>
        <Link to="/app/scans">Scan History</Link>
        <Link to="/app/features">Features</Link>
        <Link to="/app/billing">Billing</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/help">Help</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
