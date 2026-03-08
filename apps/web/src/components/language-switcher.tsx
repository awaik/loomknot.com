'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';
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

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
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
    router.replace(pathname, { locale });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={
          variant === 'compact'
            ? 'w-9 h-9 rounded-full flex items-center justify-center text-muted transition-colors duration-fast hover:text-content hover:bg-surface-alt cursor-pointer'
            : 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted transition-colors duration-fast hover:text-content hover:bg-surface-alt cursor-pointer'
        }
        aria-label="Language"
      >
        <Globe size={variant === 'compact' ? 18 : 16} />
        {variant !== 'compact' && (
          <span className="text-[0.82rem] font-medium">{currentLocale.toUpperCase()}</span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1.5 w-56 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface-elevated shadow-lg z-50">
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
