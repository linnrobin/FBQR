// Root redirect — actual auth and routing added in Steps 3–5
import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect to merchant dashboard once auth is implemented (Step 3)
  // For now, redirect to a placeholder
  redirect("/merchant");
}
