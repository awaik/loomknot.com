'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, type Locale, LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE } from '@/i18n/routing';
import { Globe } from 'lucide-react';

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  hi: 'हिन्दी',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  bn: 'বাংলা',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  de: 'Deutsch',
  jv: 'Basa Jawa',
  ko: '한국어',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  te: 'తెలుగు',
  mr: 'मराठी',
  ta: 'தமிழ்',
  it: 'Italiano',
  ur: 'اردو',
  th: 'ไทย',
  gu: 'ગુજરાતી',
  pl: 'Polski',
  uk: 'Українська',
  ml: 'മലയാളം',
  kn: 'ಕನ್ನಡ',
  my: 'မြန်မာ',
  ro: 'Română',
  nl: 'Nederlands',
  hu: 'Magyar',
  el: 'Ελληνικά',
  cs: 'Čeština',
  sv: 'Svenska',
  he: 'עברית',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  sk: 'Slovenčina',
  ms: 'Bahasa Melayu',
  id: 'Bahasa Indonesia',
};

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'sidebar';
  icon?: ReactNode;
  label?: string;
}

export function LanguageSwitcher({ variant = 'default', icon, label }: LanguageSwitcherProps) {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function switchLocale(locale: Locale) {
    setOpen(false);
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    router.refresh();
  }

  const buttonClass =
    variant === 'compact'
      ? 'w-9 h-9 rounded-full flex items-center justify-center text-muted transition-colors duration-fast hover:text-content hover:bg-surface-alt cursor-pointer'
      : variant === 'sidebar'
        ? 'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-content-secondary transition-colors hover:bg-surface-alt hover:text-content cursor-pointer w-full'
        : 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted transition-colors duration-fast hover:text-content hover:bg-surface-alt cursor-pointer';

  const dropdownClass =
    variant === 'sidebar'
      ? 'absolute start-0 bottom-full mb-1.5 w-56 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface-elevated shadow-lg z-50'
      : 'absolute end-0 top-full mt-1.5 w-56 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface-elevated shadow-lg z-50';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={buttonClass}
        aria-label="Language"
      >
        {variant === 'sidebar' ? (
          <>
            {icon}
            <span>{label}</span>
            <span className="ml-auto text-xs text-content-tertiary">
              {LOCALE_NAMES[currentLocale]}
            </span>
          </>
        ) : (
          <>
            <Globe size={variant === 'compact' ? 18 : 16} />
            {variant !== 'compact' && (
              <span className="text-[0.82rem] font-medium">{currentLocale.toUpperCase()}</span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className={dropdownClass}>
          <div className="p-1.5">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => switchLocale(locale)}
                className={`w-full text-start px-3 py-2 rounded-lg text-[0.84rem] transition-colors ${
                  locale === currentLocale
                    ? 'bg-thread/10 text-thread-dark font-medium'
                    : 'text-content hover:bg-surface-alt'
                }`}
              >
                {LOCALE_NAMES[locale]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
