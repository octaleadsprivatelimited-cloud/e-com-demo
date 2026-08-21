import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  INTEGRATION_ENCRYPTION_KEY: z.string().min(32),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  USE_DATABASE: z.enum(["true", "false"]).default("false").transform(value => value === "true"),
});
export type AppConfig = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Invalid environment configuration: ${parsed.error.issues.map((x) => x.path.join(".")).join(", ")}`,
    );
  return parsed.data;
}
