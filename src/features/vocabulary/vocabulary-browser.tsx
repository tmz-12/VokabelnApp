"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Diamond, Star as Heart, Pencil, RotateCcw, Volume2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { resetOverride, saveOverride, setVocabularyStatus, toggleFavorite } from "@/features/app/actions";
import { usePronunciation } from "@/features/vocabulary/use-pronunciation";
import { mergeEffectiveContent, translationsForLocale } from "@/features/vocabulary/domain";

export type VocabularyView = {
  id: string; headword: string; german: string; english: string; traditionalChinese: string; formsRaw: string | null;
  examplesGerman: string[]; chunks: unknown[]; sourceReference: string | null; sourcePage: number; level: "C1" | "C2";
  isKey: boolean; isC2Upgrade: boolean; status: "new" | "learning" | "known"; favorite: boolean;
  englishOverride: string | null; traditionalChineseOverride: string | null; examplesGermanOverride: string[] | null;
  chapterNumber?: number | null;
};

const filters = ["all", "new", "learning", "known", "priority", "c2", "favorites"] as const;

export function VocabularyBrowser({ words, secondaryVisible = true, showFilters = true, favoritesOnly = false }: { words: VocabularyView[]; secondaryVisible?: boolean; showFilters?: boolean; favoritesOnly?: boolean }) {
  const t = useTranslations();
  const locale = useLocale() as "de" | "en" | "zh-TW";
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [chapterFilter, setChapterFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [mutationError, setMutationError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localWords, setLocalWords] = useState(words);
  const [visibleLimit, setVisibleLimit] = useState(80);
  const selected = localWords.find((word) => word.id === selectedId);
  const visible = useMemo(() => localWords.filter((word) => (!favoritesOnly || word.favorite) && (!chapterFilter || String(word.chapterNumber) === chapterFilter) && (!levelFilter || word.level === levelFilter) && (filter === "all" || filter === word.status || filter === "priority" && word.isKey || filter === "c2" && word.level === "C2" || filter === "favorites" && word.favorite)), [filter, localWords, favoritesOnly, chapterFilter, levelFilter]);
  const displayed = visible.slice(0, visibleLimit);

  function setFavorite(id: string) {
    setLocalWords((current) => current.map((word) => word.id === id ? { ...word, favorite: !word.favorite } : word));
    toggleFavorite(id).catch(() => setLocalWords((current) => current.map((word) => word.id === id ? { ...word, favorite: !word.favorite } : word)));
  }
  function setStatus(id: string, status: "new" | "learning" | "known") {
    setMutationError(false);
    setVocabularyStatus(id, status).then(() => setLocalWords((current) => current.map((word) => word.id === id ? { ...word, status } : word))).catch(() => setMutationError(true));
  }

  return <div className="vocab-browser">{mutationError && <p role="alert">{t("error.body")}</p>}{favoritesOnly && <div className="search-filters"><select className="select" aria-label={t("search.allChapters")} value={chapterFilter} onChange={(event) => { setChapterFilter(event.target.value); setVisibleLimit(80); }}><option value="">{t("search.allChapters")}</option>{Array.from({length:10}, (_, i) => <option key={i} value={i + 1}>{t("common.chapter", {number:i + 1})}</option>)}<option value="null">{t("common.unassigned")}</option></select><select className="select" aria-label={t("search.allLevels")} value={levelFilter} onChange={(event) => { setLevelFilter(event.target.value); setVisibleLimit(80); }}><option value="">{t("search.allLevels")}</option><option>C1</option><option>C2</option></select></div>}{showFilters && <div className="chip-row vocab-filters" role="group" aria-label={t("common.filterVocabulary")}>{filters.map((value) => <button className="chip" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setVisibleLimit(80); }}>{filterLabel(value, t)}</button>)}</div>}<div className="vocab-count muted tabular">{visible.length} {t("common.words")}</div><div className="vocab-list">{displayed.map((word) => {
    const effective = mergeEffectiveContent(word, word);
    const translations = translationsForLocale(effective, locale);
    return <article className="vocab-row" key={word.id}><button className="vocab-open" onClick={() => setSelectedId(word.id)} aria-label={`${t("detail.title")}: ${word.headword}`}><div className="vocab-german"><strong>{word.headword}</strong><span>{word.german}</span></div><div className="vocab-meaning"><strong>{translations.primary}</strong>{secondaryVisible && <span>{translations.secondary}</span>}</div><div className="vocab-tags">{word.chapterNumber !== undefined && <span className="tag">{word.chapterNumber === null ? t("common.unassigned") : t("common.chapter", { number: word.chapterNumber })}</span>}{word.isKey && <span className="tag tag-priority"><Diamond aria-hidden="true" size={11}/>{t("common.priority")}</span>}{word.level === "C2" && <span className="tag tag-c2">C2</span>}<span className={`state state-${word.status}`}>{t(`chapter.status${word.status === "new" ? "New" : word.status === "learning" ? "Learning" : "Known"}`)}</span></div></button><button className="icon-button row-favorite" onClick={() => setFavorite(word.id)} aria-label={word.favorite ? t("study.favoriteRemove") : t("study.favoriteAdd")} aria-pressed={word.favorite}><Heart aria-hidden="true" size={21} fill={word.favorite ? "currentColor" : "none"}/></button></article>;
  })}{visible.length === 0 && <div className="empty-state"><p>{t("chapter.empty")}</p></div>}</div>{displayed.length < visible.length && <button className="button button-secondary show-more" onClick={() => setVisibleLimit((value) => value + 80)}>{t("common.showMore")} · {visible.length - displayed.length}</button>}{selected && <VocabularySheet word={selected} locale={locale} secondaryVisible={secondaryVisible} onClose={() => setSelectedId(null)} onFavorite={() => setFavorite(selected.id)} onStatus={(status) => setStatus(selected.id, status)} onOverride={(override) => setLocalWords((current) => current.map((word) => word.id === selected.id ? { ...word, ...override } : word))}/>}</div>;
}

