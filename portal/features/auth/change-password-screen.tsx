"use client";

import { KeyRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout } from "@/features/auth/api";
import { ChangePasswordForm } from "@/features/auth/change-password-form";

/** Forced screen for accounts flagged must_change_password (first login, or after an admin reset). */
export function ChangePasswordScreen() {
  const router = useRouter();
  const logout = useLogout();

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRoundIcon className="size-6" aria-hidden />
        </div>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          For your security you must replace your temporary password before you continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChangePasswordForm
          submitLabel="Update password and continue"
          onChanged={() => router.replace("/dashboard")}
        />
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Sign out instead
        </Button>
      </CardContent>
    </Card>
  );
}
