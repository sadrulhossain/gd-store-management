import type { Metadata } from "next";
import { ForbiddenView } from "@/components/errors/forbidden-view";

export const metadata: Metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return <ForbiddenView />;
}
