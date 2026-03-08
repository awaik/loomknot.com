import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing-page';

export const metadata: Metadata = {
  title: 'LoomKnot — The Web That Knows You',
  description:
    'A platform where your AI creates pages, remembers everything, and works for you — not the platform.',
};

export default function Home() {
  return <LandingPage />;
}
