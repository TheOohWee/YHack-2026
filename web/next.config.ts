import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.dirname(fileURLToPath(import.meta.url));
const wattsupRoot = path.join(webDir, "..");

/**
 * Share MONGODB_* with Python (repo-root .env).
 * IMPORTANT: call `loadEnvConfig` only once for `web/` — a second `loadEnvConfig`
 * resets `process.env` to the pre-Nex snapshot and drops parent vars.
 */
dotenv.config({ path: path.join(wattsupRoot, ".env") });
dotenv.config({ path: path.join(wattsupRoot, ".env.local"), override: true });
const isDev = process.env.NODE_ENV !== "production";
loadEnvConfig(webDir, isDev);

const nextConfig: NextConfig = {
  turbopack: {
    root: webDir,
  },
};

export default nextConfig;
