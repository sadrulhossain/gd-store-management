import type { Metadata } from "next";
import { PermissionsView } from "@/features/roles/permissions-view";

export const metadata: Metadata = { title: "Permissions" };

export default function PermissionsPage() {
  return <PermissionsView />;
}
