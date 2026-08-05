import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({ url, authToken });

  try {
    console.log("Dropping PaymentLog table...");
    await client.execute(`DROP TABLE IF EXISTS "PaymentLog";`);
    
    console.log("Recreating PaymentLog table...");
    await client.execute(`
      CREATE TABLE "PaymentLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "storeId" TEXT NOT NULL,
          "shopifyChargeId" TEXT,
          "planName" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "status" TEXT NOT NULL,
          "billingOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "periodStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "periodEnd" DATETIME NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PaymentLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  }
}

main();
