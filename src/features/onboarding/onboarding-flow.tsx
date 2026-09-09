"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { completeOnboarding } from "@/features/app/actions";

const languages = [{ value: "de", label: "Deutsch" }, { value: "en", label: "English" }, { value: "zh-TW", label: "繁體中文" }] as const;
const presets = [10, 20, 30];

export function OnboardingFlow({ example }: { example: string }) {
  const t = useTranslations("onboarding");
  const currentLocale = useLocale() as "de" | "en" | "zh-TW";
  const [step, setStep] = useState(1);
  const [locale, setLocale] = useState(currentLocale);
  const [dailyGoal, setDailyGoal] = useState(20);
  const [sessionSize, setSessionSize] = useState(20);
  const [pending, startTransition] = useTransition();

  return <div className="onboarding"><header className="onboarding-head"><div className="wordmark">Vokabeln</div><p className="muted tabular">{t("step", { current: step })}</p><div className="onboarding-progress"><span style={{ width: `${step / 3 * 100}%` }} /></div></header><div className="onboarding-stage">
    {step === 1 && <section className="onboarding-copy"><h1 className="page-title">{t("languageTitle")}</h1><p className="lede">{t("languageBody")}</p><div className="choice-stack">{languages.map((language) => <button key={language.value} className="choice" aria-pressed={locale === language.value} onClick={() => setLocale(language.value)}><span lang={language.value}>{language.label}</span>{locale === language.value && <Check aria-hidden="true" />}</button>)}</div></section>}
    {step === 2 && <section className="onboarding-copy"><h1 className="page-title">{t("preferenceTitle")}</h1><p className="lede">{t("preferenceBody")}</p><PreferencePicker label={t("dailyGoal")} value={dailyGoal} onChange={setDailyGoal} values={presets} recommended={20} min={1} max={500} /><PreferencePicker label={t("sessionSize")} value={sessionSize} onChange={setSessionSize} values={[10,20,30,50]} recommended={20} min={5} max={100} /></section>}
    {step === 3 && <section className="onboarding-copy ready"><h1 className="page-title">{t("readyTitle")}</h1><p className="lede">{t("readyBody")}</p><div className="mini-card"><strong>{example}</strong><span>{t("reveal")}</span><div><span>{t("learning")}</span><span>{t("known")}</span></div></div></section>}
  </div><footer className="onboarding-actions">{step > 1 ? <button className="button button-secondary" onClick={() => setStep((value) => value - 1)}><ArrowLeft aria-hidden="true" size={19}/>{t("back")}</button> : <span/>}{step < 3 ? <button className="button button-primary" onClick={() => setStep((value) => value + 1)}>{t("next")}<ArrowRight aria-hidden="true" size={19}/></button> : <button className="button button-primary" disabled={pending} onClick={() => startTransition(() => completeOnboarding({ locale, dailyGoal, sessionSize, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }))}>{t("start")}<ArrowRight aria-hidden="true" size={19}/></button>}</footer></div>;
}

function PreferencePicker({ label, value, onChange, values, recommended, min, max }: { label: string; value: number; onChange: (value: number) => void; values: number[]; recommended: number; min: number; max: number }) {
  const t = useTranslations("onboarding");
  const custom = !values.includes(value);
  return <fieldset className="preference"><legend>{label}</legend><div className="chip-row">{values.map((item) => <button type="button" className="chip" aria-pressed={value === item} onClick={() => onChange(item)} key={item}>{item}{item === recommended && <span className="recommended">{t("recommended")}</span>}</button>)}<label className={`chip custom-chip ${custom ? "active" : ""}`}><span>{t("custom")}</span><input aria-label={`${label}: ${t("custom")}`} type="number" min={min} max={max} value={custom ? value : ""} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} /></label></div></fieldset>;
}
