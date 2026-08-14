import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  AI_PROVIDER: z.string().default("local"),
  AI_RUNTIME: z.string().default("ollama"),
  AI_MODEL: z.string().default("llama3.1:8b-instruct-q4_K_M"),
  AI_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  AI_CONTEXT_LENGTH: z.coerce.number().default(4096),
  AI_TEMPERATURE: z.coerce.number().default(0.3),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().default(1024),
  API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
