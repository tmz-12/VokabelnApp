"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { startStudySession } from "@/features/app/actions";
import type { StudyMode } from "@/features/study/domain";

export function StartSessionButton({ chapterNumber, mode, size, children, className = "button button-secondary" }: { chapterNumber?: number; mode: StudyMode; size: number; children: React.ReactNode; className?: string }) {
  const locale = useLocale() as "de" | "en" | "zh-TW";
  const t = useTranslations("study");
  const [pending, startTransition] = useTransition();
  const [empty, setEmpty] = useState(false);
  return <div className="start-action"><button className={className} disabled={pending} onClick={() => startTransition(async () => { const result = await startStudySession({ chapterNumber, mode, size, locale }); if (result?.ok === false) setEmpty(true); })}>{children}<ArrowRight aria-hidden="true" size={18}/></button>{empty && <span className="error" role="status">{t("emptyMode")}</span>}</div>;
}
