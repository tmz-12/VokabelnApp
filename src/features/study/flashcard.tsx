"use client";

import { useEffect, useState, useTransition } from "react";
import { Diamond, Star as Heart, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { answerStudyCard, toggleFavorite } from "@/features/app/actions";
import { usePronunciation } from "@/features/vocabulary/use-pronunciation";
import { mergeEffectiveContent, translationsForLocale } from "@/features/vocabulary/domain";

type CardWord = {
  id: string; headword: string; german: string; english: string; traditionalChinese: string; formsRaw: string | null;
  examplesGerman: string[]; chunks: unknown[]; sourceReference: string | null; sourcePage: number; level: "C1" | "C2";
  isKey: boolean; isC2Upgrade: boolean; favorite: boolean; englishOverride: string | null;
  traditionalChineseOverride: string | null; examplesGermanOverride: string[] | null;
};

export function Flashcard({ sessionId, word, current, total, baseCurrent, baseTotal, secondaryVisible, soundsEnabled }: { sessionId: string; word: CardWord; current: number; total: number; baseCurrent: number; baseTotal: number; secondaryVisible: boolean; soundsEnabled: boolean }) {
  const t = useTranslations("study");
  const common = useTranslations("common");
  const locale = useLocale() as "de" | "en" | "zh-TW";
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [favorite, setFavorite] = useState(word.favorite);
  const [failed, setFailed] = useState(false);
  const errors = useTranslations("error");
  const [pending, startTransition] = useTransition();
  const effective = mergeEffectiveContent(word, word);
  const translations = translationsForLocale(effective, locale);
  const { available: speechAvailable, speak } = usePronunciation(word.headword);
  function favoriteToggle() { setFavorite((value) => !value); toggleFavorite(word.id).catch(() => setFavorite((value) => !value)); }
  function answer(outcome: "learning" | "known") { if (!revealed || pending) return; startTransition(async () => { setFailed(false); try { await answerStudyCard({ sessionId, position: current - 1, outcome }); if (soundsEnabled && outcome === "known") playSuccessTone(); router.refresh(); } catch { setFailed(true); } }); }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.code === "Space") { event.preventDefault(); setRevealed(true); }
      if (event.key === "1") answer("learning");
      if (event.key === "2") answer("known");
      if (event.key.toLowerCase() === "s") favoriteToggle();
      if (event.key.toLowerCase() === "p") speak();
    }
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  return <div className="study-view">{failed && <p className="form-error" role="alert">{errors("mutation")}</p>}<header className="study-progress"><div><span className="tabular">{t("progress", { current, total })}</span><span className="tabular">{t("base", { current: baseCurrent, total: baseTotal })}</span></div><div className="progress-track"><span className="progress-fill" style={{ width: `${Math.min(100, current / total * 100)}%` }}/></div></header><div className="flashcard-stage"><div className={`flashcard ${revealed ? "revealed" : ""}`}><section className="card-front" aria-hidden={revealed}><div className="card-tools"><button className="icon-button" onClick={favoriteToggle} aria-pressed={favorite} aria-label={favorite ? t("favoriteRemove") : t("favoriteAdd")}><Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"}/></button><button className="icon-button" onClick={speak} disabled={!speechAvailable} aria-label={t("speak")}><Volume2 aria-hidden="true"/></button></div><div className="word-center"><div className="card-tags">{word.isKey && <span className="tag tag-priority"><Diamond aria-hidden="true" size={11}/>{common("priority")}</span>}{word.level === "C2" && <span className="tag tag-c2">C2</span>}</div><h1>{word.headword}</h1><p>{word.german !== word.headword ? word.german : ""}</p></div><button className="reveal-button" onClick={() => setRevealed(true)}>{t("flip")}<span>{t("frontHint")}</span></button></section><section className="card-back" aria-hidden={!revealed}><div className="meaning-large"><strong>{translations.primary}</strong>{secondaryVisible && <span>{translations.secondary}</span>}</div>{word.formsRaw && <CardSection title={t("forms")}><p>{word.formsRaw}</p></CardSection>}{effective.examplesGerman.length > 0 && <CardSection title={t("examples")}><ul>{effective.examplesGerman.map((item, index) => <li key={index}>{item}</li>)}</ul></CardSection>}{word.chunks.length > 0 && <CardSection title={t("chunks")}><ul>{word.chunks.map((item, index) => <li key={index}>{String(item)}</li>)}</ul></CardSection>}<details><summary>{t("source")}</summary><span>{word.sourceReference ?? "—"} · p. {word.sourcePage}</span></details></section></div></div><div className={`answer-bar ${revealed ? "visible" : ""}`} aria-hidden={!revealed}><button className="answer learning" onClick={() => answer("learning")} disabled={!revealed || pending}><kbd>1</kbd>{t("learning")}</button><button className="answer known" onClick={() => answer("known")} disabled={!revealed || pending}><kbd>2</kbd>{t("known")}</button></div><p className="shortcut-hint">{t("shortcuts")}</p></div>;
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card-section"><h2>{title}</h2>{children}</section>; }

function playSuccessTone() {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.frequency.setValueAtTime(520, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(720, context.currentTime + .09);
  gain.gain.setValueAtTime(.035, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .12);
  oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .12);
  oscillator.onended = () => { void context.close(); };
}
