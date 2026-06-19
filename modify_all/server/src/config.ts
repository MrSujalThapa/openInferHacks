import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDir, "../.env") });
dotenv.config({ path: path.resolve(configDir, "../../.env") });

const DEFAULT_PORT = 4000;

export type ServerConfig = {
  port: number;
  corsOrigins: string[];
  mongodbUri?: string;
  mongodbDb: string;
  openinferBaseUrl?: string;
  openinferApiKey?: string;
  openinferModel: string;
};

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return parsed;
}

function parseCorsOrigins(rawOrigins: string | undefined): string[] {
  if (!rawOrigins) {
    return ["http://localhost:3000"];
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const config: ServerConfig = {
  port: parsePort(process.env.PORT),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB ?? "genie_mvp",
  openinferBaseUrl: process.env.OPENINFER_BASE_URL,
  openinferApiKey: process.env.OPENINFER_API_KEY,
  openinferModel: process.env.OPENINFER_MODEL ?? "@oi/beta",
};

