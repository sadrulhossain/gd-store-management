import type { Metadata } from "next";
import { RoleEdit } from "@/features/roles/role-edit";

export const metadata: Metadata = { title: "Role" };

export default async function RolePage({ params }: PageProps<"/roles/[id]">) {
  const { id } = await params;

  return <RoleEdit id={id} />;
}
