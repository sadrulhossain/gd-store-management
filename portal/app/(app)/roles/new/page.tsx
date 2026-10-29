import type { Metadata } from "next";
import { RoleCreate } from "@/features/roles/role-create";

export const metadata: Metadata = { title: "New role" };

export default function NewRolePage() {
  return <RoleCreate />;
}
