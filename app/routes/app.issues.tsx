// ============================================================================
// 🚨 PRODUCT ISSUES PAGE — (`/app/issues`)
// ============================================================================
// Displays all active catalog defects from the latest audit scan.
// Supports pagination (25 per page), severity filtering, and direct links
// to fix each product in Shopify Admin.
// ============================================================================

import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
  Divider,
  ResourceList,
  ResourceItem,
  ChoiceList,
  Filters,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { StoreRepository } from "../repositories/store.server";
import { ScanRepository } from "../repositories/scan.server";
import { ISSUE_DEF } from "../lib/issue-types";

// Number of issues shown per page
const PAGE_SIZE = 25;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await StoreRepository.getOrCreateStore(session.shop);
  const rawIssues = await ScanRepository.getStoreIssues(store.id);

  const issues = rawIssues.map((issue) => {
    const def = Object.values(ISSUE_DEF).find((d) => d.type === issue.issueType);
    return {
      ...issue,
      category: def?.category ?? "Other",
      label: issue.issueType.replace(/_/g, " "),
    };
  });

  return json({ shop: session.shop, issues });
};

// Map severity to Polaris badge tone
function getSeverityTone(severity: string): "critical" | "warning" | "info" {
  if (severity === "HIGH") return "critical";
  if (severity === "MEDIUM") return "warning";
  return "info";
}

import { useSearchParams } from "@remix-run/react";

