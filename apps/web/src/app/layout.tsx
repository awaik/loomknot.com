import { Inter } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { AuthInit } from '@/components/auth-init';
import { RTL_LOCALES, type Locale } from '@/i18n/routing';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext', 'greek', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('theme');
                  document.documentElement.classList.add(t === 'dark' ? 'dark' : 'light');
                } catch(e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <AuthInit />
        {children}
      </body>
    </html>
  );
}
