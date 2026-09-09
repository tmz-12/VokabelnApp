import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return <div className="loading-surface" role="status"><div><div className="skeleton" style={{ width: 220, height: 28 }} /><p>{t("loading")}</p></div></div>;
}
