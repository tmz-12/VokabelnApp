import { ArrowRight, Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { JourneyAtlas } from "@/features/chapters/journey-atlas";
import { getHomeData } from "@/features/app/data";
import { Link } from "@/i18n/navigation";
import { requireUserWithProfile } from "@/lib/session";

export default async function HomePage() {
  const { user, profile } = await requireUserWithProfile();
  const data = await getHomeData(user.id, profile.timezone);
  const t = await getTranslations();
  const goalPercent = Math.min(100, Math.round(data.todayReviewed / profile.dailyGoalWords * 100));
  const activeChapter = data.active?.chapterId ? data.chapters.find((chapter) => chapter.chapterId === data.active?.chapterId) : undefined;
  return <>
    <header className="home-masthead"><div><p className="eyebrow">{t("home.greeting", { name: user.name.split(" ")[0] })}</p><div className="gamification-line"><span className="streak"><Flame aria-hidden="true" size={19}/>{t("home.streak", { days: data.streak })}</span><span>{t("common.level", { level: data.level.level })} · {t("common.xp", { xp: data.level.totalXp })}</span></div></div><div className="level-progress" aria-label={`${data.level.current} / ${data.level.span}`}><span style={{ width: `${data.level.current / data.level.span * 100}%` }}/></div></header>
    <section className="continue-strip"><div className="continue-copy"><p>{t("home.continueTitle")}</p><h1>{activeChapter ? t("common.chapter", { number: activeChapter.chapterNumber }) : t("common.chapter", { number: data.recommendedChapter.chapterNumber })}</h1>{data.active ? <span>{t("home.baseProgress", { current: data.baseCompleted, total: data.active.baseItemCount })}</span> : <span>{t("home.noSession")}</span>}</div><div className="daily"><div><span>{t("home.dailyGoal")}</span><strong className="tabular">{data.todayReviewed} / {profile.dailyGoalWords}</strong></div><div className="progress-track"><span className="progress-fill" style={{ width: `${goalPercent}%` }}/></div></div><Link className="button button-primary" href={data.active ? `/study/${data.active.id}` : `/chapter/${data.recommendedChapter.chapterNumber}`}>{data.active ? t("home.resume") : t("common.continue")}<ArrowRight aria-hidden="true" size={18}/></Link></section>
    <section className="journey-section"><div className="journey-heading"><div><h2 className="section-title">{t("home.atlasTitle")}</h2><p className="lede">{t("home.atlasBody")}</p></div><span className="chapter-count tabular">01—10</span></div><JourneyAtlas chapters={data.chapters} activeChapter={activeChapter?.chapterNumber ?? data.recommendedChapter.chapterNumber}/></section>
  </>;
}
