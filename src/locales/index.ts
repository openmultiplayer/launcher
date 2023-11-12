import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import English from "./translations/en";
import Spanish from "./translations/es";
import Farsi from "./translations/fa";
import Filipino from "./translations/fil";
import France from "./translations/fr";
import Italian from "./translations/it";
import Romanian from "./translations/ro";
import Hungarian from "./translations/hu";

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
    it: {
      translations: Italian,
    },
    fr: {
      translations: France,
    },
    ro: {
      translations: Romanian,
    },
    hu: {
      translations: Hungarian,
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
