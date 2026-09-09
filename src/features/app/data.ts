import { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  badges,
  chapters,
  dailyActivity,
  studySessionItems,
  studySessions,
  userBadges,
  userVocabularyState,
  vocabulary,
  vocabularyOverrides,
  xpEvents,
} from "@/db/schema";
import { calculateCurrentStreak, levelFromXp } from "@/features/gamification/domain";
import { localDateForTimezone } from "@/lib/dates";

export async function getHomeData(userId: string, timezone: string) {
  const progressRows = await db.execute<{
    chapterNumber: number; chapterId: string; c1Total: number; c1Known: number; c2Total: number; c2Known: number; priorityTotal: number;
  }>(sql`
    select c.chapter_number as "chapterNumber", c.id as "chapterId",
      count(v.id) filter (where v.level = 'C1')::int as "c1Total",
      count(v.id) filter (where v.level = 'C1' and s.status = 'known')::int as "c1Known",
      count(v.id) filter (where v.level = 'C2')::int as "c2Total",
      count(v.id) filter (where v.level = 'C2' and s.status = 'known')::int as "c2Known",
      count(v.id) filter (where v.is_key)::int as "priorityTotal"
    from chapters c
    left join vocabulary v on v.chapter_id = c.id
    left join user_vocabulary_state s on s.vocabulary_id = v.id and s.user_id = ${userId}
    group by c.id, c.chapter_number, c.sort_order order by c.sort_order
  `);
  const [active] = await db.select().from(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.status, "active"))).orderBy(desc(studySessions.updatedAt)).limit(1);
  const [baseProgress] = active ? await db.select({ count: sql<number>`count(*)::int` }).from(studySessionItems)
    .where(and(eq(studySessionItems.studySessionId, active.id), sql`${studySessionItems.presentationCount} > 0`)) : [];
  const [pendingChapter] = await db.select({ chapterId: vocabulary.chapterId }).from(userVocabularyState)
    .innerJoin(vocabulary, eq(vocabulary.id, userVocabularyState.vocabularyId))
    .where(and(eq(userVocabularyState.userId, userId), eq(userVocabularyState.status, "learning"), sql`${vocabulary.chapterId} is not null`))
    .orderBy(desc(userVocabularyState.updatedAt)).limit(1);
  const recommendedChapter = progressRows.find((chapter) => chapter.chapterId === pendingChapter?.chapterId)
    ?? progressRows.find((chapter) => chapter.c1Known < chapter.c1Total || chapter.c2Known < chapter.c2Total)
    ?? progressRows[0];
  const [xp] = await db.select({ total: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int` }).from(xpEvents).where(eq(xpEvents.userId, userId));
  const recentDays = await db.select({ localDate: dailyActivity.localDate }).from(dailyActivity)
    .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.dailyGoalCompleted, true))).orderBy(desc(dailyActivity.localDate)).limit(400);
  const today = localDateForTimezone(new Date(), timezone);
  const [todayActivity] = await db.select().from(dailyActivity).where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.localDate, today))).limit(1);
  return {
    chapters: [...progressRows], active, baseCompleted: baseProgress?.count ?? 0, recommendedChapter,
    level: levelFromXp(xp?.total ?? 0),
    streak: calculateCurrentStreak(recentDays.map((row) => row.localDate), today),
    todayReviewed: todayActivity?.uniqueWordsReviewed ?? 0,
  };
}

export async function getChapterData(userId: string, chapterNumber: number, filter = "all") {
  const [chapter] = await db.select().from(chapters).where(eq(chapters.chapterNumber, chapterNumber)).limit(1);
  if (!chapter) return null;
  const rows = await db.select({
    id: vocabulary.id, headword: vocabulary.headword, german: vocabulary.german, english: vocabulary.english,
    traditionalChinese: vocabulary.traditionalChinese, formsRaw: vocabulary.formsRaw, examplesGerman: vocabulary.examplesGerman,
    chunks: vocabulary.chunks, sourceReference: vocabulary.sourceReference, sourcePage: vocabulary.sourcePage,
    level: vocabulary.level, isKey: vocabulary.isKey, isC2Upgrade: vocabulary.isC2Upgrade,
    status: sql<"new" | "learning" | "known">`coalesce(${userVocabularyState.status}, 'new')`,
    favorite: sql<boolean>`coalesce(${userVocabularyState.favorite}, false)`,
    englishOverride: vocabularyOverrides.englishOverride, traditionalChineseOverride: vocabularyOverrides.traditionalChineseOverride,
    examplesGermanOverride: vocabularyOverrides.examplesGermanOverride,
  }).from(vocabulary)
    .leftJoin(userVocabularyState, and(eq(userVocabularyState.vocabularyId, vocabulary.id), eq(userVocabularyState.userId, userId)))
    .leftJoin(vocabularyOverrides, and(eq(vocabularyOverrides.vocabularyId, vocabulary.id), eq(vocabularyOverrides.userId, userId)))
    .where(and(
      eq(vocabulary.chapterId, chapter.id),
      filter === "new" ? or(eq(userVocabularyState.status, "new"), sql`${userVocabularyState.status} is null`) : undefined,
      filter === "learning" ? eq(userVocabularyState.status, "learning") : undefined,
      filter === "known" ? eq(userVocabularyState.status, "known") : undefined,
      filter === "priority" ? eq(vocabulary.isKey, true) : undefined,
      filter === "c2" ? eq(vocabulary.level, "C2") : undefined,
      filter === "favorites" ? eq(userVocabularyState.favorite, true) : undefined,
    )).orderBy(asc(vocabulary.level), asc(vocabulary.orderInChapter));
  const c1 = rows.filter((row) => row.level === "C1");
  const c2 = rows.filter((row) => row.level === "C2");
  return { chapter, words: rows, c1: { total: c1.length, known: c1.filter((row) => row.status === "known").length }, c2: { total: c2.length, known: c2.filter((row) => row.status === "known").length }, priority: rows.filter((row) => row.isKey).length };
}

export async function getStudySession(userId: string, sessionId: string) {
  const [studySession] = await db.select().from(studySessions).where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId))).limit(1);
  if (!studySession) return null;
  if (studySession.status === "completed") return { session: studySession, current: null, item: null };
  const vocabularyId = studySession.queue[studySession.currentPosition];
  if (!vocabularyId) return { session: studySession, current: null, item: null };
  const [current] = await db.select({
    id: vocabulary.id, headword: vocabulary.headword, german: vocabulary.german, english: vocabulary.english,
    traditionalChinese: vocabulary.traditionalChinese, formsRaw: vocabulary.formsRaw, examplesGerman: vocabulary.examplesGerman,
    chunks: vocabulary.chunks, sourceReference: vocabulary.sourceReference, sourcePage: vocabulary.sourcePage,
    level: vocabulary.level, isKey: vocabulary.isKey, isC2Upgrade: vocabulary.isC2Upgrade,
    favorite: sql<boolean>`coalesce(${userVocabularyState.favorite}, false)`,
    englishOverride: vocabularyOverrides.englishOverride, traditionalChineseOverride: vocabularyOverrides.traditionalChineseOverride,
    examplesGermanOverride: vocabularyOverrides.examplesGermanOverride,
  }).from(vocabulary)
    .leftJoin(userVocabularyState, and(eq(userVocabularyState.vocabularyId, vocabulary.id), eq(userVocabularyState.userId, userId)))
    .leftJoin(vocabularyOverrides, and(eq(vocabularyOverrides.vocabularyId, vocabulary.id), eq(vocabularyOverrides.userId, userId)))
    .where(eq(vocabulary.id, vocabularyId)).limit(1);
  const [item] = await db.select().from(studySessionItems).where(and(eq(studySessionItems.studySessionId, sessionId), eq(studySessionItems.vocabularyId, vocabularyId))).limit(1);
  const [presented] = await db.select({ count: sql<number>`count(*) filter (where ${studySessionItems.presentationCount} > 0)::int` })
    .from(studySessionItems).where(eq(studySessionItems.studySessionId, sessionId));
  const baseCurrent = Math.min(studySession.baseItemCount, (presented?.count ?? 0) + (item?.presentationCount === 0 ? 1 : 0));
  return { session: studySession, current, item, baseCurrent };
}

export async function getSessionResult(userId: string, sessionId: string) {
  const [studySession] = await db.select().from(studySessions).where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId), eq(studySessions.status, "completed"))).limit(1);
  if (!studySession) return null;
  const items = await db.select().from(studySessionItems).where(eq(studySessionItems.studySessionId, sessionId));
  const [earned] = await db.select({ total: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int` }).from(xpEvents).where(and(eq(xpEvents.userId, userId), eq(xpEvents.studySessionId, sessionId)));
  const chapter = studySession.chapterId ? (await db.select().from(chapters).where(eq(chapters.id, studySession.chapterId)).limit(1))[0] : null;
  const newlyEarnedBadges = await db.select({ code: badges.code, localizationKey: badges.localizationKey })
    .from(userBadges).innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(and(eq(userBadges.userId, userId), gte(userBadges.awardedAt, studySession.startedAt), lte(userBadges.awardedAt, studySession.completedAt!)))
    .orderBy(asc(userBadges.awardedAt));
  return { session: studySession, items, xp: earned?.total ?? 0, badges: newlyEarnedBadges, chapterNumber: chapter?.chapterNumber ?? null, known: items.filter((item) => item.finalOutcome === "known").length, learning: items.filter((item) => item.finalOutcome === "learning").length };
}

