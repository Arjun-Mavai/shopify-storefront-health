// ============================================================================
// 🏬 STORE & BILLING REPOSITORY (Data Access Layer)
// ============================================================================
// Direct Prisma queries for Store, Settings, Subscriptions, PaymentLogs, Activity.
// Handles subscription lifecycles, billing dates, and financial invoice logs!
// ============================================================================

import prisma from "../db.server";
import { EmailService } from "../services/email.server";

export class StoreRepository {
  /**
   * Ensures a Store record exists for the given myshopify domain.
   * Also creates default Settings & Subscription if creating for the first time!
   */
  static async getOrCreateStore(shop: string, email?: string, name?: string) {
    let store = await prisma.store.findUnique({
      where: { shop },
      include: {
        settings: true,
        subscription: true,
      },
    });

    if (!store) {
      store = await prisma.store.create({
        data: {
          shop,
          name: name || shop.split(".")[0],
          email: email || `admin@${shop}`,
          settings: {
            create: {
              autoScanEnabled: true,
              scanFrequency: "WEEKLY",
              minHealthScore: 70,
              alertEmail: email || `admin@${shop}`,
            },
          },
          subscription: {
            create: {
              plan: "FREE",
              status: "ACTIVE",
              monthlyScanLimit: 10,
              scansUsedThisMonth: 0,
            },
          },
          activities: {
            create: {
              action: "STORE_INSTALLED",
              description: `Store ${shop} onboarded into Shop Health SaaS!`,
            },
          },
        },
        include: {
          settings: true,
          subscription: true,
        },
      });
    }

    return store;
  }

  /**
   * Syncs official Store Name, Email, and Currency directly from Shopify GraphQL Admin API!
   */
  static async syncStoreInfoFromShopify(admin: any, shop: string) {
    const store = await this.getOrCreateStore(shop);

    try {
      const response = await admin.graphql(`
        #graphql
        query getShopDetails {
          shop {
            name
            email
            contactEmail
            currencyCode
          }
        }
      `);

      const json = await response.json();
      const shopData = json?.data?.shop;

      if (shopData) {
        const fetchedEmail = shopData.contactEmail || shopData.email || store.email;
        const fetchedName = shopData.name || store.name;
        const fetchedCurrency = shopData.currencyCode || store.currency;

        const updatedStore = await prisma.store.update({
          where: { id: store.id },
          data: {
            name: fetchedName,
            email: fetchedEmail,
            currency: fetchedCurrency,
            settings: {
              update: {
                alertEmail: store.settings?.alertEmail || fetchedEmail,
              },
            },
          },
          include: {
            settings: true,
            subscription: true,
          },
        });

        return updatedStore;
      }
    } catch (err) {
      console.error("Failed to sync shop details from GraphQL:", err);
    }

    return store;
  }

  /**
   * Updates store settings preferences.
   */
  static async updateSettings(
    storeId: string,
    data: { autoScanEnabled?: boolean; scanFrequency?: string; minHealthScore?: number; alertEmail?: string }
  ) {
    return prisma.settings.update({
      where: { storeId },
      data,
    });
  }

  /**
   * Updates store subscription plan with precise Start & End dates, scan limits, PaymentLog entry, and Resend Transactional Email.
   */
  static async updateSubscription(
    storeId: string,
    plan: "FREE" | "PRO" | "ENTERPRISE",
    shopifyChargeId?: string,
    billingDetails?: { amount: number; planName: string }
  ) {
    const limits = {
      FREE: 10,
      PRO: 1000,
      ENTERPRISE: 10000,
    };

    const now = new Date();
    const periodEnd = new Date(now);

    if (plan === "PRO") {
      periodEnd.setDate(periodEnd.getDate() + 30); // 30 days monthly billing
    } else if (plan === "ENTERPRISE") {
      periodEnd.setDate(periodEnd.getDate() + 365); // 365 days annual billing
    }

    // Fetch store email for sending transactional emails
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    const targetEmail = store?.email || `admin@${store?.shop}`;

    const updatePayload: any = {
      plan,
      monthlyScanLimit: limits[plan],
      shopifyChargeId: shopifyChargeId || null,
      status: "ACTIVE",
    };

    // 1. Update Subscription record with robust fallback for DMMF cache
    let sub: any;
    try {
      sub = await prisma.subscription.update({
        where: { storeId },
        data: {
          ...updatePayload,
          currentPeriodStart: now,
          currentPeriodEnd: plan === "FREE" ? null : periodEnd,
        },
      });
    } catch (err: any) {
      if (err?.message?.includes("currentPeriodStart")) {
        console.warn("Prisma DMMF cache mismatch for currentPeriodStart - falling back to base fields");
        sub = await prisma.subscription.update({
          where: { storeId },
          data: updatePayload,
        });
      } else {
        throw err;
      }
    }

    // 2. Record Financial Payment Log / Invoice entry if paid plan
    if (billingDetails && (prisma as any).paymentLog) {
      try {
        await (prisma as any).paymentLog.create({
          data: {
            storeId,
            shopifyChargeId: shopifyChargeId || "MANUAL_OR_FREE",
            planName: billingDetails.planName,
            amount: billingDetails.amount,
            currency: "USD",
            status: "ACTIVE",
            billingOn: now,
            periodStart: now,
            periodEnd: periodEnd,
          },
        });
      } catch (err) {
        console.error("PaymentLog creation error:", err);
      }
    }

    // 3. Trigger Resend Transactional Email Notification
    if (plan !== "FREE" && billingDetails) {
      EmailService.sendSubscriptionWelcomeEmail({
        toEmail: targetEmail,
        shopDomain: store?.shop || "yourstore.myshopify.com",
        planName: billingDetails.planName,
        amount: billingDetails.amount,
        periodEnd,
      }).catch((e) => console.error("Email send error:", e));
    } else if (plan === "FREE" && store) {
      EmailService.sendSubscriptionCancelledEmail({
        toEmail: targetEmail,
        shopDomain: store.shop,
      }).catch((e) => console.error("Email send error:", e));
    }

    // 4. Log System Activity
    await prisma.activity.create({
      data: {
        storeId,
        action: plan === "FREE" ? "PLAN_DOWNGRADED" : "PLAN_UPGRADED",
        description: `Subscription plan updated to ${plan} (Scan Limit: ${limits[plan]})`,
      },
    });

    return sub;
  }

  /**
   * Fetches all Payment Logs / Invoices for a store safely.
   */
  static async getPaymentLogs(storeId: string) {
    if (!(prisma as any).paymentLog) {
      return [];
    }

    try {
      return await (prisma as any).paymentLog.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      console.error("Error fetching payment logs:", err);
      return [];
    }
  }

  /**
   * Log an activity record for audit history.
   */
  static async logActivity(storeId: string, action: string, description: string) {
    return prisma.activity.create({
      data: {
        storeId,
        action,
        description,
      },
    });
  }
}
