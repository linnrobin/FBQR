import { redirect } from "next/navigation";

/**
 * /fbqrsys root → redirect to dashboard.
 */
export default function FbqrsysRootPage() {
  redirect("/fbqrsys/dashboard");
}
