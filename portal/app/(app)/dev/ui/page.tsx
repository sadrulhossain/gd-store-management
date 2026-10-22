import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiGallery } from "@/features/dev/ui-gallery";

export const metadata: Metadata = { title: "UI kit" };

/** Design tokens and base components in one place. Development only. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <UiGallery />;
}
