"use client";

import { useTranslations } from "next-intl";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations();
  return <section className="loading-surface" role="alert"><div><h1 className="section-title">{t("error.title")}</h1><p className="lede">{t("error.body")}</p><button className="button button-primary" onClick={reset}>{t("common.retry")}</button></div></section>;
}
