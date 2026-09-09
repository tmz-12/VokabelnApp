import { Award } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getEarnedBadges } from "@/features/app/data";
import { SettingsForm } from "@/features/settings/settings-form";
import { requireUserWithProfile } from "@/lib/session";

export default async function SettingsPage() {
  const { user, profile } = await requireUserWithProfile();
  const [earned, t] = await Promise.all([getEarnedBadges(user.id), getTranslations()]);
  return <><header className="page-header"><h1 className="page-title">{t("settings.title")}</h1></header><div className="settings-layout"><SettingsForm profile={profile}/><aside className="badge-area"><h2 className="section-title">{t("settings.badges")}</h2>{earned.length ? <ul>{earned.map((badge) => <li key={badge.code}><Award aria-hidden="true"/><div><strong>{t(badge.localizationKey)}</strong><span>{new Intl.DateTimeFormat(profile.uiLocale).format(badge.awardedAt)}</span></div></li>)}</ul> : <div className="badge-empty"><Award aria-hidden="true"/><p>{t("settings.badgeEmpty")}</p></div>}</aside></div></>;
}
