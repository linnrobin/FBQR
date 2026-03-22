// /merchant → redirect to /merchant/dashboard
// Dashboard handles the onboarding wizard redirect logic.
import { redirect } from "next/navigation";

export default function MerchantRootPage() {
  redirect("/merchant/dashboard");
}
