import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import en from './en.json';
import ur from './ur.json';
import { ApiError } from '@/api/errors';

export type Language = 'en' | 'ur';
export type MessageKey = keyof typeof en;
type Params = Record<string, string | number>;

const MESSAGES: Record<Language, Record<string, string>> = { en, ur };
const STORAGE_KEY = 'agrilink_lang';

function readStoredLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'ur' ? v : 'ur';
  } catch {
    return 'ur';
  }
}

interface I18nContextType {
  language: Language;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: Language) => void;
  t: (key: MessageKey, params?: Params) => string;
  /** For keys built at runtime, e.g. tDyn('offer.status', status). Falls back to the raw value. */
  tDyn: (prefix: string, value: string) => string;
  /** Maps an API/network error to a user-friendly, non-technical message. */
  errorMessage: (err: unknown) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(params[k] ?? ''));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);
  const dir = language === 'ur' ? 'rtl' : 'ltr';

  // The single place that touches <html dir/lang>.
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage blocked: choice just isn't persisted */
    }
  }, []);

  const value = useMemo<I18nContextType>(() => {
    const lookup = (key: string): string | undefined => MESSAGES[language][key] ?? MESSAGES.en[key];
    return {
      language,
      dir,
      setLanguage,
      t: (key, params) => interpolate(lookup(key) ?? key, params),
      tDyn: (prefix, v) => lookup(`${prefix}.${v}`) ?? v,
      errorMessage: (err) => {
        const code = err instanceof ApiError ? err.code : 'generic';
        return lookup(`error.${code}`) ?? lookup('error.generic') ?? 'Error';
      },
    };
  }, [language, dir, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
