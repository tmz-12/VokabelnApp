import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/features/auth/auth-form";
import { getCurrentSession } from "@/lib/session";

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getCurrentSession();
  if (session?.user) redirect(`/${locale}/home`);
  const t = await getTranslations("auth");
  return <div className="auth-layout"><section className="auth-art"><svg className="auth-lines" viewBox="0 0 800 900" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 710 C 120 520, 240 610, 340 410 S 590 210, 850 80" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M-60 790 C 80 600, 210 700, 320 500 S 580 300, 830 170" fill="none" stroke="currentColor" strokeWidth="1"/><circle cx="335" cy="420" r="46" fill="none" stroke="currentColor"/><circle cx="595" cy="210" r="12" fill="currentColor"/></svg><div className="wordmark">Vokabeln</div><div><h1>{t("welcome")}</h1><p>{t("description")}</p></div></section><section className="auth-panel"><AuthForm /></section></div>;
}
