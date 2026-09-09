import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  studySessions,
  user,
  userProfiles,
  userVocabularyState,
  vocabulary,
  vocabularyOverrides,
  xpEvents,
} from "@/db/schema";

const runId = crypto.randomUUID();
const firstUser = `integration-a-${runId}`;
const secondUser = `integration-b-${runId}`;
let wordId = "";

describe("PostgreSQL integration", () => {
  beforeAll(async () => {
    const [counts] = await db.select({
      all: sql<number>`count(*)::int`,
      c1: sql<number>`count(*) filter (where ${vocabulary.level} = 'C1')::int`,
      c2: sql<number>`count(*) filter (where ${vocabulary.level} = 'C2')::int`,
      priority: sql<number>`count(*) filter (where ${vocabulary.isKey})::int`,
      unassigned: sql<number>`count(*) filter (where ${vocabulary.chapterId} is null)::int`,
    }).from(vocabulary);
    expect(counts).toEqual({ all: 3450, c1: 3270, c2: 180, priority: 350, unassigned: 1 });
    const [word] = await db.select({ id: vocabulary.id }).from(vocabulary).limit(1);
    wordId = word.id;
    await db.insert(user).values([
      { id: firstUser, name: "Integration A", email: `${firstUser}@local.test` },
      { id: secondUser, name: "Integration B", email: `${secondUser}@local.test` },
    ]);
    await db.insert(userProfiles).values([{ userId: firstUser }, { userId: secondUser }]);
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, firstUser));
    await db.delete(user).where(eq(user.id, secondUser));
  });

  it("keeps favorite, status, and overrides isolated by user", async () => {
    await db.insert(userVocabularyState).values({ userId: firstUser, vocabularyId: wordId, favorite: true, status: "learning" });
    await db.insert(vocabularyOverrides).values({ id: crypto.randomUUID(), userId: firstUser, vocabularyId: wordId, englishOverride: "private meaning" });

    const [firstState] = await db.select().from(userVocabularyState).where(and(eq(userVocabularyState.userId, firstUser), eq(userVocabularyState.vocabularyId, wordId)));
    const secondState = await db.select().from(userVocabularyState).where(and(eq(userVocabularyState.userId, secondUser), eq(userVocabularyState.vocabularyId, wordId)));
    const secondOverride = await db.select().from(vocabularyOverrides).where(and(eq(vocabularyOverrides.userId, secondUser), eq(vocabularyOverrides.vocabularyId, wordId)));
    expect(firstState).toMatchObject({ favorite: true, status: "learning" });
    expect(secondState).toHaveLength(0);
    expect(secondOverride).toHaveLength(0);

    await db.update(userVocabularyState).set({ favorite: false, status: "known" }).where(and(eq(userVocabularyState.userId, firstUser), eq(userVocabularyState.vocabularyId, wordId)));
    const [updated] = await db.select().from(userVocabularyState).where(and(eq(userVocabularyState.userId, firstUser), eq(userVocabularyState.vocabularyId, wordId)));
    expect(updated).toMatchObject({ favorite: false, status: "known" });
  });

  it("resumes an active cursor and deduplicates completion XP", async () => {
    const sessionId = crypto.randomUUID();
    await db.insert(studySessions).values({ id: sessionId, userId: firstUser, mode: "continue", requestedSize: 5, baseItemCount: 1, queue: [wordId], currentPosition: 0 });
    await db.update(studySessions).set({ currentPosition: 1 }).where(eq(studySessions.id, sessionId));
    const [resumed] = await db.select().from(studySessions).where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, firstUser)));
    expect(resumed).toMatchObject({ currentPosition: 1, status: "active" });
    await db.update(studySessions).set({ status: "completed", completedAt: new Date() }).where(eq(studySessions.id, sessionId));

    const dedupeKey = `session:${firstUser}:${sessionId}`;
    await db.insert(xpEvents).values({ id: crypto.randomUUID(), userId: firstUser, eventType: "session_complete", points: 20, studySessionId: sessionId, dedupeKey }).onConflictDoNothing();
    await db.insert(xpEvents).values({ id: crypto.randomUUID(), userId: firstUser, eventType: "session_complete", points: 20, studySessionId: sessionId, dedupeKey }).onConflictDoNothing();
    const events = await db.select().from(xpEvents).where(and(eq(xpEvents.userId, firstUser), eq(xpEvents.dedupeKey, dedupeKey)));
    expect(events).toHaveLength(1);
  });
});
