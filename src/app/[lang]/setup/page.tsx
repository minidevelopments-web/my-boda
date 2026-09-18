import { redirect } from "next/navigation";
import { getDictionary, isValidLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import SetupWizard from "@/components/onboarding/SetupWizard";

export const dynamic = "force-dynamic";

export default async function SetupPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isValidLocale(raw) ? raw : "en";
  const count = await prisma.user.count().catch(() => 1);
  if (count !== 0) redirect(`/${lang}/login`);
  const dict = getDictionary(lang);
  return <SetupWizard dict={(dict as Record<string, unknown>)?.setup as never} />;
}
