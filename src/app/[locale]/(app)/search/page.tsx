import { SearchForm } from "@/features/search/search-form";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { searchVocabulary } from "@/features/app/data";
import { VocabularyBrowser } from "@/features/vocabulary/vocabulary-browser";
import { requireUserWithProfile } from "@/lib/session";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { user, profile } = await requireUserWithProfile();
  const t = await getTranslations();
  const chapter = params.chapter ? Number(params.chapter) : undefined;
  const results = await searchVocabulary(user.id, {
    q: params.q,
    chapter: chapter && chapter >= 1 && chapter <= 10 ? chapter : undefined,
    level: params.level === "C1" || params.level === "C2" ? params.level : undefined,
    status: params.status === "new" || params.status === "learning" || params.status === "known" ? params.status : undefined,
    favorite: params.favorite === "true", priority: params.priority === "true",
  }, 3450);
  return <><header className="page-header"><div><h1 className="page-title">{t("search.title")}</h1><p className="lede">{t("search.description")}</p></div></header><SearchForm><label className="search-input"><Search aria-hidden="true" size={21}/><span className="sr-only">{t("search.placeholder")}</span><input name="q" defaultValue={params.q} placeholder={t("search.placeholder")} autoComplete="off"/></label><div className="search-filters"><select className="select" aria-label={t("search.allChapters")} name="chapter" defaultValue={params.chapter ?? ""}><option value="">{t("search.allChapters")}</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{t("common.chapter", { number: index + 1 })}</option>)}</select><select className="select" aria-label={t("search.allLevels")} name="level" defaultValue={params.level ?? ""}><option value="">{t("search.allLevels")}</option><option>C1</option><option>C2</option></select><select className="select" aria-label={t("search.allStates")} name="status" defaultValue={params.status ?? ""}><option value="">{t("search.allStates")}</option><option value="new">{t("chapter.statusNew")}</option><option value="learning">{t("chapter.statusLearning")}</option><option value="known">{t("chapter.statusKnown")}</option></select><label className="chip"><input type="checkbox" name="favorite" value="true" defaultChecked={params.favorite === "true"}/>{t("nav.favorites")}</label><label className="chip"><input type="checkbox" name="priority" value="true" defaultChecked={params.priority === "true"}/>{t("common.priority")}</label><button className="button button-primary" type="submit">{t("nav.search")}</button></div></SearchForm><p className="result-count tabular">{t("search.results", { count: results.length })}</p>{results.length ? <VocabularyBrowser key={JSON.stringify(params)} words={results} secondaryVisible={profile.secondaryTranslationVisible} showFilters={false}/> : <div className="empty-state"><p>{t("search.noResults", { query: params.q ?? "" })}</p><a className="button button-secondary" href="search">{t("search.clear")}</a></div>}</>;
}
