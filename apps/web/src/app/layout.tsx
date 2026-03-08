import type { Metadata } from 'next';
import { AuthInit } from '@/components/auth-init';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://loomknot.com'),
  title: {
    default: 'LoomKnot — The Web That Knows You',
    template: '%s | LoomKnot',
  },
  description:
    'A platform where your AI creates pages, remembers everything, and works for you — not the platform.',
  openGraph: {
    type: 'website',
    siteName: 'LoomKnot',
    locale: 'ru_RU',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
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
