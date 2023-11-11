import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  // we init with resources
  resources: {
    en: {
      translations: {},
    },
  },
  fallbackLng: "en",
  debug: true,

  parseMissingKeyHandler: (key) => {
    // return key because it's the english text, other languages are gonna have english texts as keys
    if (i18n.language == "en") {
      return key;
    }
  },

  // have a common namespace used around the full app
  ns: ["translations"],
  defaultNS: "translations",

  keySeparator: false, // we use content as keys

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
