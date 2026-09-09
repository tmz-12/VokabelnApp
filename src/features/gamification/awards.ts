import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyActivity, userBadges, userVocabularyState, vocabulary, xpEvents } from "@/db/schema";
import { calculateCurrentStreak, xpDedupe } from "./domain";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Shared by study answers and manual state changes, under the user's row lock.
export async function awardMilestones(tx: Transaction, userId: string, word: {chapterId: string | null; level: "C1" | "C2"}, now: Date, localDate: string, sessionId?: string, complete = false) {
  let xpAwarded = 0;
    if (word.chapterId) {
      const [mastery] = await tx.select({
        total: sql<number>`count(*)::int`,
        known: sql<number>`count(*) filter (where ${userVocabularyState.status} = 'known')::int`,
      }).from(vocabulary).leftJoin(userVocabularyState, and(eq(userVocabularyState.vocabularyId, vocabulary.id), eq(userVocabularyState.userId, userId)))
        .where(and(eq(vocabulary.chapterId, word.chapterId), eq(vocabulary.level, word.level)));
      if (mastery && mastery.total > 0 && mastery.known === mastery.total) {
        const points = word.level === "C1" ? 100 : 50;
        const inserted = await tx.insert(xpEvents).values({ id: crypto.randomUUID(), userId: userId, eventType: `chapter_${word.level.toLowerCase()}_mastery`, points, chapterId: word.chapterId, studySessionId: sessionId, dedupeKey: xpDedupe.chapter(userId, word.chapterId, word.level) }).onConflictDoNothing().returning({ id: xpEvents.id });
        xpAwarded += inserted.length * points;
      }
    }

    const [knownCounts] = await tx.select({
      all: sql<number>`count(*)::int`,
      c2: sql<number>`count(*) filter (where ${vocabulary.level} = 'C2')::int`,
    }).from(userVocabularyState).innerJoin(vocabulary, eq(vocabulary.id, userVocabularyState.vocabularyId))
      .where(and(eq(userVocabularyState.userId, userId), eq(userVocabularyState.status, "known")));
    const c1Mastered = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from (
        select v.chapter_id
        from vocabulary v
        left join user_vocabulary_state s on s.vocabulary_id = v.id and s.user_id = ${userId}
        where v.level = 'C1' and v.chapter_id is not null
        group by v.chapter_id
        having count(*) = count(*) filter (where s.status = 'known')
      ) mastered
    `);
    const completedDates = await tx.select({ localDate: dailyActivity.localDate }).from(dailyActivity)
      .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.dailyGoalCompleted, true))).orderBy(asc(dailyActivity.localDate));
    const streak = calculateCurrentStreak(completedDates.map((row) => row.localDate), localDate);
    const badgeIds = [
      ...(complete ? ["first-session"] : []),
      ...(streak >= 7 ? ["streak-7"] : []),
      ...(streak >= 30 ? ["streak-30"] : []),
      ...(knownCounts.all >= 100 ? ["known-100"] : []),
      ...(knownCounts.all >= 500 ? ["known-500"] : []),
      ...(knownCounts.all >= 1000 ? ["known-1000"] : []),
      ...(Number(c1Mastered[0]?.count ?? 0) >= 1 ? ["first-c1-chapter"] : []),
      ...(Number(c1Mastered[0]?.count ?? 0) >= 10 ? ["all-c1-chapters"] : []),
      ...(knownCounts.c2 >= 50 ? ["known-c2-50"] : []),
      ...(knownCounts.c2 >= 180 ? ["all-c2"] : []),
    ];
    for (const badgeId of badgeIds) await tx.insert(userBadges).values({ userId: userId, badgeId, awardedAt: now }).onConflictDoNothing();
  return xpAwarded;
}

