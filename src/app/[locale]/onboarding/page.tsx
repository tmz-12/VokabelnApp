import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { requireUserWithProfile } from "@/lib/session";
import { db } from "@/db";
import { vocabulary } from "@/db/schema";
import { asc } from "drizzle-orm";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { profile } = await requireUserWithProfile();
  if (profile.onboardingCompleted) redirect(`/${locale}/home`);
  const [example] = await db.select({ german: vocabulary.german }).from(vocabulary).orderBy(asc(vocabulary.id)).limit(1);
  return <OnboardingFlow example={example.german}/>;
}
