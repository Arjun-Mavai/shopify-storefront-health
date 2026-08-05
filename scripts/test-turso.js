// Bole toh, Turso DB ki live test script! Tapori style, 100% working!
import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

async function testConnection() {
  console.log("🔥 Connecting to Turso Cloud at:", process.env.TURSO_DATABASE_URL);

  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // Test Prisma insert
    const testId = `test-${Date.now()}`;
    const newRecord = await prisma.learningTest.create({
      data: {
        id: testId,
        title: "Bantai Turso Connection Test Success! 🚀",
        status: "active"
      }
    });
    console.log("🎉 Inserted record into Turso Cloud DB:", newRecord);

    // Test Prisma query
    const allRecords = await prisma.learningTest.findMany();
    console.log("📊 Total Records in Turso DB:", allRecords.length);

    console.log("🌟 ALL TURSO CLOUD DB TESTS PASSED!");
  } catch (error) {
    console.error("❌ Turso DB Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
