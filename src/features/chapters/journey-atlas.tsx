"use client";

import { useState } from "react";
import { ArrowUpRight, Diamond, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { progress } from "@/features/vocabulary/domain";

type ChapterProgress = { chapterNumber: number; chapterId: string; c1Total: number; c1Known: number; c2Total: number; c2Known: number; priorityTotal: number };

const positions = [
  [18, 7], [68, 15], [37, 25], [76, 35], [24, 45], [60, 55], [31, 65], [74, 74], [42, 84], [73, 94],
];
const path = "M18 7 C30 8 52 13 68 15 S51 23 37 25 S62 32 76 35 S40 41 24 45 S44 52 60 55 S43 62 31 65 S55 71 74 74 S59 81 42 84 S60 91 73 94";

export function JourneyAtlas({ chapters, activeChapter }: { chapters: ChapterProgress[]; activeChapter: number }) {
  const t = useTranslations();
  const [selected, setSelected] = useState<number | null>(null);
  const selectedChapter = chapters.find((chapter) => chapter.chapterNumber === selected);
  return <div className="atlas-wrap"><div className="atlas-map">
    <svg className="atlas-route" viewBox="0 0 100 102" preserveAspectRatio="none" aria-hidden="true"><path className="route-under" d={path}/><path className="route-over" d={path}/></svg>
    {chapters.map((chapter, index) => {
      const [x, y] = positions[index];
      const c1 = progress(chapter.c1Known, chapter.c1Total);
      return <button key={chapter.chapterId} className={`station station-${index + 1}`} style={{ left: `${x}%`, top: `${y}%`, "--station-progress": `${c1.percent * 3.6}deg` } as React.CSSProperties} aria-current={chapter.chapterNumber === activeChapter ? "step" : undefined} aria-expanded={selected === chapter.chapterNumber} aria-controls="chapter-preview" onClick={() => setSelected((current) => current === chapter.chapterNumber ? null : chapter.chapterNumber)}><span className="station-ring"><span>{chapter.chapterNumber}</span></span><span className="station-label">{t("common.chapter", { number: chapter.chapterNumber })}<small>{c1.percent}%</small></span></button>;
    })}
  </div>{selectedChapter && <aside className="chapter-preview" id="chapter-preview"><button className="icon-button preview-close" onClick={() => setSelected(null)} aria-label={t("common.close")}><X aria-hidden="true" size={20}/></button><p className="eyebrow">{t("common.chapter", { number: selectedChapter.chapterNumber })}</p><div className="preview-mastery"><strong className="tabular">{progress(selectedChapter.c1Known, selectedChapter.c1Total).percent}%</strong><span>{t("home.mastery")}</span></div><div className="preview-lines"><p><span>{t("home.mastery")}</span><strong className="tabular">{selectedChapter.c1Known} / {selectedChapter.c1Total}</strong></p><p><span>{t("home.c2Progress")}</span><strong className="tabular">{selectedChapter.c2Known} / {selectedChapter.c2Total}</strong></p><p><span><Diamond aria-hidden="true" size={12}/>{t("common.priority")}</span><strong>{selectedChapter.priorityTotal}</strong></p></div><Link className="button button-primary" href={`/chapter/${selectedChapter.chapterNumber}`}>{t("home.openChapter")}<ArrowUpRight aria-hidden="true" size={18}/></Link></aside>}</div>;
}
