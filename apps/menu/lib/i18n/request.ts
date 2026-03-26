import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export type Locale = "id" | "en";
export const defaultLocale: Locale = "id";
export const locales: Locale[] = ["id", "en"];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  // Language switcher stores locale in localStorage on client;
  // server reads from cookie set by the switcher component (Step 12).
  // See docs/customer.md § Language Switcher
  const localeCookie = cookieStore.get("fbqr_locale")?.value;
  const locale: Locale = localeCookie === "en" ? "en" : defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)) as { default: Record<string, string> };

  return {
    locale,
    messages: messages.default,
  };
});
