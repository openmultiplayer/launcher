import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import English from "./translations/en";
import Spanish from "./translations/es";
import Farsi from "./translations/fa";
import Filipino from "./translations/fil";
import French from "./translations/fr";
import Hindi from "./translations/hi";
import Italian from "./translations/it";
import Portuguese from "./translations/pt";
import Romanian from "./translations/ro";
import Polish from "./translations/pl";
import Bosnian from "./translations/bs";
import Russian from "./translations/ru";

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
      translations: French,
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
    pl: {
      translations: Polish,
    },
    bs: {
      translations: Bosnian,
    },
    ru: {
      translations: Russian,
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
