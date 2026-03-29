import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Suspense>
        <AuthCard />
      </Suspense>
    </main>
  );
}
