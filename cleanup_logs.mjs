import prisma from "./app/db.server.js";

async function main() {
  const duplicates = await prisma.paymentLog.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const seenCharges = new Set();
  
  for (const log of duplicates) {
    if (log.shopifyChargeId && seenCharges.has(log.shopifyChargeId)) {
      console.log(`Deleting duplicate log: ${log.id}`);
      await prisma.paymentLog.delete({ where: { id: log.id } });
    } else if (log.shopifyChargeId) {
      seenCharges.add(log.shopifyChargeId);
    }
  }

  // If there are multiple MANUAL_OR_FREE, keep only the latest one
  const manualLogs = duplicates.filter(l => l.shopifyChargeId === "MANUAL_OR_FREE" || l.shopifyChargeId === null);
  if (manualLogs.length > 1) {
    for (let i = 0; i < manualLogs.length - 1; i++) {
       console.log(`Deleting duplicate manual log: ${manualLogs[i].id}`);
       await prisma.paymentLog.delete({ where: { id: manualLogs[i].id } });
    }
  }

  console.log("Cleanup complete!");
}

main().catch(console.error).finally(() => process.exit(0));
