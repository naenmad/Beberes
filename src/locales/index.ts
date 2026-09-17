import en from './en.json';
import id from './id.json';
import ja from './ja.json';
import zh from './zh.json';
import es from './es.json';

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
}

/**
 * List of supported languages in Beberes.
 * To add a new language, simply add an entry here and register its JSON import.
 */
export const supportedLanguages: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

export const translations: Record<string, Record<string, any>> = {
  en,
  id,
  ja,
  zh,
  es,
};

export const DEFAULT_LANGUAGE = 'en';

export type TranslationDictionary = typeof en;
