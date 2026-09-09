import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const current = await getCurrentSession();
  if (!current?.user) redirect("/de/sign-in");
  return current.user;
}

export async function requireUserWithProfile() {
  const currentUser = await requireUser();
  let [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, currentUser.id)).limit(1);
  if (!profile) {
    [profile] = await db.insert(userProfiles).values({ userId: currentUser.id }).returning();
  }
  return { user: currentUser, profile };
}
