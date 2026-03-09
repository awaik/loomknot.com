'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';

/* ── Rich text helpers ──────────────────────────────────────── */

const strongTag = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

/* ── Logo ────────────────────────────────────────────────────── */

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="w-[30px] h-[30px]">
      <ellipse cx="12" cy="16" rx="9" ry="13" fill="#4D9956" opacity="0.85" />
      <ellipse cx="20" cy="16" rx="9" ry="13" fill="#5B8DEF" opacity="0.85" />
    </svg>
  );
}

/* ── Section wrapper ─────────────────────────────────────────── */

function Section({
  id,
  className,
  dark,
  children,
}: {
  id?: string;
  className?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        'px-6 py-20 md:py-[100px]',
        dark && 'bg-ink text-cream',
        className,
      )}
    >
      <div className="max-w-[1000px] mx-auto">{children}</div>
    </section>
  );
}

function SectionLabel({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={cn('text-[0.78rem] font-semibold tracking-[0.1em] uppercase mb-3.5 text-center reveal', dark ? 'text-thread' : 'text-thread-dark')}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[clamp(1.8rem,4vw,2.7rem)] leading-tight text-center mb-12 reveal">
      {children}
    </h2>
  );
}

/* ── FAQ Item ────────────────────────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border reveal">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-start text-[0.95rem] font-semibold text-content transition-colors hover:text-thread-dark"
      >
        {q}
        <span className={cn('text-xl text-muted transition-transform duration-normal ms-4 shrink-0', open && 'rotate-45')}>+</span>
      </button>
      <div className={cn('overflow-hidden transition-all duration-normal', open ? 'max-h-[300px] pb-5' : 'max-h-0')}>
        <p className="text-[0.88rem] text-muted leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export function LandingPage() {
  const nav = useTranslations('Nav');
  const hero = useTranslations('Hero');
  const problem = useTranslations('Problem');
  const cards = useTranslations('ThreeCards');
  const how = useTranslations('HowItWorks');
  const scenarios = useTranslations('Scenarios');
  const byoa = useTranslations('Byoa');
  const tools = useTranslations('Tools');
  const privacy = useTranslations('Privacy');
  const status = useTranslations('Status');
  const forWhom = useTranslations('ForWhom');
  const tech = useTranslations('TechStack');
  const cta = useTranslations('Cta');
  const faq = useTranslations('Faq');
  const footer = useTranslations('Footer');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const agents = [
    { name: 'Claude', color: 'var(--color-claude)', border: 'rgba(212,165,116,0.35)', text: '#8B5E15', bg: 'rgba(212,165,116,0.06)' },
    { name: 'ChatGPT', color: 'var(--color-chatgpt)', border: 'rgba(116,170,156,0.35)', text: '#4E8A7C', bg: 'rgba(116,170,156,0.06)' },
    { name: 'Gemini', color: 'var(--color-gemini)', border: 'rgba(139,156,247,0.35)', text: '#6B7DE0', bg: 'rgba(139,156,247,0.06)' },
    { name: 'Ollama', color: '#888', border: 'rgba(136,136,136,0.35)', text: '#666', bg: 'rgba(136,136,136,0.06)' },
  ];

  return (
    <>
      {/* ━━━ NAV ━━━ */}
      <nav className="fixed top-0 inset-x-0 z-50 px-5 md:px-10 py-[18px] flex items-center justify-between glass border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 text-[1.45rem] text-content">
          <Logo />
          LoomKnot
        </Link>
        <div className="hidden md:flex gap-7 items-center">
          <a href="#scenarios" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">{nav('scenarios')}</a>
          <a href="#how" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">{nav('howItWorks')}</a>
          <a href="#for-whom" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">{nav('forWhom')}</a>
          <LanguageSwitcher variant="compact" />
          <ThemeToggle />
          <Link href="/login" className="bg-ink text-cream px-[22px] py-2.5 rounded-pill text-sm font-medium transition-transform duration-normal hover:scale-[1.03]">
            {nav('signIn')}
          </Link>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[120px] pb-[60px] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 20% 50%, rgba(199,140,42,0.07) 0%, transparent 70%),
              radial-gradient(ellipse 50% 60% at 80% 30%, rgba(227,91,66,0.05) 0%, transparent 70%),
              radial-gradient(ellipse 40% 40% at 50% 80%, rgba(77,153,86,0.05) 0%, transparent 70%)
            `,
          }}
        />

        <h1
          className="text-[clamp(2.2rem,5.5vw,3.8rem)] leading-[1.1] font-normal max-w-[780px] tracking-[-0.02em] relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out both' }}
        >
          {hero('title1')}
          <br />
          <span className="text-thread-dark">{hero('title2')}</span>
        </h1>

        <p
          className="mt-6 text-[clamp(0.95rem,1.6vw,1.1rem)] text-muted max-w-[640px] leading-relaxed relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out 0.15s both' }}
        >
          {hero('subtitle')}
        </p>

        {/* Agent pills */}
        <div
          className="flex gap-2.5 items-center mt-8 flex-wrap justify-center relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out 0.3s both' }}
        >
          <span className="text-[0.82rem] text-muted me-1">{hero('agents')}</span>
          {agents.map((a) => (
            <span
              key={a.name}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-pill text-[0.8rem] font-medium"
              style={{ border: `1.5px solid ${a.border}`, color: a.text, background: a.bg }}
            >
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: a.color }} />
              {a.name}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div
          className="flex flex-col items-center mt-10 relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out 0.4s both' }}
        >
          <Link
            href="/login"
            className="bg-ink text-cream px-10 py-4 rounded-pill text-lg font-semibold transition-all duration-normal hover:-translate-y-0.5 hover:shadow-lg"
          >
            {hero('cta')}
          </Link>
          <p className="mt-4 text-[0.82rem] text-muted">{hero('ctaNote')}</p>
        </div>
      </section>

      {/* ━━━ PROBLEM ━━━ */}
      <Section dark>
        <SectionTitle>
          <span className="text-cream">{problem('title')}</span>
        </SectionTitle>
        <div className="max-w-[640px] mx-auto space-y-5 text-[1.05rem] leading-relaxed text-cream/70 reveal">
          <p>{problem('p1')}</p>
          <p>{problem('p2')}</p>
          <p>{problem.rich('p3', { strong: strongTag })}</p>
        </div>
      </Section>

      {/* ━━━ THREE CARDS ━━━ */}
      <Section>
        <SectionTitle>{cards('title')}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {([
            { icon: '🧠', titleKey: 'card1Title', descKey: 'card1Desc', detailKey: 'card1Detail' },
            { icon: '⚡', titleKey: 'card2Title', descKey: 'card2Desc', detailKey: 'card2Detail' },
            { icon: '👥', titleKey: 'card3Title', descKey: 'card3Desc', detailKey: 'card3Detail' },
          ] as const).map((card, i) => (
            <div
              key={card.titleKey}
              className="p-7 rounded-[18px] border border-border bg-surface-elevated transition-all duration-slow hover:-translate-y-[3px] hover:shadow-md reveal"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className="text-[2rem] mb-4 block">{card.icon}</span>
              <h3 className="text-lg font-medium mb-3">{cards(card.titleKey)}</h3>
              <p className="text-[0.88rem] text-muted leading-relaxed mb-3">{cards(card.descKey)}</p>
              <p className="text-[0.82rem] text-content-tertiary leading-relaxed">{cards(card.detailKey)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <Section id="how" dark>
        <SectionTitle>
          <span className="text-cream">{how('title')}</span>
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {([
            { num: '1', icon: '📁', titleKey: 'step1Title', descKey: 'step1Desc' },
            { num: '2', icon: '🔗', titleKey: 'step2Title', descKey: 'step2Desc' },
            { num: '3', icon: '💬', titleKey: 'step3Title', descKey: 'step3Desc' },
            { num: '4', icon: '🚀', titleKey: 'step4Title', descKey: 'step4Desc' },
          ] as const).map((step, i) => (
            <div
              key={step.num}
              className="text-center p-8 rounded-xl border border-thread/10 bg-white/[0.02] transition-all duration-slow hover:bg-white/[0.04] hover:border-thread/20 hover:-translate-y-1 reveal"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-thread/10 flex items-center justify-center text-lg text-thread mx-auto mb-4">
                {step.num}
              </div>
              <span className="text-[2rem] mb-3.5 block">{step.icon}</span>
              <h3 className="text-lg font-medium mb-2">{how(step.titleKey)}</h3>
              <p className="text-[0.84rem] text-cream/55 leading-relaxed">{how(step.descKey)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ━━━ SCENARIOS ━━━ */}
      <Section id="scenarios">
        <SectionTitle>{scenarios('title')}</SectionTitle>

        {/* Travel */}
        <div className="mb-14 reveal">
          <h3 className="text-[1.5rem] mb-4 flex items-center gap-2">
            <span>✈️</span> {scenarios('travelTitle')}
          </h3>
          <blockquote className="border-s-[3px] border-thread ps-5 py-2 text-[0.95rem] text-muted leading-relaxed italic mb-5">
            {scenarios('travelQuote')}
          </blockquote>
          <ul className="space-y-2">
            {(['travelList1', 'travelList2', 'travelList3', 'travelList4', 'travelList5'] as const).map((key) => (
              <li key={key} className="flex items-start gap-2 text-[0.9rem] text-content-secondary">
                <span className="text-sage mt-0.5 shrink-0">-</span>
                {scenarios(key)}
              </li>
            ))}
          </ul>
        </div>

        {/* Health */}
        <div className="mb-14 reveal">
          <h3 className="text-[1.5rem] mb-4 flex items-center gap-2">
            <span>🏥</span> {scenarios('healthTitle')}
          </h3>
          <blockquote className="border-s-[3px] border-sage ps-5 py-2 text-[0.95rem] text-muted leading-relaxed italic mb-5">
            {scenarios('healthQuote')}
          </blockquote>
          <ul className="space-y-2">
            {(['healthList1', 'healthList2', 'healthList3', 'healthList4'] as const).map((key) => (
              <li key={key} className="flex items-start gap-2 text-[0.9rem] text-content-secondary">
                <span className="text-sage mt-0.5 shrink-0">-</span>
                {scenarios(key)}
              </li>
            ))}
          </ul>
        </div>

        {/* Learning + Renovation — compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="reveal">
            <h3 className="text-[1.5rem] mb-3 flex items-center gap-2">
              <span>📚</span> {scenarios('learningTitle')}
            </h3>
            <blockquote className="border-s-[3px] border-accent ps-5 py-2 text-[0.9rem] text-muted leading-relaxed italic">
              {scenarios('learningQuote')}
            </blockquote>
          </div>
          <div className="reveal">
            <h3 className="text-[1.5rem] mb-3 flex items-center gap-2">
              <span>🔨</span> {scenarios('renovationTitle')}
            </h3>
            <blockquote className="border-s-[3px] border-info ps-5 py-2 text-[0.9rem] text-muted leading-relaxed italic">
              {scenarios('renovationQuote')}
            </blockquote>
          </div>
        </div>
      </Section>

      {/* ━━━ BYOA ━━━ */}
      <Section className="bg-surface-alt">
        <SectionTitle>{byoa('title')}</SectionTitle>
        <p className="text-center text-muted text-base max-w-[640px] mx-auto mb-4 leading-relaxed reveal">{byoa('desc')}</p>
        <p className="text-center text-muted text-base max-w-[640px] mx-auto mb-12 leading-relaxed reveal">{byoa('desc2')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {([
            { icon: '🟠', titleKey: 'claude', descKey: 'claudeDesc' },
            { icon: '🟢', titleKey: 'chatgpt', descKey: 'chatgptDesc' },
            { icon: '💻', titleKey: 'local', descKey: 'localDesc' },
            { icon: '🔧', titleKey: 'custom', descKey: 'customDesc' },
          ] as const).map((item, i) => (
            <div
              key={item.titleKey}
              className="p-5 rounded-xl border border-border bg-surface-elevated text-center transition-all duration-slow hover:-translate-y-1 reveal"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <span className="text-[1.5rem] mb-2.5 block">{item.icon}</span>
              <h4 className="font-semibold text-[0.95rem] mb-1.5">{byoa(item.titleKey)}</h4>
              <p className="text-[0.82rem] text-muted leading-relaxed">{byoa(item.descKey)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ━━━ 24 TOOLS ━━━ */}
      <Section>
        <SectionTitle>{tools('title')}</SectionTitle>
        <p className="text-center text-muted text-base max-w-[580px] mx-auto mb-12 leading-relaxed reveal">{tools('desc')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {([
            { icon: '🧠', titleKey: 'memoryTitle', descKey: 'memoryDesc', accent: 'border-sage/30' },
            { icon: '📄', titleKey: 'pagesTitle', descKey: 'pagesDesc', accent: 'border-thread/30' },
            { icon: '✅', titleKey: 'tasksTitle', descKey: 'tasksDesc', accent: 'border-accent/30' },
            { icon: '📁', titleKey: 'projectsTitle', descKey: 'projectsDesc', accent: 'border-info/30' },
            { icon: '🤝', titleKey: 'negotiationsTitle', descKey: 'negotiationsDesc', accent: 'border-thread/30' },
          ] as const).map((item, i) => (
            <div
              key={item.titleKey}
              className={cn('p-6 rounded-xl border bg-surface-elevated transition-all duration-slow hover:-translate-y-1 reveal', item.accent)}
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              <span className="text-[1.5rem] mb-3 block">{item.icon}</span>
              <h4 className="text-lg font-medium mb-2">{tools(item.titleKey)}</h4>
              <p className="text-[0.85rem] text-muted leading-relaxed">{tools(item.descKey)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ━━━ PRIVACY ━━━ */}
      <Section dark>
        <SectionTitle>
          <span className="text-cream">{privacy('title')}</span>
        </SectionTitle>
        <p className="text-center text-cream/50 text-base max-w-[540px] mx-auto mb-10 leading-relaxed reveal">{privacy('desc')}</p>

        <div className="space-y-3 max-w-[700px] mx-auto reveal">
          {([
            { labelKey: 'row1Label', valueKey: 'row1Value' },
            { labelKey: 'row2Label', valueKey: 'row2Value' },
            { labelKey: 'row3Label', valueKey: 'row3Value' },
            { labelKey: 'row4Label', valueKey: 'row4Value' },
          ] as const).map((row) => (
            <div key={row.labelKey} className="flex flex-col md:flex-row gap-2 md:gap-6 p-4 rounded-xl border border-thread/10 bg-white/[0.02]">
              <span className="font-semibold text-[0.9rem] md:min-w-[160px] shrink-0 text-cream/80">{privacy(row.labelKey)}</span>
              <span className="text-[0.85rem] text-cream/50 leading-relaxed">{privacy(row.valueKey)}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-cream/40 text-[0.82rem] mt-8 reveal">{privacy('footer')}</p>
      </Section>

      {/* ━━━ STATUS ━━━ */}
      <Section>
        <SectionTitle>{status('title')}</SectionTitle>
        <div className="max-w-[600px] mx-auto space-y-2 reveal">
          {([
            { key: 'auth', s: 'done' },
            { key: 'api', s: 'done' },
            { key: 'mcp', s: 'done' },
            { key: 'memory', s: 'done' },
            { key: 'tasks', s: 'done' },
            { key: 'keys', s: 'done' },
            { key: 'realtime', s: 'done' },
            { key: 'ui', s: 'inProgress' },
            { key: 'conflicts', s: 'planned' },
            { key: 'vector', s: 'planned' },
          ] as const).map((row) => (
            <div key={row.key} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-surface-elevated">
              <span className="text-[0.88rem] text-content">{status(row.key)}</span>
              <span className={cn(
                'text-[0.75rem] font-semibold px-2.5 py-1 rounded-pill',
                row.s === 'done' && 'bg-sage/10 text-sage',
                row.s === 'inProgress' && 'bg-thread/10 text-thread-dark',
                row.s === 'planned' && 'bg-surface-alt text-muted',
              )}>
                {status(row.s)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-muted text-[0.85rem] mt-6 reveal">{status('footer')}</p>
      </Section>

      {/* ━━━ FOR WHOM ━━━ */}
      <Section id="for-whom" className="bg-surface-alt">
        <SectionTitle>{forWhom('title')}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {([
            { icon: '🚀', titleKey: 'p1Title', descKey: 'p1Desc' },
            { icon: '👥', titleKey: 'p2Title', descKey: 'p2Desc' },
            { icon: '🛠', titleKey: 'p3Title', descKey: 'p3Desc' },
          ] as const).map((p, i) => (
            <div
              key={p.titleKey}
              className="p-7 rounded-[18px] border border-border bg-surface-elevated reveal"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className="text-[1.8rem] mb-3 block">{p.icon}</span>
              <h3 className="text-lg font-medium mb-2">{forWhom(p.titleKey)}</h3>
              <p className="text-[0.86rem] text-muted leading-relaxed">{forWhom(p.descKey)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ━━━ TECH STACK ━━━ */}
      <Section>
        <SectionTitle>{tech('title')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {([
            { icon: '🔗', titleKey: 'card1Title', descKey: 'card1Desc' },
            { icon: '🐘', titleKey: 'card2Title', descKey: 'card2Desc' },
            { icon: '⚡', titleKey: 'card3Title', descKey: 'card3Desc' },
            { icon: '🚀', titleKey: 'card4Title', descKey: 'card4Desc' },
          ] as const).map((card, i) => (
            <div
              key={card.titleKey}
              className="p-6 rounded-xl border border-border bg-surface-elevated transition-all duration-slow hover:-translate-y-1 reveal"
              style={{ transitionDelay: `${(i % 2) * 0.1}s` }}
            >
              <span className="text-[1.5rem] mb-3 block">{card.icon}</span>
              <h4 className="text-lg font-medium mb-1.5">{tech(card.titleKey)}</h4>
              <p className="text-[0.86rem] text-muted leading-relaxed">{tech(card.descKey)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ━━━ CTA ━━━ */}
      <section
        className="py-[100px] px-6 text-center relative"
        id="cta"
        style={{ background: 'linear-gradient(180deg, var(--lk-surface) 0%, var(--lk-surface-alt) 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-thread-light), transparent)' }} />
        <h2 className="text-[clamp(2rem,5vw,3.2rem)] leading-[1.1] mb-5 max-w-[600px] mx-auto reveal">
          {cta('title')}
        </h2>
        <p className="text-base text-muted mb-8 leading-relaxed reveal">{cta('subtitle')}</p>
        <div className="reveal">
          <Link
            href="/login"
            className="inline-block bg-accent text-white px-10 py-4 rounded-pill text-lg font-semibold transition-all duration-normal hover:bg-[#C4543D] hover:-translate-y-0.5"
          >
            {cta('button')}
          </Link>
        </div>
        <p className="mt-4 text-[0.78rem] text-muted reveal">{cta('note')}</p>
      </section>

      {/* ━━━ FAQ ━━━ */}
      <Section>
        <SectionTitle>FAQ</SectionTitle>
        <div className="max-w-[700px] mx-auto">
          {([1, 2, 3, 4, 5, 6] as const).map((n) => (
            <FaqItem key={n} q={faq(`q${n}`)} a={faq(`a${n}`)} />
          ))}
        </div>
      </Section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="py-9 px-6 text-center border-t border-border">
        <div className="flex items-center justify-center gap-4">
          <p className="text-[0.8rem] text-muted">{footer('copyright')}</p>
          <LanguageSwitcher variant="compact" />
        </div>
      </footer>
    </>
  );
}
