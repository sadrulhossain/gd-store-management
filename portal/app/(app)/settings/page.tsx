import type { Metadata } from "next";
import { MenusView } from "@/features/menus/menus-view";

export const metadata: Metadata = { title: "Menus" };

export default function MenusPage() {
  return <MenusView />;
}
