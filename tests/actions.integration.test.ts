import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyActivity, studySessionItems, studySessions, user, userProfiles, userVocabularyState, vocabulary, xpEvents } from "@/db/schema";

const identity = vi.hoisted(() => ({ userId: "" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/session", () => ({ requireUserWithProfile: async () => {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, identity.userId));
  return { user: { id: identity.userId }, profile };
} }));
import { answerStudyCard, setVocabularyStatus, toggleFavorite } from "@/features/app/actions";
import { getHomeData, getSessionResult, getStudySession } from "@/features/app/data";

const owner = `actions-${crypto.randomUUID()}`;
const other = `actions-${crypto.randomUUID()}`;
let wordId = "";
const sessionId = crypto.randomUUID();

describe("authenticated server actions against PostgreSQL", () => {
  beforeAll(async () => {
    await db.insert(user).values([owner, other].map((id) => ({id, name:"Test learner", email:`${id}@local.test`})));
    await db.insert(userProfiles).values([owner, other].map((userId) => ({userId, dailyGoalWords:1})));
    const [word] = await db.select().from(vocabulary).limit(1);
    wordId = word.id;
    identity.userId = owner;
  });
  afterAll(async () => {
    for (const id of [owner, other]) await db.delete(user).where(eq(user.id, id));
  });

  it("awards manual first-known XP once while preserving favorites and history", async () => {
    await toggleFavorite(wordId);
    await setVocabularyStatus(wordId, "known");
    const [first] = await db.select().from(userVocabularyState).where(eq(userVocabularyState.userId, owner));
    await setVocabularyStatus(wordId, "new");
    await setVocabularyStatus(wordId, "known");
    const [last] = await db.select().from(userVocabularyState).where(eq(userVocabularyState.userId, owner));
    const events = await db.select().from(xpEvents).where(and(eq(xpEvents.userId, owner), eq(xpEvents.eventType, "first_known")));
    expect(events).toHaveLength(1);
    expect(events[0].points).toBe(10);
    expect(last.firstKnownAt).toEqual(first.firstKnownAt);
    expect(last.favorite).toBe(true);
  });

  it("rejects foreign sessions, persists requeues, rejects stale answers, and includes completion badges", async () => {
    await db.insert(studySessions).values({id:sessionId, userId:owner, mode:"known-review", requestedSize:5, baseItemCount:1, queue:[wordId]});
    await db.insert(studySessionItems).values({id:crypto.randomUUID(), studySessionId:sessionId, vocabularyId:wordId, basePosition:0});
    identity.userId = other;
    expect(await getStudySession(other, sessionId)).toBeNull();
    await expect(answerStudyCard({sessionId, position:0, outcome:"known"})).rejects.toThrow("Active study session not found");
    identity.userId = owner;
    await answerStudyCard({sessionId, position:0, outcome:"learning"});
    await answerStudyCard({sessionId, position:0, outcome:"known"});
    const resumed = await getStudySession(owner, sessionId);
    expect(resumed?.session.currentPosition).toBe(1);
    expect(resumed?.session.queue).toEqual([wordId, wordId]);
    expect((await getHomeData(owner, "Europe/Berlin")).baseCompleted).toBe(1);
    await answerStudyCard({sessionId, position:1, outcome:"known"});
    const result = await getSessionResult(owner, sessionId);
    expect(result?.badges.map((badge) => badge.code)).toContain("first-session");
    expect(result?.known).toBe(1);
    const [day] = await db.select().from(dailyActivity).where(eq(dailyActivity.userId, owner));
    expect(day.uniqueWordsReviewed).toBe(1);
    expect(day.sessionsCompleted).toBe(1);
    const events = await db.select().from(xpEvents).where(and(eq(xpEvents.userId, owner), eq(xpEvents.eventType,"session_complete")));
    expect(events).toHaveLength(1);
  });
});
