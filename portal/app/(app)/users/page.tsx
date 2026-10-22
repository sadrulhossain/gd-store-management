import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersList } from "@/features/users/users-list";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  // The list keeps its filters in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <UsersList />
    </Suspense>
  );
}
