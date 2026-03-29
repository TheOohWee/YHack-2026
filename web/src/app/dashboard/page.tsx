import "@/lib/load-env";

import { Dashboard } from "@/components/Dashboard";
import { DASHBOARD_USER_ID } from "@/lib/dashboard-user";
import { getEnergySnapshot } from "@/lib/energy-service";
import { flightSafeSnapshot } from "@/lib/snapshot-serialize";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = DASHBOARD_USER_ID;

  let initialSnapshot = null;
  let initialError: string | null = null;

  if (!process.env.MONGODB_URI) {
    initialError =
      "MONGODB_URI is not set. Put it in wattsup/.env (parent folder) or web/.env.local and restart `npm run dev`.";
  } else {
    try {
      initialSnapshot = flightSafeSnapshot(await getEnergySnapshot(userId));
    } catch (e) {
      initialError =
        e instanceof Error ? e.message : "Could not load energy snapshot.";
    }
  }

  return (
    <Dashboard
      initialSnapshot={initialSnapshot}
      initialError={initialError}
    />
  );
}
