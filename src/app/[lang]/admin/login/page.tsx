import { redirect } from "next/navigation";
import { isValidLocale } from "@/lib/i18n";

// Legacy link compat: /{lang}/admin/login now lives at /{lang}/login.
export default async function AdminLoginRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  redirect(`/${lang}/login`);
}
