"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  chapters, dailyActivity, dailyReviewedVocabulary, studySessionItems, studySessions,
  userProfiles, userVocabularyState, vocabulary, vocabularyOverrides, xpEvents,
} from "@/db/schema";
import { selectSessionItems, requeueAfterLearning } from "@/features/study/domain";
import { xpDedupe } from "@/features/gamification/domain";
import { awardMilestones } from "@/features/gamification/awards";
import { localDateForTimezone } from "@/lib/dates";
import { requireUserWithProfile } from "@/lib/session";

const localeSchema = z.enum(["de", "en", "zh-TW"]);

export async function completeOnboarding(input: unknown) {
  const data = z.object({ locale: localeSchema, dailyGoal: z.number().int().min(1).max(500), sessionSize: z.number().int().min(5).max(100), timezone: z.string().max(100).refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }) }).parse(input);
  const { user } = await requireUserWithProfile();
  await db.update(userProfiles).set({ uiLocale: data.locale, timezone: data.timezone, dailyGoalWords: data.dailyGoal, sessionSize: data.sessionSize, onboardingCompleted: true, updatedAt: new Date() }).where(eq(userProfiles.userId, user.id));
  redirect(`/${data.locale}/home`);
}

export async function updateSettings(input: unknown) {
  const data = z.object({ locale: localeSchema, appearance: z.enum(["light", "dark", "system"]), dailyGoal: z.number().int().min(1).max(500), sessionSize: z.number().int().min(5).max(100), secondary: z.boolean(), sounds: z.boolean() }).parse(input);
  const { user } = await requireUserWithProfile();
  await db.update(userProfiles).set({ uiLocale: data.locale, appearance: data.appearance, dailyGoalWords: data.dailyGoal, sessionSize: data.sessionSize, secondaryTranslationVisible: data.secondary, soundEffectsEnabled: data.sounds, updatedAt: new Date() }).where(eq(userProfiles.userId, user.id));
  revalidatePath(`/${data.locale}/settings`);
  return { ok: true };
}

export async function toggleFavorite(vocabularyId: string) {
  const id = z.string().min(1).parse(vocabularyId);
  const { user } = await requireUserWithProfile();
  const [updated] = await db.insert(userVocabularyState).values({ userId: user.id, vocabularyId: id, favorite: true })
    .onConflictDoUpdate({ target: [userVocabularyState.userId, userVocabularyState.vocabularyId], set: { favorite: sql`not ${userVocabularyState.favorite}`, updatedAt: new Date() } }).returning({favorite:userVocabularyState.favorite});
  revalidatePath("/", "layout");
  return { favorite: updated.favorite };
}

export async function setVocabularyStatus(vocabularyId: string, status: "new" | "learning" | "known") {
  const input = z.object({ vocabularyId: z.string(), status: z.enum(["new", "learning", "known"]) }).parse({ vocabularyId, status });
  const { user, profile } = await requireUserWithProfile();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.select({ id: userProfiles.userId }).from(userProfiles).where(eq(userProfiles.userId, user.id)).for("update");
    const [previous] = await tx.select().from(userVocabularyState).where(and(eq(userVocabularyState.userId, user.id), eq(userVocabularyState.vocabularyId, input.vocabularyId))).limit(1);
    const firstKnownAt = previous?.firstKnownAt ?? (input.status === "known" ? now : null);
    await tx.insert(userVocabularyState).values({ userId: user.id, vocabularyId: input.vocabularyId, status: input.status, firstSeenAt: now, firstKnownAt })
      .onConflictDoUpdate({ target: [userVocabularyState.userId, userVocabularyState.vocabularyId], set: { status: input.status, firstSeenAt: previous?.firstSeenAt ?? now, firstKnownAt, updatedAt: now } });
    if (input.status === "known" && !previous?.firstKnownAt) {
      const inserted = await tx.insert(xpEvents).values({ id: crypto.randomUUID(), userId: user.id, vocabularyId: input.vocabularyId, eventType: "first_known", points: 10, dedupeKey: xpDedupe.firstKnown(user.id, input.vocabularyId) }).onConflictDoNothing().returning({ id: xpEvents.id });
      if (inserted.length) {
        const localDate = localDateForTimezone(now, profile.timezone);
        await tx.insert(dailyActivity).values({ userId: user.id, localDate, xpEarned: 10 })
          .onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.localDate], set: { xpEarned: sql`${dailyActivity.xpEarned} + 10`, updatedAt: now } });
      }
    }
    if (input.status === "known") {
      const [word] = await tx.select({ chapterId: vocabulary.chapterId, level: vocabulary.level }).from(vocabulary).where(eq(vocabulary.id, input.vocabularyId)).limit(1);
      const localDate = localDateForTimezone(now, profile.timezone);
      const points = await awardMilestones(tx, user.id, word, now, localDate);
      if (points) await tx.insert(dailyActivity).values({ userId: user.id, localDate, xpEarned: points })
        .onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.localDate], set: { xpEarned: sql`${dailyActivity.xpEarned} + ${points}`, updatedAt: now } });
    }
  });
  revalidatePath("/", "layout");
}

