import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
        <div
            aria-hidden
            className="absolute inset-0 -z-20 bg-[url('/images/sidebar-bg-img.jpg')] bg-cover bg-center"
        />
        <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-sidebar-glass backdrop-blur-l backdrop-saturate-150"
        />
      {/* useSearchParams (the ?next= target) needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
