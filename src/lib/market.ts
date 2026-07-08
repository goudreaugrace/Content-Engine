import type { Market } from "./api";

const LOCALE_BY_MARKET: Record<Market, string> = {
  US: "en-US",
  MX: "es-MX",
  BR: "pt-BR",
  UK: "en-GB",
  IN: "en-IN",
  Global: "global",
};

const LOCALE_BY_MARKET_ID: Record<string, string> = {
  us: "en-US",
  mx: "es-MX",
  br: "pt-BR",
  uk: "en-GB",
  in: "en-IN",
  both: "en-US + es-MX",
};

/** Article.market → locale code for chips and headers. */
export function localeFor(market: Market): string {
  return LOCALE_BY_MARKET[market] ?? "global";
}

/** JobInput.market id → locale code shown on in-flight rows and meta rows. */
export function localeForJobMarket(marketId: string): string {
  return LOCALE_BY_MARKET_ID[marketId] ?? marketId;
}

/**
 * Curated catalog of supported output locales. Drives the market editor's
 * "Available languages" multiselect and the article-detail language toggle.
 * Keep ordered from most to least common in PepsiCo's actual operations.
 */
export const LOCALE_CATALOG: { code: string; label: string }[] = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-IN", label: "English (India)" },
  { code: "en-CA", label: "English (Canada)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-AR", label: "Spanish (Argentina)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "fr-CA", label: "French (Canada)" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "ja-JP", label: "Japanese" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ko-KR", label: "Korean" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ar-SA", label: "Arabic" },
  { code: "ru-RU", label: "Russian" },
  { code: "pl-PL", label: "Polish" },
  { code: "tr-TR", label: "Turkish" },
];

const LOCALE_LABEL_BY_CODE = new Map(LOCALE_CATALOG.map((l) => [l.code, l.label]));

/** Display name for a BCP-47 locale; falls back to the code if unknown. */
export function localeLabel(code: string): string {
  return LOCALE_LABEL_BY_CODE.get(code) ?? code;
}
