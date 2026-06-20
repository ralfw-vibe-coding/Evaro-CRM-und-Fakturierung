import { createHash, randomUUID } from "node:crypto";

export function generateApiKey(): string {
  return randomUUID();
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}
