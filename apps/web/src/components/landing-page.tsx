'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';

/* ── Rich text tag helpers ────────────────────────────────────── */

const strongTag = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

const accentTag = (chunks: React.ReactNode) => (
  <em className="font-serif italic text-accent relative">
    {chunks}
    <span className="absolute bottom-0.5 left-0 right-0 h-[3px] bg-accent-soft rounded-sm" />
  </em>
);

const emTag = (chunks: React.ReactNode) => (
  <em className="font-serif italic">{chunks}</em>
);

const brTag = () => <br />;

/* ── Helper components ─────────────────────────────────────────── */

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="w-[30px] h-[30px]">
      <ellipse cx="12" cy="16" rx="9" ry="13" fill="#4D9956" opacity="0.85" />
      <ellipse cx="20" cy="16" rx="9" ry="13" fill="#5B8DEF" opacity="0.85" />
    </svg>
  );
}

function ChatPanel({
  agent,
  agentColor,
  mcpLabel,
  children,
}: {
  agent: string;
  agentColor: string;
  mcpLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2.5 text-[0.85rem] font-semibold">
        <span className="w-2 h-2 rounded-full" style={{ background: agentColor }} />
        <span>{agent}</span>
        <span className="text-content-tertiary font-normal text-[0.78rem] ms-auto">{mcpLabel}</span>
      </div>
      <div className="p-5 flex flex-col gap-3.5">{children}</div>
    </div>
  );
}

function PagePanel({ url, children }: { url: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-surface-alt border-b border-border flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-soft" />
          <span className="w-2.5 h-2.5 rounded-full bg-thread-light" />
          <span className="w-2.5 h-2.5 rounded-full bg-sage-light" />
        </div>
        <span className="flex-1 text-center text-[0.75rem] text-muted font-mono">{url}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="self-end max-w-[88%] px-4 py-3 rounded-2xl rounded-br-[6px] bg-ink text-cream text-[0.85rem] leading-relaxed">
      {children}
    </div>
  );
}

function AiMsg({
  agent,
  agentColor,
  children,
}: {
  agent: string;
  agentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="self-start max-w-[88%] px-4 py-3 rounded-2xl rounded-bl-[6px] bg-surface-alt text-content text-[0.85rem] leading-relaxed border border-border">
      <span
        className="text-[0.68rem] font-semibold tracking-[0.04em] uppercase mb-1.5 block"
        style={{ color: agentColor }}
      >
        {agent}
      </span>
      {children}
    </div>
  );
}

function MemTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg text-[0.72rem] font-semibold bg-sage/10 text-sage">
      {children}
    </span>
  );
}

function PageCreatedTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg text-[0.72rem] font-semibold bg-accent/[0.08] text-accent">
      {children}
    </span>
  );
}

function ContentBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3.5 rounded-xl bg-surface-alt mb-2.5 last:mb-0">
      <div className="text-[0.7rem] font-semibold tracking-[0.06em] uppercase text-thread-dark mb-2">
        {label}
      </div>
      <div className="text-[0.84rem] leading-relaxed">{children}</div>
    </div>
  );
}

function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-block px-2.5 py-0.5 rounded-md text-[0.72rem] font-medium m-0.5', className)}>
      {children}
    </span>
  );
}

/* ── Main component ────────────────────────────────────────────── */

