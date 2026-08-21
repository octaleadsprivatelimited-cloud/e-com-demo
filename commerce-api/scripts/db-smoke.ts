import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const result = await db.$queryRaw<
    Array<{ database: string; user: string }>
  >`SELECT current_database() AS database, current_user AS user`;
  console.log(
    JSON.stringify({
      connected: true,
      database: result[0]?.database,
      user: result[0]?.user,
    }),
  );
} finally {
  await db.$disconnect();
}
