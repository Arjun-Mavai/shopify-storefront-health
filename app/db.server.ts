// Database Client setup - Connects to Live Turso LibSQL database via Prisma Adapter

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL || "libsql://shopify-learning-arjun-gurjar.aws-ap-south-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODU5MTkyOTEsImlkIjoiMDE5ZmQxMTUtYTYwMS03ZTU1LWJhYmEtNTA1MzI1ZTkzOGJlIiwia2lkIjoieXoydV9sS0g4U2NxdXlEZ3ZMUVBvcngtdjdYWUtoT2FkTjBYanVJU2llTSIsInJpZCI6IjM1N2E4YmRlLTg5MTktNGU0Zi1hNjkyLWVkZGQ3NjYwYWQxMiJ9.QW9xeHkR8blWNEqaQie1J1Q_Ob0i7f_4vMKedZZHHY6OhyWyMnvBp_7IcSy-zKFLX-q_W1r6T3vEXTWME0-eBg",
});

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
