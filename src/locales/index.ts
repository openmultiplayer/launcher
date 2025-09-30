import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Lazy load translations to improve initial bundle size
const loadTranslation = (lang: string) => {
  switch (lang) {
    case "ar":
      return import("./translations/ar");
    case "bs":
      return import("./translations/bs");
    case "en":
      return import("./translations/en");
    case "es":
      return import("./translations/es");
    case "fa":
      return import("./translations/fa");
    case "fil":
      return import("./translations/fil");
    case "fr":
      return import("./translations/fr");
    case "de":
      return import("./translations/de");
    case "hi":
      return import("./translations/hi");
    case "hu":
      return import("./translations/hu");
    case "id":
      return import("./translations/id");
    case "it":
      return import("./translations/it");
    case "lt":
      return import("./translations/lt");
    case "nl":
      return import("./translations/nl");
    case "pl":
      return import("./translations/pl");
    case "pt":
      return import("./translations/pt");
    case "ro":
      return import("./translations/ro");
    case "ru":
      return import("./translations/ru");
    case "sr":
      return import("./translations/sr");
    case "tr":
      return import("./translations/tr");
    case "by":
      return import("./translations/by");
    case "cz":
      return import("./translations/cz");
    case "zh-CN":
      return import("./translations/zh-CN");
    case "zh-TW":
      return import("./translations/zh-TW");
    case "sn":
      return import("./translations/sn");
    case "vi":
      return import("./translations/vi");
    case "ta":
      return import("./translations/ta");
    case "ua":
      return import("./translations/ua");
    case "ge":
      return import("./translations/ge");
    case "fi":
      return import("./translations/fi");
    default:
      return import("./translations/en");
  }
};

// Load English by default (for SSR and fallback)
import English from "./translations/en";
import { Log } from "../utils/logger";

export type LanguageType =
  | "en"
  | "es"
  | "fa"
  | "fil"
  | "fr"
  | "de"
  | "hi"
  | "nl"
  | "it"
  | "lt"
  | "ro"
  | "hu"
  | "pt"
  | "ar"
  | "id"
  | "pl"
  | "bs"
  | "ru"
  | "sr"
  | "tr"
  | "by"
  | "cz"
  | "zh-CN"
  | "zh-TW"
  | "sn"
  | "vi"
  | "ta"
  | "ua"
  | "ge"
  | "fi";

interface LanguageResource {
  label: string;
  type: LanguageType;
  translations: { [key: string]: string };
}

// Language metadata (always loaded for UI purposes)
const LANGUAGE_METADATA: Record<
  LanguageType,
  Omit<LanguageResource, "translations">
> = {
  en: { label: "English", type: "en" },
  nl: { label: "Nederlands", type: "nl" },
  ru: { label: "Русский", type: "ru" },
  es: { label: "Español", type: "es" },
  ro: { label: "Română", type: "ro" },
  id: { label: "Bahasa Indonesia", type: "id" },
  fil: { label: "Filipino", type: "fil" },
  fr: { label: "Français", type: "fr" },
  it: { label: "Italiano", type: "it" },
  lt: { label: "Lietuvių", type: "lt" },
  hu: { label: "Magyar", type: "hu" },
  pt: { label: "Português", type: "pt" },
  fa: { label: "فارسی", type: "fa" },
  ar: { label: "العربية", type: "ar" },
  hi: { label: "हिंदी", type: "hi" },
  pl: { label: "Polski", type: "pl" },
  bs: { label: "Bosanski", type: "bs" },
  tr: { label: "Türkçe", type: "tr" },
  de: { label: "Deutsch", type: "de" },
  by: { label: "Беларускі", type: "by" },
  cz: { label: "Česky", type: "cz" },
  "zh-CN": { label: "简体中文", type: "zh-CN" },
  "zh-TW": { label: "繁體中文", type: "zh-TW" },
  sn: { label: "سنڌي", type: "sn" },
  vi: { label: "Tiếng Việt", type: "vi" },
  ta: { label: "தமிழ்", type: "ta" },
  ua: { label: "Українська", type: "ua" },
  ge: { label: "ქართული", type: "ge" },
  sr: { label: "Српски", type: "sr" },
  fi: { label: "Suomi", type: "fi" },
};

// Cache for loaded translations
const translationCache = new Map<LanguageType, { [key: string]: string }>();

export const getLanguageMetadata = () => LANGUAGE_METADATA;

export const getLanguages = (): Record<string, LanguageResource> => {
  const result: Record<string, LanguageResource> = {};

  // Load only English translations initially
  result.en = {
    ...LANGUAGE_METADATA.en,
    translations: English,
  };

  // Other languages will be loaded on demand
  for (const [key, meta] of Object.entries(LANGUAGE_METADATA)) {
    if (key !== "en") {
      result[key] = {
        ...meta,
        translations: {}, // Empty initially, loaded on demand
      };
    }
  }

  return result;
};

export const loadLanguageTranslations = async (
  lang: LanguageType
): Promise<{ [key: string]: string }> => {
  // Check cache first
  if (translationCache.has(lang)) {
    return translationCache.get(lang)!;
  }

  // Load from file
  const module = await loadTranslation(lang);
  const translations = module.default;

  // Cache the translations
  translationCache.set(lang, translations);

  return translations;
};

// Initialize i18n with minimal resources
i18n.use(initReactI18next).init({
  resources: {
    en: {
      translations: English,
    },
  },
  fallbackLng: "en",
  debug: false, // Disable debug in production

  ns: ["translations"],
  defaultNS: "translations",

  keySeparator: false,

  interpolation: {
    escapeValue: false,
  },

  // Add lazy loading capability
  load: "languageOnly",

  // React specific options
  react: {
    useSuspense: false, // Disable suspense for better control
  },
});

// Custom language loader with caching
export const changeLanguage = async (lang: LanguageType): Promise<void> => {
  try {
    // Load translations if not already loaded
    if (!i18n.hasResourceBundle(lang, "translations")) {
      const translations = await loadLanguageTranslations(lang);
      i18n.addResourceBundle(lang, "translations", translations);
    }

    // Change language
    await i18n.changeLanguage(lang);
  } catch (error) {
    Log.warn(
      `Failed to load language ${lang}, falling back to English:`,
      error
    );
    await i18n.changeLanguage("en");
  }
};

export default i18n;
