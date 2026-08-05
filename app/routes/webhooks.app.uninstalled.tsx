import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Mark store status as UNINSTALLED in Store table and log activity
  const existingStore = await db.store.findUnique({ where: { shop } });
  if (existingStore) {
    await db.store.update({
      where: { shop },
      data: { status: "UNINSTALLED" },
    });

    await db.activity.create({
      data: {
        storeId: existingStore.id,
        action: "APP_UNINSTALLED",
        description: `App uninstalled by merchant for ${shop}`,
      },
    });
  }

  return new Response();
};
