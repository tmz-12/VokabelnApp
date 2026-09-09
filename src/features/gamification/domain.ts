export function xpThresholdForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new RangeError("level must be a positive integer");
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

export function levelFromXp(xp: number) {
  const totalXp = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= totalXp) level += 1;
  const floor = xpThresholdForLevel(level);
  const ceiling = xpThresholdForLevel(level + 1);
  return { level, totalXp, current: totalXp - floor, span: ceiling - floor, remaining: ceiling - totalXp };
}

export const xpDedupe = {
  firstKnown: (userId: string, vocabularyId: string) => `known:first:${userId}:${vocabularyId}`,
  knownReview: (userId: string, vocabularyId: string, localDate: string) => `known:review:${userId}:${vocabularyId}:${localDate}`,
  session: (userId: string, sessionId: string) => `session:${userId}:${sessionId}`,
  dailyGoal: (userId: string, localDate: string) => `daily-goal:${userId}:${localDate}`,
  chapter: (userId: string, chapterId: string, level: "C1" | "C2") => `chapter:${level}:${userId}:${chapterId}`,
};

export function uniqueReviewCount(ids: Iterable<string>) {
  return new Set(ids).size;
}

export function calculateCurrentStreak(completedLocalDates: string[], today: string): number {
  const days = new Set(completedLocalDates);
  const cursor = new Date(`${today}T12:00:00Z`);
  const yesterday = new Date(cursor);
  yesterday.setUTCDate(cursor.getUTCDate() - 1);
  if (!days.has(today) && !days.has(yesterday.toISOString().slice(0, 10))) return 0;
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
