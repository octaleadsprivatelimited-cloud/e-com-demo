import crypto from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(crypto.scrypt);
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16),
    derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}
export async function verifyPassword(hash: string, password: string) {
  const [algorithm, saltText, expectedText] = hash.split("$");
  if (algorithm !== "scrypt" || !saltText || !expectedText) return false;
  const expected = Buffer.from(expectedText, "base64"),
    actual = (await scrypt(
      password,
      Buffer.from(saltText, "base64"),
      expected.length,
    )) as Buffer;
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}
