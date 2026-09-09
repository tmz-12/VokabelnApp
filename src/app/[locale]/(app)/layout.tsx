import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ThemeEffect } from "@/components/theme-effect";
import { requireUserWithProfile } from "@/lib/session";

export default async function AuthenticatedLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { profile } = await requireUserWithProfile();
  if (!profile.onboardingCompleted) redirect(`/${locale}/onboarding`);
  return <><ThemeEffect appearance={profile.appearance} /><AppShell>{children}</AppShell></>;
}
