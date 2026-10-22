import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { UserForm } from "@/features/users/user-form";

export const metadata: Metadata = { title: "New user" };

export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="New user"
        description="Create an account and choose what they can access."
      />
      <UserForm />
    </>
  );
}
