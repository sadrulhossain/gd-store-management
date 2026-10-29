import type { Metadata } from "next";
import { UserCreate } from "@/features/users/user-create";

export const metadata: Metadata = { title: "New user" };

export default function NewUserPage() {
  return <UserCreate />;
}
