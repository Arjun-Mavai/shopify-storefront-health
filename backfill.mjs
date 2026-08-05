import prisma from "./app/db.server.js";

async function main() {
  const stores = await prisma.store.findMany();
  for (const store of stores) {
    const existingSub = await prisma.subscription.findUnique({
      where: { storeId: store.id },
    });
    if (!existingSub) {
      console.log(`Missing Subscription for store ${store.shop}. Creating...`);
      await prisma.subscription.create({
        data: {
          storeId: store.id,
          plan: "FREE",
          status: "ACTIVE",
          monthlyScanLimit: 10,
          scansUsedThisMonth: 0,
        },
      });
    }
  }
  console.log("Backfill complete!");
}

main().catch(console.error).finally(() => process.exit(0));
