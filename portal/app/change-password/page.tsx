import type { Metadata } from "next";
import { ChangePasswordScreen } from "@/features/auth/change-password-screen";

export const metadata: Metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <ChangePasswordScreen />
    </main>
  );
}