export default function IssuesPage() {
  const { shop, issues } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  // ── Severity filter state ────────────────────────────────────────────────
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [queryValue, setQueryValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = issues.filter((item) => {
    const matchesSeverity =
      selectedSeverities.length === 0 || selectedSeverities.includes(item.severity);
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesQuery =
      queryValue === "" ||
      item.productTitle.toLowerCase().includes(queryValue.toLowerCase()) ||
      item.issueType.toLowerCase().includes(queryValue.toLowerCase());
    return matchesSeverity && matchesCategory && matchesQuery;
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFiltersClearAll = () => {
    setSelectedSeverities([]);
    setQueryValue("");
    setCurrentPage(1);
  };

  // Severity breakdown counts for the summary bar
  const highCount = issues.filter((i) => i.severity === "HIGH").length;
  const mediumCount = issues.filter((i) => i.severity === "MEDIUM").length;
  const lowCount = issues.filter((i) => i.severity === "LOW").length;

  return (
    <Page
      fullWidth
      backAction={{ content: "Dashboard", url: "/app" }}
      title="Product Defects & Issues"
      subtitle={`${issues.length} active defect${issues.length !== 1 ? "s" : ""} found across your store catalog — click any issue to fix it directly in Shopify Admin`}
    >
      <BlockStack gap="500">

        {/* ── Severity Summary Bar ─────────────────────────────── */}
        {issues.length > 0 && (
          <Card>
            <InlineStack align="space-around">
              <BlockStack gap="100" inlineAlign="center">
                <Text as="p" variant="heading2xl" tone="critical">{highCount}</Text>
                <Badge tone="critical">HIGH Severity</Badge>
              </BlockStack>
              <BlockStack gap="100" inlineAlign="center">
                <Text as="p" variant="heading2xl">{mediumCount}</Text>
                <Badge tone="warning">MEDIUM Severity</Badge>
              </BlockStack>
              <BlockStack gap="100" inlineAlign="center">
                <Text as="p" variant="heading2xl">{lowCount}</Text>
                <Badge tone="info">LOW Severity</Badge>
              </BlockStack>
              <BlockStack gap="100" inlineAlign="center">
                <Text as="p" variant="heading2xl">{issues.length}</Text>
                <Badge>Total Defects</Badge>
              </BlockStack>
            </InlineStack>
          </Card>
        )}

        <Layout>
          <Layout.Section>
            <Card padding="0">
              {/* ── List Header ─────────────────────────────────── */}
              <Box padding="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="h2" variant="headingLg" fontWeight="bold">
                      Catalog Issues
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Showing results from your most recent audit scan
                    </Text>
                  </BlockStack>
                  <Badge tone={issues.length === 0 ? "success" : "critical"} size="large">
                    {issues.length === 0 ? "No Issues Found" : `${issues.length} Issues Found`}
                  </Badge>
                </InlineStack>
              </Box>

              <Divider />

              {/* ── Empty State ──────────────────────────────────── */}
              {issues.length === 0 ? (
                <EmptyState
                  heading="Your store catalog is perfectly healthy! 🎉"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    No defects were found in your last audit. Run a new scan anytime to recheck your catalog.
                  </p>
                </EmptyState>
              ) : (
                <>
                  {/* ── Filters ───────────────────────────────────── */}
                  <Box padding="300">
                    <Filters
                      queryValue={queryValue}
                      queryPlaceholder="Search by product name or issue type…"
                      filters={[
                        {
                          key: "category",
                          label: "Category",
                          filter: (
                            <ChoiceList
                              title="Category"
                              titleHidden
                              choices={[
                                { label: "All Categories", value: "All" },
                                ...Object.values(ISSUE_DEF).reduce((acc: string[], curr) => {
                                  if (!acc.includes(curr.category)) acc.push(curr.category);
                                  return acc;
                                }, []).map(cat => ({ label: cat, value: cat }))
                              ]}
                              selected={[selectedCategory]}
                              onChange={(v) => { setSelectedCategory(v[0]); setCurrentPage(1); }}
                              allowMultiple={false}
                            />
                          ),
                          shortcut: true,
                        },
                        {
                          key: "severity",
                          label: "Severity",
                          filter: (
                            <ChoiceList
                              title="Severity"
                              titleHidden
                              choices={[
                                { label: "High — Fix Immediately", value: "HIGH" },
                                { label: "Medium — Fix Soon", value: "MEDIUM" },
                                { label: "Low — Nice to Fix", value: "LOW" },
                              ]}
                              selected={selectedSeverities}
                              onChange={(v) => { setSelectedSeverities(v); setCurrentPage(1); }}
                              allowMultiple
                            />
                          ),
                          shortcut: true,
                        },
                      ]}
                      appliedFilters={[
                        ...(selectedCategory !== "All" ? [{
                          key: "category",
                          label: `Category: ${selectedCategory}`,
                          onRemove: () => setSelectedCategory("All"),
                        }] : []),
                        ...selectedSeverities.map((s) => ({
                          key: "severity",
                          label: `Severity: ${s}`,
                          onRemove: () =>
                            setSelectedSeverities((prev) => prev.filter((x) => x !== s)),
                        }))
                      ]}
                      onQueryChange={(v) => { setQueryValue(v); setCurrentPage(1); }}
                      onQueryClear={() => setQueryValue("")}
                      onClearAll={handleFiltersClearAll}
                    />
                  </Box>

                  <Divider />

                  {/* ── Issues Resource List ──────────────────────── */}
                  <ResourceList
                    resourceName={{ singular: "issue", plural: "issues" }}
                    items={paginated}
                    renderItem={(item) => {
                      const cleanId = item.productId.replace("gid://shopify/Product/", "");
                      const editUrl = `https://${shop}/admin/products/${cleanId}`;

                      return (
                        <ResourceItem id={item.id} url={editUrl} external>
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="h3" variant="bodyMd" fontWeight="bold">
                                  {item.productTitle}
                                </Text>
                                <Badge tone={getSeverityTone(item.severity)}>
                                  {item.label}
                                </Badge>
                                <Badge tone={getSeverityTone(item.severity)}>
                                  {item.severity}
                                </Badge>
                              </InlineStack>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {item.message}
                              </Text>
                            </BlockStack>
                            <Button
                              url={editUrl}
                              external
                              target="_blank"
                              variant="secondary"
                            >
                              Fix in Shopify Admin ↗
                            </Button>
                          </InlineStack>
                        </ResourceItem>
                      );
                    }}
                  />

                  {/* ── Pagination Controls ───────────────────────── */}
                  {totalPages > 1 && (
                    <>
                      <Divider />
                      <Box padding="400">
                        <InlineStack align="center" gap="400">
                          <Button
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          >
                            ← Previous
                          </Button>
                          <Text as="p" variant="bodyMd">
                            Page {currentPage} of {totalPages} &nbsp;·&nbsp; Showing {paginated.length} of {filtered.length} issues
                          </Text>
                          <Button
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          >
                            Next →
                          </Button>
                        </InlineStack>
                      </Box>
                    </>
                  )}
                </>
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
