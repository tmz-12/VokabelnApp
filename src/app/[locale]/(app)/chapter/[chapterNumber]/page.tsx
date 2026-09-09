import { Diamond } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProgressRing } from "@/components/progress-ring";
import { getChapterData } from "@/features/app/data";
import { StartSessionButton } from "@/features/study/start-session-button";
import { VocabularyBrowser } from "@/features/vocabulary/vocabulary-browser";
import { progress } from "@/features/vocabulary/domain";
import { Link } from "@/i18n/navigation";
import { requireUserWithProfile } from "@/lib/session";

export default async function ChapterPage({ params }: { params: Promise<{ chapterNumber: string }> }) {
  const chapterNumber = Number((await params).chapterNumber);
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 10) notFound();
  const { user, profile } = await requireUserWithProfile();
  const data = await getChapterData(user.id, chapterNumber);
  if (!data) notFound();
  const t = await getTranslations();
  const c1 = progress(data.c1.known, data.c1.total); const c2 = progress(data.c2.known, data.c2.total);
  return <><Link className="back-link" href="/home">← {t("chapter.back")}</Link><header className="chapter-hero"><div><p className="eyebrow">Aspekte neu C1 + C2 Upgrade</p><h1 className="page-title">{t("common.chapter", { number: chapterNumber })}</h1><div className="priority-line"><Diamond aria-hidden="true" size={14}/>{data.priority} {t("common.words")} · {t("common.priority")}</div></div><div className="chapter-rings"><ProgressRing count={`${c1.known} / ${c1.total}`} value={c1.percent} label={t("chapter.c1Progress")}/><ProgressRing count={`${c2.known} / ${c2.total}`} value={c2.percent} label={t("chapter.c2Progress")} tone="cobalt"/></div></header><section className="session-modes"><h2 className="section-title">{t("chapter.actions")}</h2><div className="mode-grid"><StartSessionButton chapterNumber={chapterNumber} mode="continue" size={profile.sessionSize} className="button button-primary">{t("chapter.continue")}</StartSessionButton><StartSessionButton chapterNumber={chapterNumber} mode="new" size={profile.sessionSize}>{t("chapter.new")}</StartSessionButton><StartSessionButton chapterNumber={chapterNumber} mode="learning" size={profile.sessionSize}>{t("chapter.learning")}</StartSessionButton><StartSessionButton chapterNumber={chapterNumber} mode="known-review" size={profile.sessionSize}>{t("chapter.known")}</StartSessionButton><StartSessionButton chapterNumber={chapterNumber} mode="priority" size={profile.sessionSize}>{t("common.priority")}</StartSessionButton><StartSessionButton chapterNumber={chapterNumber} mode="c2-upgrade" size={profile.sessionSize}>{t("common.c2")}</StartSessionButton><StartSessionButton chapterNumber={chapterNumber} mode="favorites" size={profile.sessionSize}>{t("chapter.favorites")}</StartSessionButton></div></section><section className="vocabulary-section"><h2 className="section-title">{t("chapter.vocabulary")}</h2><VocabularyBrowser words={data.words} secondaryVisible={profile.secondaryTranslationVisible}/></section></>;
}
