import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function IndexPage() {
  const session = await getCurrentSession();
  const profile = session?.user ? (await db.select({ locale: userProfiles.uiLocale }).from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1))[0] : null;
  redirect(`/${profile?.locale ?? "de"}`);
}
