import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

export default async function LocaleIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getCurrentSession();
  redirect(session?.user ? `/${locale}/home` : `/${locale}/sign-in`);
}