export type SearchFilters = { q?: string; chapter?: number; level?: "C1" | "C2"; status?: "new" | "learning" | "known"; favorite?: boolean; priority?: boolean };

export async function searchVocabulary(userId: string, filters: SearchFilters, limit = 100) {
  const query = filters.q?.trim().toLocaleLowerCase();
  return db.select({
    id: vocabulary.id, headword: vocabulary.headword, german: vocabulary.german, english: vocabulary.english,
    traditionalChinese: vocabulary.traditionalChinese, examplesGerman: vocabulary.examplesGerman, chunks: vocabulary.chunks,
    formsRaw: vocabulary.formsRaw, sourceReference: vocabulary.sourceReference, sourcePage: vocabulary.sourcePage,
    level: vocabulary.level, isKey: vocabulary.isKey, isC2Upgrade: vocabulary.isC2Upgrade,
    chapterNumber: chapters.chapterNumber,
    status: sql<"new" | "learning" | "known">`coalesce(${userVocabularyState.status}, 'new')`,
    favorite: sql<boolean>`coalesce(${userVocabularyState.favorite}, false)`,
    englishOverride: vocabularyOverrides.englishOverride, traditionalChineseOverride: vocabularyOverrides.traditionalChineseOverride,
    examplesGermanOverride: vocabularyOverrides.examplesGermanOverride,
  }).from(vocabulary)
    .leftJoin(chapters, eq(chapters.id, vocabulary.chapterId))
    .leftJoin(userVocabularyState, and(eq(userVocabularyState.vocabularyId, vocabulary.id), eq(userVocabularyState.userId, userId)))
    .leftJoin(vocabularyOverrides, and(eq(vocabularyOverrides.vocabularyId, vocabulary.id), eq(vocabularyOverrides.userId, userId)))
    .where(and(
      query ? sql`concat_ws(' ', ${vocabulary.headword}, ${vocabulary.german},
        coalesce(nullif(trim(${vocabularyOverrides.englishOverride}), ''), ${vocabulary.english}),
        coalesce(nullif(trim(${vocabularyOverrides.traditionalChineseOverride}), ''), ${vocabulary.traditionalChinese}),
        coalesce(nullif(${vocabularyOverrides.examplesGermanOverride}, '[]'::jsonb), ${vocabulary.examplesGerman})::text,
        ${vocabulary.chunks}::text) ilike ${`%${query.replace(/[\\%_]/g, "\\$&")}%`}` : undefined,
      filters.chapter ? eq(chapters.chapterNumber, filters.chapter) : undefined,
      filters.level ? eq(vocabulary.level, filters.level) : undefined,
      filters.status === "new" ? or(eq(userVocabularyState.status, "new"), sql`${userVocabularyState.status} is null`) : filters.status ? eq(userVocabularyState.status, filters.status) : undefined,
      filters.favorite ? eq(userVocabularyState.favorite, true) : undefined,
      filters.priority ? eq(vocabulary.isKey, true) : undefined,
    )).orderBy(asc(chapters.sortOrder), asc(vocabulary.level), asc(vocabulary.orderInChapter), asc(vocabulary.orderInGroup)).limit(limit);
}

export async function getFavorites(userId: string) {
  return searchVocabulary(userId, { favorite: true }, 3450);
}

export async function getEarnedBadges(userId: string) {
  return db.select({ code: badges.code, localizationKey: badges.localizationKey, iconKey: badges.iconKey, awardedAt: userBadges.awardedAt })
    .from(userBadges).innerJoin(badges, eq(badges.id, userBadges.badgeId)).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.awardedAt));
}
