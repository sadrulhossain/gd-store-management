import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { RoleForm } from "@/features/roles/role-form";

export const metadata: Metadata = { title: "New role" };

export default function NewRolePage() {
  return (
    <>
      <PageHeader title="New role" description="Name the role and choose its permissions." />
      <RoleForm />
    </>
  );
}
