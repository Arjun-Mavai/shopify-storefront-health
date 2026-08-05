// Database Client setup - Connects to Live Turso LibSQL database via Prisma Adapter

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const tursoUrl = (process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL !== "undefined") 
  ? process.env.TURSO_DATABASE_URL 
  : "libsql://shopify-learning-arjun-gurjar.aws-ap-south-1.turso.io";
const tursoToken = process.env.TURSO_AUTH_TOKEN || "";

const libsql = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

const adapter = new PrismaLibSql(libsql);

// Force re-instantiation to pick up latest generated schema definitions
const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
