import { notFound } from "next/navigation";
import { getHomeData, getSessionResult, getStudySession } from "@/features/app/data";
import { Flashcard } from "@/features/study/flashcard";
import { SessionResult } from "@/features/study/session-result";
import { requireUserWithProfile } from "@/lib/session";

export default async function StudyPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { user, profile } = await requireUserWithProfile();
  const study = await getStudySession(user.id, sessionId);
  if (!study || study.session.status === "abandoned") notFound();
  if (study.session.status === "completed") {
    const [result, home] = await Promise.all([getSessionResult(user.id, sessionId), getHomeData(user.id, profile.timezone)]);
    if (!result) notFound();
    return <SessionResult result={result} sessionSize={profile.sessionSize} streak={home.streak}/>;
  }
  if (!study.current || !study.item) notFound();
  return <Flashcard key={`${sessionId}:${study.session.currentPosition}`} sessionId={sessionId} word={study.current} current={study.session.currentPosition + 1} total={study.session.queue.length} baseCurrent={study.baseCurrent} baseTotal={study.session.baseItemCount} secondaryVisible={profile.secondaryTranslationVisible} soundsEnabled={profile.soundEffectsEnabled}/>;
}
