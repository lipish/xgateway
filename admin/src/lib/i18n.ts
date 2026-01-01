// i18n configuration and utilities
import { create } from "zustand";
import { zh, en } from "./i18n/locales";

export type Language = "zh" | "en";

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

// Create a simple i18n store
export const useI18n = create<I18nStore>((set) => ({
  language: (localStorage.getItem("language") as Language) || "zh",
  setLanguage: (lang: Language) => {
    localStorage.setItem("language", lang);
    set({ language: lang });
  },
}));

// Translation dictionaries
export const translations = {
  zh,
  en,
};

// Helper function to get translation
export function t(key: string, lang?: Language): string {
  const currentLang = lang || useI18n.getState().language;
  const dict = translations[currentLang];

  const keys = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = dict;

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
}
