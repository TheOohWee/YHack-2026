/**
 * Ensure MONGODB_* from repo root are visible in Server Actions / RSC.
 * Next's next.config loadEnvConfig can be flaky across Turbopack + HMR.
 */
import { config } from "dotenv";
import path from "node:path";

const webDir = process.cwd();
const repoRoot = path.resolve(webDir, "..");

config({ path: path.join(repoRoot, ".env") });
config({ path: path.join(repoRoot, ".env.local"), override: true });
config({ path: path.join(webDir, ".env.local"), override: true });
