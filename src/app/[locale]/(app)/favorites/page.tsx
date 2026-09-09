import { Star as Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getFavorites } from "@/features/app/data";
import { StartSessionButton } from "@/features/study/start-session-button";
import { VocabularyBrowser } from "@/features/vocabulary/vocabulary-browser";
import { requireUserWithProfile } from "@/lib/session";

export default async function FavoritesPage() {
  const { user, profile } = await requireUserWithProfile();
  const [words, t] = await Promise.all([getFavorites(user.id), getTranslations()]);
  return <><header className="page-header"><div><h1 className="page-title">{t("favorites.title")}</h1><p className="lede">{t("favorites.description")}</p></div>{words.length > 0 && <StartSessionButton mode="favorites" size={profile.sessionSize} className="button button-primary"><Heart aria-hidden="true" size={18}/>{t("favorites.start")}</StartSessionButton>}</header>{words.length ? <VocabularyBrowser favoritesOnly words={words} secondaryVisible={profile.secondaryTranslationVisible}/> : <div className="empty-favorites"><Heart aria-hidden="true" size={40}/><p>{t("favorites.empty")}</p></div>}</>;
}
