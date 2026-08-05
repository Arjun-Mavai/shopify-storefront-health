// ============================================================================
// 🔍 SCAN & ISSUE REPOSITORY (Data Access Layer)
// ============================================================================
// Responsible for direct Prisma queries related to Scans and Issues.
// ============================================================================

import prisma from "../db.server";

export interface CreateScanInput {
  storeId: string;
  healthScore: number;
  totalProductsChecked: number;
  totalIssuesFound: number;
  scanType: "MANUAL" | "SCHEDULED" | "WEBHOOK";
  issues: Array<{
    productId: string;
    productTitle: string;
    issueType: string;
    severity: string;
    message: string;
  }>;
}

export class ScanRepository {
  /**
   * Saves a full Scan execution record along with all associated Issues in a single transaction.
   */
  static async saveScanResult(input: CreateScanInput) {
    const scan = await prisma.scan.create({
      data: {
        storeId: input.storeId,
        healthScore: input.healthScore,
        totalProductsChecked: input.totalProductsChecked,
        totalIssuesFound: input.totalIssuesFound,
        scanType: input.scanType,
        status: "COMPLETED",
        issues: {
          create: input.issues.map((i) => ({
            productId: i.productId,
            productTitle: i.productTitle,
            issueType: i.issueType,
            severity: i.severity,
            message: i.message,
          })),
        },
      },
      include: {
        issues: true,
      },
    });

    // Increment subscription monthly scan usage
    await prisma.subscription.update({
      where: { storeId: input.storeId },
      data: {
        scansUsedThisMonth: {
          increment: 1,
        },
      },
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        storeId: input.storeId,
        action: "SCAN_COMPLETED",
        description: `Audit Scan completed with Health Score ${input.healthScore}% (${input.totalIssuesFound} issues detected)`,
      },
    });

    return scan;
  }

  /**
   * Retrieves the latest scan for a given store.
   */
  static async getLatestScan(storeId: string) {
    return prisma.scan.findFirst({
      where: { storeId },
      orderBy: { scannedAt: "desc" },
      include: {
        issues: true,
      },
    });
  }

  /**
   * Retrieves scan history for a given store.
   */
  static async getScanHistory(storeId: string, limit = 10) {
    return prisma.scan.findMany({
      where: { storeId },
      orderBy: { scannedAt: "desc" },
      take: limit,
      include: {
        issues: true,
      },
    });
  }

  /**
   * Retrieves all issues for a given store with optional filters.
   */
  static async getStoreIssues(storeId: string, status = "OPEN") {
    const latestScan = await this.getLatestScan(storeId);
    if (!latestScan) return [];

    return prisma.issue.findMany({
      where: {
        scanId: latestScan.id,
        status,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
