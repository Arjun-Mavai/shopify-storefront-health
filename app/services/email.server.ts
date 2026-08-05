// ============================================================================
// 📧 RESEND EMAIL SERVICE (`app/services/email.server.ts`)
// ============================================================================
// Senior Staff Engineer level transactional emails for Storefront Health SaaS:
// 1. Subscription Welcome / Plan Upgrade Confirmation Email
// 2. Plan Downgrade / Expiration Notice Email
// 3. Low Health Score Alert Email
// ============================================================================

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "re_test_key";
const resend = new Resend(resendApiKey);

const getEmailFrom = () => process.env.EMAIL_FROM || "Storefront Health <mppsc@zenscroll.app>";

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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f8; color: #202223; margin: 0; padding: 40px 20px; }
        .card { max-width: 700px; margin: 0 auto; background: #ffffff; border: 1px solid #e1e3e5; border-radius: 20px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); text-align: center; }
        .badge { background: #f4f1ff; color: #6338f0; padding: 8px 16px; border-radius: 20px; font-weight: 800; font-size: 12px; display: inline-block; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 20px; }
        .title { color: #000000; font-size: 32px; margin-top: 0px; margin-bottom: 16px; font-weight: 800; }
        .title span { color: #2c6ecb; }
        .content { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 40px; }
        .content strong { color: #0f172a; }
        
        .metrics-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 30px; overflow: hidden; }
        .metrics-table td { padding: 24px 12px; text-align: center; border-right: 1px solid #e2e8f0; width: 25%; }
        .metrics-table td:last-child { border-right: none; }
        .metric-title { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }
        .metric-value { font-size: 16px; color: #0f172a; font-weight: 700; }
        
        .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: #3b82f6; color: #ffffff; font-weight: bold; text-decoration: none; padding: 18px 0; border-radius: 12px; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 13px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">👑 PRO SUBSCRIPTION ACTIVE 🚀</div>
        
        <h1 class="title">Thank You For Upgrading <span>Storefront Health!</span></h1>
        
        <div class="content">
          <p>Great news! Store <strong>${shopDomain}</strong> is now officially upgraded to <strong>${planName}</strong>!</p>
          <p>Your store now unlocks priority GraphQL product audit scanning, automated defect detection, and instant webhook rescans.</p>
        </div>

        <table class="metrics-table">
          <tr>
            <td>
              <div class="metric-title">Plan Tier</div>
              <div class="metric-value">${planName}</div>
            </td>
            <td>
              <div class="metric-title">Billing Amount</div>
              <div class="metric-value">$${amount.toFixed(2)} USD</div>
            </td>
            <td>
              <div class="metric-title">Renewal Date</div>
              <div class="metric-value">${formattedEnd}</div>
            </td>
            <td>
              <div class="metric-title">Audit Limits</div>
              <div class="metric-value">1,000 Scans / Month</div>
            </td>
          </tr>
        </table>

        <a href="https://${shopDomain}/admin/apps" class="btn">Open Storefront Health Dashboard &rarr;</a>

        <div class="footer">
          <p>© 2026 Storefront Health SaaS Auditor. All rights reserved.<br>Official Shopify Partner SaaS Application.</p>
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
        from: getEmailFrom(),
        to: [toEmail],
        subject: `🎉 Subscription Active: Welcome to Storefront Health ${planName}!`,
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f8; color: #202223; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #fee2e2; border-radius: 20px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); text-align: center; }
        .badge { background: #fef2f2; color: #dc2626; padding: 8px 16px; border-radius: 20px; font-weight: 800; font-size: 12px; display: inline-block; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 20px; }
        .title { color: #000000; font-size: 28px; margin-top: 0px; margin-bottom: 16px; font-weight: 800; }
        .content { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 40px; }
        .content strong { color: #0f172a; }
        
        .metrics-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #fee2e2; border-radius: 12px; margin-bottom: 30px; overflow: hidden; background: #fef2f2; }
        .metrics-table td { padding: 24px 12px; text-align: center; border-right: 1px solid #fecaca; width: 50%; }
        .metrics-table td:last-child { border-right: none; }
        .metric-title { font-size: 12px; color: #dc2626; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }
        .metric-value { font-size: 18px; color: #991b1b; font-weight: 700; }
        
        .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: #dc2626; color: #ffffff; font-weight: bold; text-decoration: none; padding: 18px 0; border-radius: 12px; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 13px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">⚠️ PLAN DOWNGRADED</div>
        
        <h1 class="title">Notice: Storefront Health Subscription Plan Changed</h1>
        
        <div class="content">
          <p>Your subscription for store <strong>${shopDomain}</strong> has been cancelled or transitioned back to the <strong>Starter Free Plan</strong>.</p>
          <p>You can reactivate your Growth Pro plan anytime from your Shopify app dashboard to regain unlimited scanning.</p>
        </div>

        <table class="metrics-table">
          <tr>
            <td>
              <div class="metric-title">New Plan Tier</div>
              <div class="metric-value">Starter Free</div>
            </td>
            <td>
              <div class="metric-title">New Audit Limit</div>
              <div class="metric-value">10 Scans / Month</div>
            </td>
          </tr>
        </table>

        <a href="https://${shopDomain}/admin/apps" class="btn">Reactivate Subscription &rarr;</a>

        <div class="footer">
          <p>© 2026 Storefront Health SaaS Auditor. All rights reserved.<br>Official Shopify Partner SaaS Application.</p>
        </div>
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
        from: getEmailFrom(),
        to: [toEmail],
        subject: `⚠️ Notice: Storefront Health Subscription Plan Downgraded`,
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f8; color: #202223; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #fef3c7; border-radius: 20px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); text-align: center; }
        .badge { background: #fffbeb; color: #d97706; padding: 8px 16px; border-radius: 20px; font-weight: 800; font-size: 12px; display: inline-block; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 20px; }
        .title { color: #000000; font-size: 28px; margin-top: 0px; margin-bottom: 16px; font-weight: 800; }
        .content { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 40px; }
        .content strong { color: #0f172a; }
        
        .metrics-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #fef3c7; border-radius: 12px; margin-bottom: 30px; overflow: hidden; background: #fffbeb; }
        .metrics-table td { padding: 32px 12px; text-align: center; border-right: 1px solid #fde68a; width: 50%; }
        .metrics-table td:last-child { border-right: none; }
        .metric-title { font-size: 12px; color: #d97706; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }
        .metric-value { font-size: 42px; color: #b45309; font-weight: 800; }
        
        .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: #f59e0b; color: #ffffff; font-weight: bold; text-decoration: none; padding: 18px 0; border-radius: 12px; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 13px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">🚨 HEALTH SCORE ALERT</div>
        
        <h1 class="title">Critical Health Threshold Reached</h1>
        
        <div class="content">
          <p>Store <strong>${shopDomain}</strong> health score dropped below your configured alert threshold. Active product defects were detected in the latest audit.</p>
        </div>

        <table class="metrics-table">
          <tr>
            <td>
              <div class="metric-title">Current Health Score</div>
              <div class="metric-value">${healthScore}%</div>
            </td>
            <td>
              <div class="metric-title">Active Defects</div>
              <div class="metric-value">${totalIssues}</div>
            </td>
          </tr>
        </table>

        <a href="https://${shopDomain}/admin/apps" class="btn">View & Fix Product Defects &rarr;</a>

        <div class="footer">
          <p>© 2026 Storefront Health SaaS Auditor. All rights reserved.<br>Official Shopify Partner SaaS Application.</p>
        </div>
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
        from: getEmailFrom(),
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

