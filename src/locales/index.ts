import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import English from "./translations/en";
import Spanish from "./translations/es";
import Farsi from "./translations/fa";
import Filipino from "./translations/fil";
import France from "./translations/fr";
import Hindi from "./translations/hi";
import Italian from "./translations/it";
import Portuguese from "./translations/pt";
import Romanian from "./translations/ro";

i18n.use(initReactI18next).init({
  // we init with resources
  resources: {
    en: {
      translations: English,
    },
    es: {
      translations: Spanish,
    },
    fa: {
      translations: Farsi,
    },
    fil: {
      translations: Filipino,
    },
    fr: {
      translations: France,
    },
    hi: {
      translations: Hindi,
    },
    it: {
      translations: Italian,
    },
    pt: {
      translations: Portuguese,
    },
    ro: {
      translations: Romanian,
    },
  },
  fallbackLng: "en",
  debug: true,

  // have a common namespace used around the full app
  ns: ["translations"],
  defaultNS: "translations",

  keySeparator: false, // we use content as keys

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
