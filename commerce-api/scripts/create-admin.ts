import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/passwords.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const name = String(process.env.ADMIN_NAME || "Store Administrator").trim();
if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("ADMIN_EMAIL must be a valid email address");
if (password.length < 14) throw new Error("ADMIN_PASSWORD must contain at least 14 characters");

const db = new PrismaClient();
try {
  const role = await db.role.findUnique({ where: { name: "ADMIN" } });
  if (!role) throw new Error("ADMIN role is missing; run the seed command first");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account already exists for ADMIN_EMAIL");
  const user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password), role: UserRole.ADMIN, verifiedAt: new Date(), roleAssignments: { create: { roleId: role.id } } } });
  await db.auditLog.create({ data: { userId: user.id, action: "admin.bootstrap_created", resource: "user", resourceId: user.id, after: { email, role: "ADMIN" } } });
  console.log(JSON.stringify({ created: true, id: user.id, email: user.email }));
} finally {
  await db.$disconnect();
}
