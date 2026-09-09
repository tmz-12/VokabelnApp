export type SelectableWord = {
  id: string;
  status: "new" | "learning" | "known";
  favorite: boolean;
  isKey: boolean;
  level: "C1" | "C2";
  sourceOrder: number;
  lastReviewedAt: Date | null;
};

export type StudyMode = "continue" | "new" | "learning" | "known-review" | "favorites" | "priority" | "c2-upgrade";

export function selectSessionItems(words: SelectableWord[], mode: StudyMode, size: number): SelectableWord[] {
  const eligible = words.filter((word) => {
    if (mode === "continue") return word.status !== "known";
    if (mode === "new") return word.status === "new";
    if (mode === "learning") return word.status === "learning";
    if (mode === "known-review") return word.status === "known";
    if (mode === "favorites") return word.favorite;
    if (mode === "priority") return word.isKey;
    return word.level === "C2";
  });
  return eligible.sort((a, b) => {
    const rank = (word: SelectableWord) => word.status === "learning" ? 0 : word.status === "new" ? 1 : 2;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.status === "learning" && b.status === "learning") {
      return (a.lastReviewedAt?.getTime() ?? 0) - (b.lastReviewedAt?.getTime() ?? 0) || a.sourceOrder - b.sourceOrder;
    }
    return a.sourceOrder - b.sourceOrder;
  }).slice(0, Math.max(0, size));
}

export function requeueAfterLearning(queue: string[], currentPosition: number, vocabularyId: string, requeueCount: number) {
  if (requeueCount >= 3) return queue;
  const insertionIndex = Math.min(queue.length, currentPosition + 1 + Math.min(5, Math.max(0, queue.length - currentPosition - 1)));
  return [...queue.slice(0, insertionIndex), vocabularyId, ...queue.slice(insertionIndex)];
}
