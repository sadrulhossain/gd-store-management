import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { BgGlass } from "@/components/ui/bg-glass";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
        <BgGlass blur="3px"/>
      {/* useSearchParams (the ?next= target) needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