export async function saveOverride(input: unknown) {
  const data = z.object({ vocabularyId: z.string(), english: z.string().max(2000), chinese: z.string().max(2000), examples: z.array(z.string().max(1000)).max(30) }).parse(input);
  const { user } = await requireUserWithProfile();
  await db.insert(vocabularyOverrides).values({ id: crypto.randomUUID(), userId: user.id, vocabularyId: data.vocabularyId, englishOverride: data.english || null, traditionalChineseOverride: data.chinese || null, examplesGermanOverride: data.examples })
    .onConflictDoUpdate({ target: [vocabularyOverrides.userId, vocabularyOverrides.vocabularyId], set: { englishOverride: data.english || null, traditionalChineseOverride: data.chinese || null, examplesGermanOverride: data.examples, updatedAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function resetOverride(vocabularyId: string) {
  const { user } = await requireUserWithProfile();
  await db.delete(vocabularyOverrides).where(and(eq(vocabularyOverrides.userId, user.id), eq(vocabularyOverrides.vocabularyId, z.string().parse(vocabularyId))));
  revalidatePath("/", "layout");
}

export async function startStudySession(input: unknown) {
  const data = z.object({ chapterNumber: z.number().int().min(1).max(10).optional(), mode: z.enum(["continue", "new", "learning", "known-review", "favorites", "priority", "c2-upgrade"]), size: z.number().int().min(5).max(100), locale: localeSchema }).parse(input);
  const { user } = await requireUserWithProfile();
  const [chapter] = data.chapterNumber ? await db.select().from(chapters).where(eq(chapters.chapterNumber, data.chapterNumber)).limit(1) : [undefined];
  const rows = await db.select({
    id: vocabulary.id,
    status: sql<"new" | "learning" | "known">`coalesce(${userVocabularyState.status}, 'new')`,
    favorite: sql<boolean>`coalesce(${userVocabularyState.favorite}, false)`,
    isKey: vocabulary.isKey, level: vocabulary.level,
    sourceOrder: sql<number>`coalesce(${chapters.sortOrder}, 99) * 1000000 + (case when ${vocabulary.level} = 'C2' then 100000 else 0 end) + coalesce(${vocabulary.orderInChapter}, ${vocabulary.orderInGroup})`, lastReviewedAt: userVocabularyState.lastReviewedAt,
  }).from(vocabulary).leftJoin(chapters, eq(chapters.id, vocabulary.chapterId)).leftJoin(userVocabularyState, and(eq(userVocabularyState.vocabularyId, vocabulary.id), eq(userVocabularyState.userId, user.id)))
    .where(chapter ? eq(vocabulary.chapterId, chapter.id) : undefined).orderBy(asc(vocabulary.orderInChapter), asc(vocabulary.orderInGroup));
  const selected = selectSessionItems(rows, data.mode, data.size);
  if (selected.length === 0) return { ok: false as const, error: "empty" };
  const sessionId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.select({ id: userProfiles.userId }).from(userProfiles).where(eq(userProfiles.userId, user.id)).for("update");
    await tx.update(studySessions).set({ status: "abandoned", updatedAt: new Date() }).where(and(eq(studySessions.userId, user.id), eq(studySessions.status, "active")));
    const [xpBefore] = await tx.select({ value: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int` }).from(xpEvents).where(eq(xpEvents.userId, user.id));
    const [c1Before] = await tx.select({ known: sql<number>`count(*) filter (where ${userVocabularyState.status} = 'known')::int`, total: sql<number>`count(*)::int` })
      .from(vocabulary).leftJoin(userVocabularyState, and(eq(userVocabularyState.vocabularyId, vocabulary.id), eq(userVocabularyState.userId, user.id)))
      .where(and(eq(vocabulary.level, "C1"), chapter ? eq(vocabulary.chapterId, chapter.id) : sql`${vocabulary.chapterId} is not null`));
    await tx.insert(studySessions).values({ id: sessionId, userId: user.id, chapterId: chapter?.id ?? null, mode: data.mode, requestedSize: data.size, baseItemCount: selected.length, queue: selected.map((word) => word.id), resultSnapshot: { xpBefore: xpBefore.value, c1Before: c1Before.known, c1Total: c1Before.total } });
    await tx.insert(studySessionItems).values(selected.map((word, index) => ({ id: crypto.randomUUID(), studySessionId: sessionId, vocabularyId: word.id, basePosition: index })));
  });
  redirect(`/${data.locale}/study/${sessionId}`);
}

export async function answerStudyCard(input: unknown) {
  const data = z.object({ sessionId: z.string().uuid(), position: z.number().int().nonnegative(), outcome: z.enum(["learning", "known"]) }).parse(input);
  const { user, profile } = await requireUserWithProfile();
  const now = new Date();
  const localDate = localDateForTimezone(now, profile.timezone);
  await db.transaction(async (tx) => {
    let xpAwarded = 0;
    // Serialize answers across tabs and reject stale/replayed card submissions.
    await tx.select({ id: userProfiles.userId }).from(userProfiles).where(eq(userProfiles.userId, user.id)).for("update");
    const [studySession] = await tx.select().from(studySessions).where(and(eq(studySessions.id, data.sessionId), eq(studySessions.userId, user.id), eq(studySessions.status, "active"))).limit(1);
    if (!studySession) throw new Error("Active study session not found");
    if (studySession.currentPosition !== data.position) return;
    const vocabularyId = studySession.queue[studySession.currentPosition];
    if (!vocabularyId) throw new Error("Session queue is exhausted");
    const [state] = await tx.select().from(userVocabularyState).where(and(eq(userVocabularyState.userId, user.id), eq(userVocabularyState.vocabularyId, vocabularyId))).limit(1);
    const [item] = await tx.select().from(studySessionItems).where(and(eq(studySessionItems.studySessionId, data.sessionId), eq(studySessionItems.vocabularyId, vocabularyId))).limit(1);
    if (!item) throw new Error("Session item not found");
    const [word] = await tx.select({ chapterId: vocabulary.chapterId, level: vocabulary.level }).from(vocabulary).where(eq(vocabulary.id, vocabularyId)).limit(1);
    if (!word) throw new Error("Vocabulary item not found");

    const firstKnown = data.outcome === "known" && !state?.firstKnownAt;
    await tx.insert(userVocabularyState).values({ userId: user.id, vocabularyId, status: data.outcome, firstSeenAt: state?.firstSeenAt ?? now, firstKnownAt: firstKnown ? now : state?.firstKnownAt, lastReviewedAt: now, reviewCount: (state?.reviewCount ?? 0) + 1, favorite: state?.favorite ?? false })
      .onConflictDoUpdate({ target: [userVocabularyState.userId, userVocabularyState.vocabularyId], set: { status: data.outcome, firstSeenAt: state?.firstSeenAt ?? now, firstKnownAt: firstKnown ? now : state?.firstKnownAt, lastReviewedAt: now, reviewCount: (state?.reviewCount ?? 0) + 1, updatedAt: now } });

    if (firstKnown) {
      const inserted = await tx.insert(xpEvents).values({ id: crypto.randomUUID(), userId: user.id, eventType: "first_known", points: 10, vocabularyId, studySessionId: data.sessionId, dedupeKey: xpDedupe.firstKnown(user.id, vocabularyId) }).onConflictDoNothing().returning({ id: xpEvents.id });
      xpAwarded += inserted.length * 10;
    } else if (data.outcome === "known" && state?.status === "known") {
      const inserted = await tx.insert(xpEvents).values({ id: crypto.randomUUID(), userId: user.id, eventType: "known_review", points: 2, vocabularyId, studySessionId: data.sessionId, dedupeKey: xpDedupe.knownReview(user.id, vocabularyId, localDate) }).onConflictDoNothing().returning({ id: xpEvents.id });
      xpAwarded += inserted.length * 2;
    }

    await tx.insert(dailyReviewedVocabulary).values({ userId: user.id, localDate, vocabularyId }).onConflictDoNothing();
    const [dailyCount] = await tx.select({ count: sql<number>`count(*)::int` }).from(dailyReviewedVocabulary).where(and(eq(dailyReviewedVocabulary.userId, user.id), eq(dailyReviewedVocabulary.localDate, localDate)));
    const [activity] = await tx.select().from(dailyActivity).where(and(eq(dailyActivity.userId, user.id), eq(dailyActivity.localDate, localDate))).limit(1);
    const completedGoal = activity?.dailyGoalCompleted || (dailyCount?.count ?? 0) >= profile.dailyGoalWords;
    await tx.insert(dailyActivity).values({ userId: user.id, localDate, uniqueWordsReviewed: dailyCount?.count ?? 0, dailyGoalCompleted: completedGoal })
      .onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.localDate], set: { uniqueWordsReviewed: dailyCount?.count ?? 0, dailyGoalCompleted: completedGoal, updatedAt: now } });
    if (completedGoal && !activity?.dailyGoalCompleted) {
      const inserted = await tx.insert(xpEvents).values({ id: crypto.randomUUID(), userId: user.id, eventType: "daily_goal", points: 25, studySessionId: data.sessionId, dedupeKey: xpDedupe.dailyGoal(user.id, localDate) }).onConflictDoNothing().returning({ id: xpEvents.id });
      xpAwarded += inserted.length * 25;
    }

    const nextRequeueCount = data.outcome === "learning" ? item.requeueCount + 1 : item.requeueCount;
    const queue = data.outcome === "learning" ? requeueAfterLearning(studySession.queue, studySession.currentPosition, vocabularyId, item.requeueCount) : studySession.queue;
    const nextPosition = studySession.currentPosition + 1;
    const complete = nextPosition >= queue.length;
    await tx.update(studySessionItems).set({ presentationCount: item.presentationCount + 1, requeueCount: nextRequeueCount, finalOutcome: data.outcome, lastAnsweredAt: now, updatedAt: now }).where(eq(studySessionItems.id, item.id));
    await tx.update(studySessions).set({ queue, currentPosition: nextPosition, status: complete ? "completed" : "active", completedAt: complete ? now : null, updatedAt: now }).where(eq(studySessions.id, studySession.id));
    if (complete) {
      const inserted = await tx.insert(xpEvents).values({ id: crypto.randomUUID(), userId: user.id, eventType: "session_complete", points: 20, studySessionId: studySession.id, dedupeKey: xpDedupe.session(user.id, studySession.id) }).onConflictDoNothing().returning({ id: xpEvents.id });
      xpAwarded += inserted.length * 20;
      await tx.update(dailyActivity).set({ sessionsCompleted: sql`${dailyActivity.sessionsCompleted} + 1`, updatedAt: now }).where(and(eq(dailyActivity.userId, user.id), eq(dailyActivity.localDate, localDate)));
    }

    xpAwarded += await awardMilestones(tx, user.id, word, now, localDate, data.sessionId, complete);
    if (complete) {
      const [xpAfter] = await tx.select({ value: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int` }).from(xpEvents).where(eq(xpEvents.userId, user.id));
      const [c1After] = await tx.select({ known: sql<number>`count(*)::int` }).from(userVocabularyState).innerJoin(vocabulary, eq(vocabulary.id, userVocabularyState.vocabularyId))
        .where(and(eq(userVocabularyState.userId, user.id), eq(userVocabularyState.status, "known"), eq(vocabulary.level, "C1"), studySession.chapterId ? eq(vocabulary.chapterId, studySession.chapterId) : sql`${vocabulary.chapterId} is not null`));
      await tx.update(studySessions).set({ resultSnapshot: { ...studySession.resultSnapshot, xpAfter: xpAfter.value, c1After: c1After.known } }).where(eq(studySessions.id, data.sessionId));
    }
    if (xpAwarded > 0) await tx.update(dailyActivity).set({ xpEarned: sql`${dailyActivity.xpEarned} + ${xpAwarded}`, updatedAt: now }).where(and(eq(dailyActivity.userId, user.id), eq(dailyActivity.localDate, localDate)));


  });
  revalidatePath("/", "layout");
  return { ok: true };
}
