import type { Metadata } from "next";
import { UserEdit } from "@/features/users/user-edit";

export const metadata: Metadata = { title: "Edit user" };

export default async function EditUserPage({ params }: PageProps<"/users/[id]/edit">) {
  const { id } = await params;

  return <UserEdit id={id} />;
}
