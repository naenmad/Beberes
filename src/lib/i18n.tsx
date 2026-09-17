import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { translations, supportedLanguages, DEFAULT_LANGUAGE } from '../locales';
import type { LanguageMeta } from '../locales';

/**
 * Resolve dot-notation path on an object (e.g. "settings.tabs.general")
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Format string with parameter interpolation, e.g. "{count} files" with { count: 5 }
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * React hook for internationalization and reactive translation lookups.
 */
export function useTranslation() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const t = useCallback(
    (
      key: string,
      defaultTextOrParams?: string | Record<string, string | number>,
      maybeParams?: Record<string, string | number>
    ): string => {
      let defaultText: string | undefined;
      let params: Record<string, string | number> | undefined;

      if (typeof defaultTextOrParams === 'string') {
        defaultText = defaultTextOrParams;
        params = maybeParams;
      } else {
        params = defaultTextOrParams;
      }

      // 1. Try selected language dictionary
      const activeDict = translations[language] || translations[DEFAULT_LANGUAGE];
      let value = getNestedValue(activeDict, key);

      // 2. Fallback to English dictionary if key is missing in active language
      if (value === undefined && language !== DEFAULT_LANGUAGE) {
        const fallbackDict = translations[DEFAULT_LANGUAGE];
        value = getNestedValue(fallbackDict, key);
      }

      // 3. Fallback to defaultText if provided, otherwise key
      if (value === undefined || typeof value !== 'string') {
        return defaultText ? interpolate(defaultText, params) : key;
      }

      // 4. Interpolate variables
      return interpolate(value, params);
    },
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    supportedLanguages,
  };
}

export { supportedLanguages, type LanguageMeta };