function filterLabel(value: (typeof filters)[number], t: ReturnType<typeof useTranslations>) {
  const map = { all: "chapter.all", new: "chapter.statusNew", learning: "chapter.statusLearning", known: "chapter.statusKnown", priority: "common.priority", c2: "common.c2", favorites: "nav.favorites" } as const;
  return t(map[value]);
}

function VocabularySheet({ word, locale, secondaryVisible, onClose, onFavorite, onStatus, onOverride }: { word: VocabularyView; locale: "de" | "en" | "zh-TW"; secondaryVisible: boolean; onClose: () => void; onFavorite: () => void; onStatus: (status: "new" | "learning" | "known") => void; onOverride: (override: Partial<VocabularyView>) => void }) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const sheet = document.querySelector<HTMLElement>(".word-sheet");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet?.querySelector<HTMLElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !sheet) return;
      const controls = Array.from(sheet.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, summary, a[href]')).filter((element) => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  const effective = mergeEffectiveContent(word, word);
  const translations = translationsForLocale(effective, locale);
  const { available: speechAvailable, speak } = usePronunciation(word.headword);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const override = { englishOverride: String(data.get("english")), traditionalChineseOverride: String(data.get("chinese")), examplesGermanOverride: String(data.get("examples")).split("\n").map((line) => line.trim()).filter(Boolean) };
    startTransition(async () => { await saveOverride({ vocabularyId: word.id, english: override.englishOverride, chinese: override.traditionalChineseOverride, examples: override.examplesGermanOverride }); onOverride(override); setEditing(false); });
  }
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="word-sheet" role="dialog" aria-modal="true" aria-labelledby="word-sheet-title"><header className="sheet-header"><div><p className="eyebrow">{t("detail.title")}</p><h2 id="word-sheet-title">{word.headword}</h2></div><button className="icon-button" onClick={onClose} aria-label={t("common.close")}><X aria-hidden="true"/></button></header><div className="sheet-body"><div className="word-actions"><button className="icon-button" onClick={onFavorite} aria-pressed={word.favorite} aria-label={word.favorite ? t("study.favoriteRemove") : t("study.favoriteAdd")}><Heart aria-hidden="true" fill={word.favorite ? "currentColor" : "none"}/></button><button className="icon-button" onClick={speak} disabled={!speechAvailable} aria-label={t("study.speak")}><Volume2 aria-hidden="true"/></button>{word.isKey && <span className="tag tag-priority"><Diamond aria-hidden="true" size={11}/>{t("common.priority")}</span>}{word.level === "C2" && <span className="tag tag-c2">C2</span>}</div><p className="full-german">{word.german}</p><section className="meaning-block"><p className="eyebrow">{t("detail.translation")}</p><strong>{translations.primary}</strong>{secondaryVisible && <span>{translations.secondary}</span>}</section>{word.formsRaw && <DetailSection title={t("study.forms")}><p>{word.formsRaw}</p></DetailSection>}{effective.examplesGerman.length > 0 && <DetailSection title={t("study.examples")}><ul>{effective.examplesGerman.map((example, index) => <li key={index}>{example}</li>)}</ul></DetailSection>}{word.chunks.length > 0 && <DetailSection title={t("study.chunks")}><ul>{word.chunks.map((chunk, index) => <li key={index}>{String(chunk)}</li>)}</ul></DetailSection>}<DetailSection title={t("detail.status")}><div className="segmented">{(["new", "learning", "known"] as const).map((status) => <button key={status} aria-pressed={word.status === status} onClick={() => onStatus(status)}>{t(`chapter.status${status === "new" ? "New" : status === "learning" ? "Learning" : "Known"}`)}</button>)}</div></DetailSection>{editing ? <form className="override-form" onSubmit={submit}><div className="field"><label htmlFor="override-en">{t("detail.english")}</label><textarea className="textarea" id="override-en" name="english" defaultValue={word.englishOverride ?? word.english} maxLength={2000}/></div><div className="field"><label htmlFor="override-zh">{t("detail.chinese")}</label><textarea className="textarea" id="override-zh" name="chinese" defaultValue={word.traditionalChineseOverride ?? word.traditionalChinese} maxLength={2000}/></div><div className="field"><label htmlFor="override-examples">{t("detail.examples")}</label><textarea className="textarea" id="override-examples" name="examples" defaultValue={effective.examplesGerman.join("\n")} aria-describedby="example-hint"/><span id="example-hint" className="helper">{t("detail.exampleHint")}</span></div><div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(false)}>{t("common.cancel")}</button><button className="button button-primary" disabled={pending}>{t("common.save")}</button></div></form> : <button className="button button-secondary" onClick={() => setEditing(true)}><Pencil aria-hidden="true" size={17}/>{t("detail.edit")}</button>}{(word.englishOverride || word.traditionalChineseOverride || word.examplesGermanOverride) && <button className="button button-danger" onClick={() => startTransition(async () => { await resetOverride(word.id); onOverride({ englishOverride: null, traditionalChineseOverride: null, examplesGermanOverride: null }); })}><RotateCcw aria-hidden="true" size={17}/>{t("detail.reset")}</button>}<details className="source-details"><summary>{t("detail.source")}</summary><p>{word.sourceReference ?? t("common.unassigned")} · p. {word.sourcePage}</p></details></div></aside></div>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="detail-section"><h3>{title}</h3>{children}</section>; }
