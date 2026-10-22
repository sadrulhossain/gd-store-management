import type { Metadata } from "next";
import { UserDetail } from "@/features/users/user-detail";

export const metadata: Metadata = { title: "User details" };

export default async function UserDetailPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;

  return <UserDetail id={id} />;
}
