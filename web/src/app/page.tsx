import "@/lib/load-env";

import { Dashboard } from "@/components/Dashboard";
import { getEnergySnapshot } from "@/lib/energy-service";
import { flightSafeSnapshot } from "@/lib/snapshot-serialize";

export const dynamic = "force-dynamic";

type Search = { userId?: string | string[] };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const raw = sp.userId;
  const userId =
    (Array.isArray(raw) ? raw[0] : raw)?.trim() ||
    process.env.WATTSUP_DEFAULT_USER_ID ||
    process.env.NEXT_PUBLIC_WATTSUP_USER_ID ||
    "test-user";

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
      initialUserId={userId}
      initialSnapshot={initialSnapshot}
      initialError={initialError}
    />
  );
}
