import { defineRouting } from 'next-intl/routing';

export const locales = [
  'en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ja',
  'de', 'jv', 'ko', 'tr', 'vi', 'te', 'mr', 'ta', 'it', 'ur',
  'th', 'gu', 'pl', 'uk', 'ml', 'kn', 'my', 'ro', 'nl', 'hu',
  'el', 'cs', 'sv', 'he', 'da', 'fi', 'no', 'sk', 'ms', 'id',
] as const;

export type Locale = (typeof locales)[number];

export const RTL_LOCALES: Locale[] = ['ar', 'he', 'ur'];

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'never',
});