export function LandingPage() {
  const nav = useTranslations('Nav');
  const hero = useTranslations('Hero');
  const demo = useTranslations('HeroDemo');
  const ex = useTranslations('Examples');
  const ep = useTranslations('ExPersonal');
  const eg = useTranslations('ExGroup');
  const ew = useTranslations('ExWork');
  const how = useTranslations('HowItWorks');
  const rev = useTranslations('Revolution');
  const str = useTranslations('Structure');
  const cta = useTranslations('Cta');
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

  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━ NAV ━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="fixed top-0 inset-x-0 z-50 px-5 md:px-10 py-[18px] flex items-center justify-between glass border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 font-serif text-[1.45rem] text-content">
          <Logo />
          LoomKnot
        </Link>
        <div className="hidden md:flex gap-7 items-center">
          <a href="#examples" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">
            {nav('examples')}
          </a>
          <a href="#how" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">
            {nav('howItWorks')}
          </a>
          <a href="#revolution" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">
            {nav('values')}
          </a>
          <LanguageSwitcher variant="compact" />
          <ThemeToggle />
          <Link
            href="/login"
            className="bg-ink text-cream px-[22px] py-2.5 rounded-pill text-sm font-medium transition-transform duration-normal hover:scale-[1.03]"
          >
            {nav('signIn')}
          </Link>
        </div>
      </nav>

      {/* ━━━━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[120px] pb-[60px] relative overflow-hidden">
        {/* Gradient overlay */}
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

        {/* Animated thread lines */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          {[
            { top: '18%', left: '-10%', width: '55%', delay: '0s' },
            { top: '33%', right: '-10%', width: '48%', delay: '2s' },
            { top: '52%', left: '5%', width: '65%', delay: '4s' },
            { top: '72%', right: '0', width: '42%', delay: '1s' },
            { top: '86%', left: '-5%', width: '50%', delay: '3s' },
          ].map((t, i) => (
            <div
              key={i}
              className="absolute h-px"
              style={{
                top: t.top,
                left: t.left,
                right: t.right,
                width: t.width,
                background: 'linear-gradient(90deg, transparent, var(--color-thread), transparent)',
                animation: `thread-flow 8s ease-in-out infinite ${t.delay}`,
              }}
            />
          ))}
        </div>

        {/* Eyebrow */}
        <p
          className="text-[clamp(0.95rem,1.6vw,1.12rem)] font-medium text-thread-dark mb-3.5 tracking-[0.01em] relative"
          style={{ animation: 'hero-fade-up 0.7s ease-out both' }}
        >
          {hero('eyebrow')}
        </p>

        {/* Title */}
        <h1
          className="font-serif text-[clamp(2.8rem,7vw,5.2rem)] leading-[1.04] font-normal max-w-[820px] tracking-[-0.025em] relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out 0.08s both' }}
        >
          {hero.rich('title', { accent: accentTag, br: brTag })}
          <span className="block font-sans text-[clamp(1rem,2vw,1.35rem)] font-normal text-content-secondary tracking-normal leading-normal mt-[18px]">
            {hero('subtitle')}
          </span>
        </h1>

        {/* Demo card */}
        <div
          className="mt-11 w-full max-w-[660px] relative"
          style={{ animation: 'hero-fade-up 0.9s ease-out 0.25s both' }}
        >
          <div className="bg-surface-elevated rounded-xl border border-border shadow-float overflow-hidden">
            {/* Browser bar */}
            <div className="px-4 py-2.5 bg-surface-alt border-b border-border flex items-center gap-2 text-[0.78rem] text-muted">
              <div className="flex gap-1.5">
                <span className="w-[9px] h-[9px] rounded-full bg-accent-soft" />
                <span className="w-[9px] h-[9px] rounded-full bg-thread-light" />
                <span className="w-[9px] h-[9px] rounded-full bg-sage-light" />
              </div>
              <span className="flex-1 text-center font-mono">
                loomknot.com/app/<b className="text-accent font-semibold">my-lisbon</b>
              </span>
            </div>
            {/* Messages */}
            <div className="p-5 flex flex-col gap-3">
              {[
                {
                  variant: 'user' as const,
                  delay: '0.8s',
                  content: demo('userMsg1'),
                },
                {
                  variant: 'ai' as const,
                  delay: '2.2s',
                  agent: demo('agentLabel'),
                  agentColor: 'var(--color-claude)',
                  content: demo.rich('aiMsg1', { strong: strongTag }),
                  tag: demo('aiMsg1Tag'),
                  tagType: 'mem' as const,
                },
                {
                  variant: 'user' as const,
                  delay: '4.0s',
                  content: demo('userMsg2'),
                },
                {
                  variant: 'ai' as const,
                  delay: '5.4s',
                  agent: demo('agentLabel'),
                  agentColor: 'var(--color-claude)',
                  content: demo.rich('aiMsg2', { strong: strongTag }),
                  tag: demo('aiMsg2Tag'),
                  tagType: 'page' as const,
                },
              ].map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[86%] px-3.5 py-[11px] rounded-[14px] text-[0.84rem] leading-relaxed',
                    msg.variant === 'user' && 'self-end bg-ink text-cream rounded-br-[5px]',
                    msg.variant === 'ai' && 'self-start bg-surface-alt text-content rounded-bl-[5px] border border-border',
                  )}
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'msg-appear 0.5s ease-out forwards',
                    animationDelay: msg.delay,
                  }}
                >
                  {msg.variant === 'ai' && (
                    <span
                      className="text-[0.66rem] font-bold tracking-[0.04em] uppercase mb-1.5 block"
                      style={{ color: msg.agentColor }}
                    >
                      {msg.agent}
                    </span>
                  )}
                  {msg.content}
                  {msg.variant === 'ai' && msg.tag && (
                    <span className={cn(
                      'inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-[7px] text-[0.7rem] font-semibold',
                      msg.tagType === 'mem' && 'bg-sage/10 text-sage',
                      msg.tagType === 'page' && 'bg-accent/[0.08] text-accent',
                    )}>
                      {msg.tag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent pills */}
        <div
          className="flex gap-2.5 items-center mt-8 flex-wrap justify-center relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out 0.45s both' }}
        >
          <span className="text-[0.82rem] text-muted me-1">{hero('worksWithAi')}</span>
          {[
            { name: 'Claude', color: 'var(--color-claude)', border: 'rgba(212,165,116,0.35)', text: '#8B5E15', bg: 'rgba(212,165,116,0.06)' },
            { name: 'ChatGPT', color: 'var(--color-chatgpt)', border: 'rgba(116,170,156,0.35)', text: '#4E8A7C', bg: 'rgba(116,170,156,0.06)' },
            { name: 'Gemini', color: 'var(--color-gemini)', border: 'rgba(139,156,247,0.35)', text: '#6B7DE0', bg: 'rgba(139,156,247,0.06)' },
          ].map((a) => (
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

        {/* CTA row */}
        <div
          className="flex flex-col md:flex-row gap-3.5 items-center mt-8 relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out 0.5s both' }}
        >
          <a
            href="#cta"
            className="bg-ink text-cream px-8 py-[15px] rounded-pill text-base font-semibold transition-all duration-normal hover:-translate-y-0.5 hover:shadow-lg"
          >
            {hero('reserveSpace')}
          </a>
          <a
            href="#examples"
            className="text-muted px-5 py-[15px] text-[0.95rem] font-medium transition-colors duration-normal hover:text-content"
          >
            {hero('seeExamples')}
          </a>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ EXAMPLES ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-6 pb-[100px] pt-[60px] max-w-[1100px] mx-auto" id="examples">
        <div className="text-[0.78rem] font-semibold tracking-[0.1em] uppercase mb-3.5 text-center text-thread-dark reveal">
          {ex('label')}
        </div>
        <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight text-center mb-3 reveal">
          {ex.rich('title', { accent: accentTag })}
        </h2>
        <p className="text-center text-muted text-base max-w-[540px] mx-auto mb-12 leading-relaxed reveal">
          {ex('subtitle')}
        </p>

        {/* ── Example 1: Personal — Lisbon ─── */}
        <div className="mb-20 reveal">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-[0.72rem] font-semibold tracking-[0.06em] uppercase bg-thread/[0.12] text-thread-dark mb-3.5">
            {ep('badge')}
          </span>
          <div className="font-serif text-[clamp(1.5rem,3vw,2rem)] mb-1.5">{ep('title')}</div>
          <p className="text-muted text-[0.95rem] mb-6 leading-relaxed max-w-[600px]">
            {ep('description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ChatPanel agent="Claude" agentColor="var(--color-claude)" mcpLabel="MCP → lisbon-move">
              <UserMsg>{ep('userMsg1')}</UserMsg>
              <AiMsg agent="Claude" agentColor="var(--color-claude)">
                {ep.rich('aiMsg1', { strong: strongTag })}
                <br />
                <MemTag>{ep('aiMsg1MemTag')}</MemTag>
                <PageCreatedTag>{ep('aiMsg1PageTag')}</PageCreatedTag>
              </AiMsg>
              <UserMsg>{ep('userMsg2')}</UserMsg>
              <AiMsg agent="Claude" agentColor="var(--color-claude)">
                {ep.rich('aiMsg2', { strong: strongTag })}
                <br />
                <PageCreatedTag>{ep('aiMsg2PageTag')}</PageCreatedTag>
              </AiMsg>
            </ChatPanel>

            <PagePanel url={<>loomknot.com/app/<b className="text-accent font-semibold">lisbon-move</b>/apartments</>}>
              <div className="font-serif text-[1.3rem] mb-1">{ep('pageTitle')}</div>
              <div className="text-[0.72rem] text-muted mb-[18px]">{ep('pageUpdated')}</div>

              <ContentBlock label={ep('filtersLabel')}>
                <div className="flex gap-1 flex-wrap">
                  <Tag className="bg-thread/10 text-thread-dark">{ep('filterBudget')}</Tag>
                  <Tag className="bg-sage/10 text-sage">{ep('filterBalcony')}</Tag>
                  <Tag className="bg-info/10 text-info">{ep('filterWifi')}</Tag>
                  <Tag className="bg-accent/[0.08] text-accent">{ep('filterRunning')}</Tag>
                </div>
              </ContentBlock>

              <ContentBlock label={ep('bestOptionLabel')}>
                <strong>{ep('bestOptionTitle')}</strong>
                <br />
                {ep('bestOptionLine1')}
                <br />
                {ep('bestOptionLine2')}
                <br />
                {ep('bestOptionLine3')}
              </ContentBlock>

              <ContentBlock label={ep('checklistLabel')}>
                {ep('checklistNif')}{' '}
                <span className="text-accent cursor-pointer">{ep('checklistNifLink')}</span>
                <br />
                {ep('checklistRental')}
                <br />
                {ep('checklistNiss')}
                <br />
                {ep('checklistBank')} <em>{ep('checklistBankNote')}</em>
              </ContentBlock>
            </PagePanel>
          </div>
        </div>

        {/* ── Example 2: Group — Barcelona ─── */}
        <div className="mb-20 reveal">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-[0.72rem] font-semibold tracking-[0.06em] uppercase bg-sage/[0.12] text-sage mb-3.5">
            {eg('badge')}
          </span>
          <div className="font-serif text-[clamp(1.5rem,3vw,2rem)] mb-1.5">{eg('title')}</div>
          <p className="text-muted text-[0.95rem] mb-6 leading-relaxed max-w-[600px]">
            {eg('description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ChatPanel agent="ChatGPT" agentColor="var(--color-chatgpt)" mcpLabel="MCP → bcn-march">
              <UserMsg>{eg('userMsg1')}</UserMsg>
              <AiMsg agent="ChatGPT" agentColor="var(--color-chatgpt)">
                {eg('aiMsg1')}
                <br />
                <MemTag>{eg('aiMsg1MemTag')}</MemTag>
              </AiMsg>
              <UserMsg>{eg('userMsg2')}</UserMsg>
              <AiMsg agent="ChatGPT" agentColor="var(--color-chatgpt)">
                {eg.rich('aiMsg2', { strong: strongTag })}
                <br />
                <PageCreatedTag>{eg('aiMsg2PageTag')}</PageCreatedTag>
              </AiMsg>
            </ChatPanel>

            <PagePanel url={<>loomknot.com/web/<b className="text-accent font-semibold">bcn-march</b>/saturday</>}>
              <div className="font-serif text-[1.3rem] mb-1">{eg('pageTitle')}</div>
              <div className="text-[0.72rem] text-muted mb-4">{eg('pageParticipants')}</div>

              {/* Split view */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Masha */}
                <div className="bg-surface-alt rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[0.75rem] text-white font-bold"
                      style={{ background: 'linear-gradient(135deg, var(--color-sage), #5B8660)' }}
                    >
                      M
                    </div>
                    <div>
                      <div className="text-[0.8rem] font-semibold">{eg('mashaName')}</div>
                      <div className="text-[0.68rem] text-muted">{eg('mashaAgent')}</div>
                    </div>
                  </div>
                  <div className="text-[0.8rem] leading-relaxed space-y-1">
                    <div>{eg('mashaSchedule1')}</div>
                    <div>
                      {eg('mashaSchedule2')} <span className="text-sage font-semibold">{eg('mashaVeganTag')}</span>
                    </div>
                    <div>{eg('mashaSchedule3')}</div>
                  </div>
                </div>
                {/* Petya */}
                <div className="bg-surface-alt rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[0.75rem] text-white font-bold"
                      style={{ background: 'linear-gradient(135deg, #8B9CF7, #6B7DE0)' }}
                    >
                      P
                    </div>
                    <div>
                      <div className="text-[0.8rem] font-semibold">{eg('petyaName')}</div>
                      <div className="text-[0.68rem] text-muted">{eg('petyaAgent')}</div>
                    </div>
                  </div>
                  <div className="text-[0.8rem] leading-relaxed space-y-1">
                    <div>{eg('petyaSchedule1')}</div>
                    <div>
                      {eg('petyaSchedule2')} <span className="text-thread-dark font-semibold">{eg('petyaBudgetTag')}</span>
                    </div>
                    <div>{eg('petyaSchedule3')}</div>
                  </div>
                </div>
              </div>

              {/* Compromise block */}
              <div
                className="rounded-[14px] p-4 mt-3.5 border-[1.5px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(77,153,86,0.08), rgba(227,91,66,0.06))',
                  borderColor: 'rgba(77,153,86,0.2)',
                }}
              >
                <div className="text-[0.72rem] font-bold tracking-[0.06em] uppercase text-sage mb-2 flex items-center gap-1.5">
                  {eg('compromiseLabel')}
                </div>
                <div className="text-[0.84rem] leading-relaxed">
                  {eg.rich('compromiseLine1', { strong: strongTag })}
                  <br />
                  {eg.rich('compromiseLine2', { strong: strongTag })}
                </div>
              </div>
            </PagePanel>
          </div>
        </div>

        {/* ── Example 3: Work — Kitchen ─── */}
        <div className="reveal">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-[0.72rem] font-semibold tracking-[0.06em] uppercase bg-sage/[0.12] text-sage mb-3.5">
            {ew('badge')}
          </span>
          <div className="font-serif text-[clamp(1.5rem,3vw,2rem)] mb-1.5">{ew('title')}</div>
          <p className="text-muted text-[0.95rem] mb-6 leading-relaxed max-w-[600px]">
            {ew('description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ChatPanel agent="Gemini" agentColor="var(--color-gemini)" mcpLabel="MCP → kitchen-reno">
              <UserMsg>{ew('userMsg1')}</UserMsg>
              <AiMsg agent="Gemini" agentColor="var(--color-gemini)">
                {ew.rich('aiMsg1', { strong: strongTag })}
                <br />
                <MemTag>{ew('aiMsg1MemTag')}</MemTag>
              </AiMsg>
              <UserMsg>{ew('userMsg2')}</UserMsg>
              <AiMsg agent="Gemini" agentColor="var(--color-gemini)">
                {ew.rich('aiMsg2', { strong: strongTag })}
                <br />
                <PageCreatedTag>{ew('aiMsg2PageTag')}</PageCreatedTag>
              </AiMsg>
            </ChatPanel>

            <PagePanel url={<>loomknot.com/app/<b className="text-accent font-semibold">kitchen-reno</b>/budget</>}>
              <div className="font-serif text-[1.3rem] mb-1">{ew('pageTitle')}</div>
              <div className="text-[0.72rem] text-muted mb-4">{ew('pageParticipants')}</div>

              <ContentBlock label={ew('totalBudgetLabel')}>
                <div className="flex justify-between items-center">
                  <div className="text-[1.3rem] font-bold font-serif">
                    {ew('totalBudgetAmount')} <span className="text-[0.8rem] text-muted font-normal">{ew('totalBudgetOf')}</span>
                  </div>
                  <div className="w-[100px] h-2 bg-surface-alt rounded overflow-hidden ms-3">
                    <div
                      className="h-full rounded"
                      style={{
                        width: '84%',
                        background: 'linear-gradient(90deg, var(--color-sage), var(--color-thread))',
                      }}
                    />
                  </div>
                </div>
              </ContentBlock>

              <ContentBlock label={ew('decisionLabel')}>
                {ew.rich('decisionText', { strong: strongTag })}
                <br />
                <span className="text-[0.76rem] text-muted">
                  {ew('decisionDesigner')}
                </span>
                <br />
                <span className="text-[0.76rem] text-accent font-semibold">{ew('decisionAwaiting')}</span>
              </ContentBlock>

              <ContentBlock label={ew('approvedLabel')}>
                <span className="text-[0.82rem]">{ew('approvedItems')}</span>
              </ContentBlock>
            </PagePanel>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-[100px] px-6 bg-ink text-cream relative overflow-hidden" id="how">
        {/* Subtle gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 50% 40% at 30% 60%, rgba(199,140,42,0.05) 0%, transparent 70%),
              radial-gradient(ellipse 40% 50% at 80% 30%, rgba(77,153,86,0.04) 0%, transparent 70%)
            `,
          }}
        />
        <div className="max-w-[1000px] mx-auto relative">
          <div className="text-[0.78rem] font-semibold tracking-[0.1em] uppercase mb-3.5 text-center text-thread reveal">
            {how('label')}
          </div>
          <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight text-center mb-3 reveal">
            {how('title')}
          </h2>
          <p className="text-center text-cream/50 text-base max-w-[540px] mx-auto mb-14 leading-relaxed reveal">
            {how('subtitle')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {([
              { num: '1', icon: '🔗', titleKey: 'step1Title' as const, descKey: 'step1Desc' as const },
              { num: '2', icon: '💬', titleKey: 'step2Title' as const, descKey: 'step2Desc' as const },
              { num: '3', icon: '📄', titleKey: 'step3Title' as const, descKey: 'step3Desc' as const },
              { num: '4', icon: '👥', titleKey: 'step4Title' as const, descKey: 'step4Desc' as const },
            ]).map((step, i) => (
              <div
                key={step.num}
                className="text-center p-8 rounded-xl border border-thread/10 bg-white/[0.02] transition-all duration-slow hover:bg-white/[0.04] hover:border-thread/20 hover:-translate-y-1 reveal"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-thread/10 flex items-center justify-center font-serif text-lg text-thread mx-auto mb-4">
                  {step.num}
                </div>
                <span className="text-[2rem] mb-3.5 block">{step.icon}</span>
                <h3 className="font-serif text-lg mb-2">{how(step.titleKey)}</h3>
                <p className="text-[0.84rem] text-cream/55 leading-relaxed">{how(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ REVOLUTION ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 px-6 max-w-[900px] mx-auto" id="revolution">
        <div className="text-[0.78rem] font-semibold tracking-[0.1em] uppercase mb-3.5 text-center text-thread-dark reveal">
          {rev('label')}
        </div>
        <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight text-center mb-3 reveal">
          {rev.rich('title', { accent: accentTag })}
        </h2>
        <p className="text-center text-muted text-base max-w-[540px] mx-auto mb-12 leading-relaxed reveal">
          {rev('subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { icon: '🧠', titleKey: 'card1Title' as const, descKey: 'card1Desc' as const },
            { icon: '🔓', titleKey: 'card2Title' as const, descKey: 'card2Desc' as const },
            { icon: '⚡', titleKey: 'card3Title' as const, descKey: 'card3Desc' as const },
            { icon: '🌐', titleKey: 'card4Title' as const, descKey: 'card4Desc' as const },
            { icon: '🛠', titleKey: 'card5Title' as const, descKey: 'card5Desc' as const },
            { icon: '🔒', titleKey: 'card6Title' as const, descKey: 'card6Desc' as const },
          ]).map((card, i) => (
            <div
              key={card.titleKey}
              className="p-7 rounded-[18px] border border-border bg-surface-elevated transition-all duration-slow hover:-translate-y-[3px] hover:shadow-md reveal"
              style={{ transitionDelay: `${(i % 2) * 0.1}s` }}
            >
              <span className="text-[1.8rem] mb-3 block">{card.icon}</span>
              <div className="font-serif text-lg mb-1.5">{rev(card.titleKey)}</div>
              <div className="text-[0.86rem] text-muted leading-relaxed">{rev(card.descKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ STRUCTURE ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-6 pt-[60px] pb-20 max-w-[700px] mx-auto text-center reveal">
        <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight mb-8">
          {str('title')}
        </h2>
        <div className="flex flex-col gap-2.5">
          {[
            { emoji: '🏠', path: 'loomknot.com', accent: undefined, descKey: 'row1Desc' as const },
            { emoji: '⚙️', path: 'loomknot.com', accent: '/app', descKey: 'row2Desc' as const },
            { emoji: '🌐', path: 'loomknot.com', accent: '/web/bcn-march', descKey: 'row3Desc' as const },
          ].map((row) => (
            <div
              key={row.descKey}
              className="flex flex-col md:flex-row items-center gap-3.5 px-5 py-4 rounded-[14px] border border-border bg-surface-elevated text-start transition-colors duration-normal hover:border-thread"
            >
              <span className="text-xl min-w-[28px] text-center">{row.emoji}</span>
              <span className="font-mono font-semibold text-[0.86rem] md:min-w-[210px]">
                {row.path}
                {row.accent && <span className="text-accent">{row.accent}</span>}
              </span>
              <span className="text-[0.84rem] text-muted">{str(row.descKey)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ CTA ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-[100px] px-6 text-center relative" id="cta" style={{ background: 'linear-gradient(180deg, var(--lk-surface) 0%, var(--lk-surface-alt) 100%)' }}>
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-thread-light), transparent)' }}
        />
        <h2 className="font-serif text-[clamp(2rem,5vw,3.2rem)] leading-[1.1] mb-[18px] max-w-[580px] mx-auto reveal">
          {cta.rich('title', { em: emTag })}
        </h2>
        <p className="text-base text-muted mb-8 leading-relaxed reveal">
          {cta.rich('subtitle', { strong: strongTag })}
        </p>
        <div className="flex flex-col md:flex-row gap-2.5 max-w-[440px] mx-auto reveal">
          <input
            type="text"
            className="flex-1 px-[18px] py-[15px] border-[1.5px] border-thread-light rounded-[14px] text-[0.95rem] font-sans bg-surface-elevated text-content outline-none transition-colors duration-normal focus:border-thread placeholder:text-muted"
            placeholder={cta('placeholder')}
          />
          <button className="px-7 py-[15px] bg-accent text-white border-none rounded-[14px] text-[0.95rem] font-semibold font-sans cursor-pointer transition-all duration-normal hover:bg-[#C4543D] hover:-translate-y-0.5 whitespace-nowrap">
            {cta('button')}
          </button>
        </div>
        <p className="mt-3.5 text-[0.78rem] text-muted reveal">{cta('note')}</p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="py-9 px-6 text-center border-t border-border">
        <div className="flex items-center justify-center gap-4">
          <p className="text-[0.8rem] text-muted">{footer('copyright')}</p>
          <LanguageSwitcher variant="compact" />
        </div>
      </footer>
    </>
  );
}
