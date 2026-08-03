import { redirect } from "next/navigation";

/** Auth is disabled in demo mode — old links land on the browse page. */
export default function RegisterPage() {
  redirect("/events");
}
