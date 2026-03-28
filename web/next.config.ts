import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.dirname(fileURLToPath(import.meta.url));
const wattsupRoot = path.join(webDir, "..");

/** Share MONGODB_URI with Python: load wattsup/.env, then web/.env* (overrides). */
loadEnvConfig(wattsupRoot);
loadEnvConfig(webDir);

const nextConfig: NextConfig = {
  turbopack: {
    root: webDir,
  },
};

export default nextConfig;
