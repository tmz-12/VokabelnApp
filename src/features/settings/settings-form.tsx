"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateSettings } from "@/features/app/actions";
import { signOut } from "@/lib/auth-client";

type Props = { profile: { uiLocale: "de" | "en" | "zh-TW"; appearance: "light" | "dark" | "system"; sessionSize: number; dailyGoalWords: number; secondaryTranslationVisible: boolean; soundEffectsEnabled: boolean } };

export function SettingsForm({ profile }: Props) {
  const t = useTranslations(); const locale = useLocale(); const router = useRouter();
  const [saved, setSaved] = useState(false); const [pending, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaved(false); const form = new FormData(event.currentTarget); const nextLocale = String(form.get("locale")) as "de" | "en" | "zh-TW";
    startTransition(async () => { await updateSettings({ locale: nextLocale, appearance: form.get("appearance"), sessionSize: Number(form.get("sessionSize")), dailyGoal: Number(form.get("dailyGoal")), secondary: form.get("secondary") === "on", sounds: form.get("sounds") === "on" }); if (nextLocale !== locale) router.replace("/settings", { locale: nextLocale }); else router.refresh(); setSaved(true); });
  }
  return <form className="settings-form" onSubmit={submit}><fieldset><legend>{t("settings.language")}</legend><div className="setting-row"><label htmlFor="locale">{t("settings.language")}</label><select className="select" id="locale" name="locale" defaultValue={profile.uiLocale}><option value="de">Deutsch</option><option value="en">English</option><option value="zh-TW">繁體中文</option></select></div></fieldset><fieldset><legend>{t("settings.appearance")}</legend><div className="appearance-options">{(["system", "light", "dark"] as const).map((value) => <label key={value}><input type="radio" name="appearance" value={value} defaultChecked={profile.appearance === value}/><span className={`appearance-swatch ${value}`}/><strong>{t(`settings.${value}`)}</strong></label>)}</div></fieldset><fieldset><legend>{t("settings.learning")}</legend><div className="setting-row"><label htmlFor="session-size">{t("settings.sessionSize")}<span className="helper">5–100</span></label><input className="input number-input" id="session-size" type="number" name="sessionSize" min={5} max={100} defaultValue={profile.sessionSize}/></div><div className="setting-row"><label htmlFor="daily-goal">{t("settings.dailyGoal")}</label><input className="input number-input" id="daily-goal" type="number" name="dailyGoal" min={1} max={500} defaultValue={profile.dailyGoalWords}/></div><label className="toggle-row"><span><strong>{t("settings.secondary")}</strong></span><input type="checkbox" name="secondary" defaultChecked={profile.secondaryTranslationVisible}/></label><label className="toggle-row"><span><strong>{t("settings.sounds")}</strong><small>{t("settings.soundsHint")}</small></span><input type="checkbox" name="sounds" defaultChecked={profile.soundEffectsEnabled}/></label></fieldset><div className="settings-actions"><button className="button button-primary" disabled={pending}>{t("common.save")}</button>{saved && <span className="saved" role="status"><Check aria-hidden="true" size={17}/>{t("settings.saved")}</span>}</div><hr className="divider"/><button className="button button-danger sign-out" type="button" onClick={async () => { await signOut(); router.replace("/sign-in"); router.refresh(); }}>{t("auth.signOut")}</button></form>;
}
