import { describe, expect, it } from "vitest";
import { calculateCurrentStreak, levelFromXp, uniqueReviewCount, xpDedupe, xpThresholdForLevel } from "@/features/gamification/domain";
import { requeueAfterLearning, selectSessionItems } from "@/features/study/domain";
import { mergeEffectiveContent, progress, translationsForLocale } from "@/features/vocabulary/domain";

describe("gamification", () => {
  it("calculates cumulative XP thresholds and levels", () => {
    expect(xpThresholdForLevel(1)).toBe(0);
    expect(xpThresholdForLevel(2)).toBe(100);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
  });
  it("builds stable anti-farming keys", () => {
    expect(xpDedupe.firstKnown("u", "v")).toBe(xpDedupe.firstKnown("u", "v"));
    expect(xpDedupe.knownReview("u", "v", "2026-09-08")).not.toBe(xpDedupe.knownReview("u", "v", "2026-09-09"));
  });
  it("counts daily words once and calculates a streak", () => {
    expect(uniqueReviewCount(["a", "a", "b"])).toBe(2);
    expect(calculateCurrentStreak(["2026-09-06", "2026-09-07", "2026-09-08"], "2026-09-08")).toBe(3);
  });
});

describe("study", () => {
  const words = [
    { id: "new-2", status: "new" as const, favorite: false, isKey: false, level: "C1" as const, sourceOrder: 2, lastReviewedAt: null },
    { id: "learn-newer", status: "learning" as const, favorite: true, isKey: true, level: "C1" as const, sourceOrder: 3, lastReviewedAt: new Date("2026-01-02") },
    { id: "learn-old", status: "learning" as const, favorite: false, isKey: false, level: "C2" as const, sourceOrder: 1, lastReviewedAt: new Date("2026-01-01") },
    { id: "known", status: "known" as const, favorite: true, isKey: false, level: "C1" as const, sourceOrder: 4, lastReviewedAt: null },
  ];
  it("prioritizes oldest learning words before source-ordered new words", () => {
    expect(selectSessionItems(words, "continue", 3).map((word) => word.id)).toEqual(["learn-old", "learn-newer", "new-2"]);
  });
  it("requeues after intervening cards and caps at three", () => {
    const queue = ["a", "b", "c", "d", "e", "f", "g"];
    expect(requeueAfterLearning(queue, 0, "a", 0)[6]).toBe("a");
    expect(requeueAfterLearning(queue, 0, "a", 3)).toEqual(queue);
  });
});

describe("vocabulary", () => {
  const canonical = { english: "original", traditionalChinese: "原文", examplesGerman: ["Original."] };
  it("merges only present user overrides", () => {
    expect(mergeEffectiveContent(canonical, { englishOverride: "mine", traditionalChineseOverride: null })).toEqual({ ...canonical, english: "mine" });
    expect(mergeEffectiveContent(canonical, {englishOverride:" ", examplesGermanOverride:[]})).toEqual(canonical);
  });
  it("uses locale translation priority", () => {
    expect(translationsForLocale(canonical, "en").primary).toBe("original");
    expect(translationsForLocale(canonical, "de").primary).toBe("原文");
    expect(translationsForLocale(canonical, "zh-TW").primary).toBe("原文");
  });
  it("keeps C1/C2 progress independently calculable", () => {
    expect(progress(3, 4)).toEqual({ known: 3, total: 4, percent: 75 });
    expect(progress(0, 0).percent).toBe(0);
  });
});
