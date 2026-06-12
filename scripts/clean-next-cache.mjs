import { rm } from "node:fs/promises";
import path from "node:path";

const nextDir = path.resolve(process.cwd(), ".next");

await rm(nextDir, {
  recursive: true,
  force: true,
  maxRetries: 3,
  retryDelay: 200
});

console.log("Cleaned .next cache");
