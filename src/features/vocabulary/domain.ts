export type Locale = "de" | "en" | "zh-TW";

export type CanonicalContent = {
  english: string;
  traditionalChinese: string;
  examplesGerman: string[];
};

export type ContentOverride = {
  englishOverride?: string | null;
  traditionalChineseOverride?: string | null;
  examplesGermanOverride?: string[] | null;
};

export function mergeEffectiveContent(canonical: CanonicalContent, override?: ContentOverride | null): CanonicalContent {
  return {
    english: override?.englishOverride?.trim() || canonical.english,
    traditionalChinese: override?.traditionalChineseOverride?.trim() || canonical.traditionalChinese,
    examplesGerman: override?.examplesGermanOverride?.length ? override.examplesGermanOverride : canonical.examplesGerman,
  };
}

export function translationsForLocale(content: Pick<CanonicalContent, "english" | "traditionalChinese">, locale: Locale) {
  return locale === "en"
    ? { primary: content.english, secondary: content.traditionalChinese }
    : { primary: content.traditionalChinese, secondary: content.english };
}

export function progress(known: number, total: number) {
  return { known, total, percent: total === 0 ? 0 : Math.round((known / total) * 100) };
}
