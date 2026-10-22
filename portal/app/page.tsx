import { redirect } from "next/navigation";

/** The proxy normally redirects "/" first; this covers direct renders. */
export default function Home() {
  redirect("/dashboard");
}
