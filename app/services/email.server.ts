// ============================================================================
// 📧 RESEND EMAIL SERVICE (`app/services/email.server.ts`)
// ============================================================================
// Senior Staff Engineer level transactional emails for Shop Health SaaS:
// 1. Subscription Welcome / Plan Upgrade Confirmation Email
// 2. Plan Downgrade / Expiration Notice Email
// 3. Low Health Score Alert Email
// ============================================================================

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "re_test_key";
const resend = new Resend(resendApiKey);

const EMAIL_FROM = process.env.EMAIL_FROM || "Shop Health <onboarding@resend.dev>";

export class EmailService {
  /**
   * 1. Send Plan Upgrade / Subscription Confirmation Email
   */
  static async sendSubscriptionWelcomeEmail({
    toEmail,
    shopDomain,
    planName,
    amount,
    periodEnd,
  }: {
    toEmail: string;
    shopDomain: string;
    planName: string;
    amount: number;
    periodEnd?: Date | string | null;
  }) {
    const formattedEnd = periodEnd ? new Date(periodEnd).toLocaleDateString() : "Next Month";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .header { text-align: center; margin-bottom: 30px; }
        .badge { background: #059669; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block; }
        .title { color: #ffffff; font-size: 24px; margin-top: 15px; font-weight: 700; }
        .content { color: #94a3b8; font-size: 16px; line-height: 1.6; }
        .plan-box { background: #1e293b; border: 1px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 25px 0; }
        .plan-box table { width: 100%; border-collapse: collapse; }
        .plan-box td { padding: 8px 0; color: #cbd5e1; font-size: 15px; }
        .plan-box td.bold { font-weight: bold; color: #ffffff; text-align: right; }
        .btn { display: block; width: 100%; text-align: center; background: #2563eb; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 0; border-radius: 8px; font-size: 16px; margin-top: 30px; }
        .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">PRO SUBSCRIPTION ACTIVE 🚀</span>
          <h1 class="title">Thank You For Upgrading Shop Health!</h1>
        </div>
        
        <div class="content">
          <p>Great news! Store <strong>${shopDomain}</strong> is now officially upgraded to <strong>${planName}</strong>!</p>
          <p>Your store now unlocks priority GraphQL product audit scanning, automated defect detection, and instant webhook rescans.</p>
        </div>

        <div class="plan-box">
          <table>
            <tr>
              <td>Plan Tier:</td>
              <td class="bold">${planName}</td>
            </tr>
            <tr>
              <td>Billing Amount:</td>
              <td class="bold">$${amount.toFixed(2)} USD</td>
            </tr>
            <tr>
              <td>Renewal Date:</td>
              <td class="bold">${formattedEnd}</td>
            </tr>
            <tr>
              <td>Audit Limits:</td>
              <td class="bold">1,000 Scans / Month</td>
            </tr>
          </table>
        </div>

        <a href="https://${shopDomain}/admin/apps" class="btn">Open Shop Health Dashboard</a>

        <div class="footer">
          <p>© 2026 Shop Health SaaS Auditor. All rights reserved.<br>Official Shopify Partner SaaS Application.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      if (!resendApiKey || resendApiKey.startsWith("re_test")) {
        console.log(`[TEST EMAIL MODE] Subscription welcome email rendered for ${toEmail} (${shopDomain})`);
        return { success: true, testMode: true };
      }

      const response = await resend.emails.send({
        from: EMAIL_FROM,
        to: [toEmail],
        subject: `🎉 Subscription Active: Welcome to Shop Health ${planName}!`,
        html: htmlContent,
      });

      return { success: true, response };
    } catch (err) {
      console.error("Resend Email Error:", err);
      return { success: false, error: err };
    }
  }

  /**
   * 2. Send Subscription Expired / Plan Downgraded Email
   */
  static async sendSubscriptionCancelledEmail({
    toEmail,
    shopDomain,
  }: {
    toEmail: string;
    shopDomain: string;
  }) {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #dc2626; border-radius: 16px; padding: 40px; }
        .title { color: #ef4444; font-size: 22px; font-weight: bold; }
        .content { color: #cbd5e1; font-size: 15px; line-height: 1.6; }
        .btn { display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 class="title">Notice: Shop Health Subscription Plan Changed</h1>
        <div class="content">
          <p>Your subscription for store <strong>${shopDomain}</strong> has been cancelled or transitioned back to the <strong>Starter Free Plan</strong>.</p>
          <p>Your store limit is now set to 10 audit scans per month. You can reactivate your Growth Pro plan anytime from your Shopify app dashboard.</p>
        </div>
        <a href="https://${shopDomain}/admin/apps" class="btn">Reactivate Subscription</a>
      </div>
    </body>
    </html>
    `;

    try {
      if (!resendApiKey || resendApiKey.startsWith("re_test")) {
        console.log(`[TEST EMAIL MODE] Subscription cancellation email rendered for ${toEmail}`);
        return { success: true, testMode: true };
      }

      const response = await resend.emails.send({
        from: EMAIL_FROM,
        to: [toEmail],
        subject: `⚠️ Notice: Shop Health Subscription Plan Downgraded`,
        html: htmlContent,
      });

      return { success: true, response };
    } catch (err) {
      console.error("Resend Email Error:", err);
      return { success: false, error: err };
    }
  }

  /**
   * 3. Send Critical Health Alert Email (When Health Score Drops Below Threshold)
   */
  static async sendHealthAlertEmail({
    toEmail,
    shopDomain,
    healthScore,
    totalIssues,
  }: {
    toEmail: string;
    shopDomain: string;
    healthScore: number;
    totalIssues: number;
  }) {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #f59e0b; border-radius: 16px; padding: 40px; }
        .score { font-size: 48px; font-weight: 800; color: #f59e0b; text-align: center; margin: 10px 0; }
        .content { color: #cbd5e1; font-size: 15px; line-height: 1.6; }
        .btn { display: block; width: 100%; text-align: center; background: #f59e0b; color: #000000; padding: 14px 0; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2 style="color: #ffffff; text-align: center;">🚨 Health Score Alert Triggered!</h2>
        <div class="score">${healthScore}%</div>
        <div class="content">
          <p>Store <strong>${shopDomain}</strong> health score dropped below alert threshold with <strong>${totalIssues} product defects</strong> detected in the latest audit.</p>
        </div>
        <a href="https://${shopDomain}/admin/apps" class="btn">View & Fix Product Defects</a>
      </div>
    </body>
    </html>
    `;

    try {
      if (!resendApiKey || resendApiKey.startsWith("re_test")) {
        console.log(`[TEST EMAIL MODE] Health alert email rendered for ${toEmail} (Score: ${healthScore}%)`);
        return { success: true, testMode: true };
      }

      const response = await resend.emails.send({
        from: EMAIL_FROM,
        to: [toEmail],
        subject: `🚨 Alert: ${shopDomain} Store Health Score Dropped to ${healthScore}%`,
        html: htmlContent,
      });

      return { success: true, response };
    } catch (err) {
      console.error("Resend Email Error:", err);
      return { success: false, error: err };
    }
  }
}
