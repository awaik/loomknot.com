'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

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
        <span className="text-content-tertiary font-normal text-[0.78rem] ml-auto">{mcpLabel}</span>
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
            Examples
          </a>
          <a href="#how" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">
            How it works
          </a>
          <a href="#revolution" className="text-muted text-sm font-medium transition-colors duration-normal hover:text-content">
            Values
          </a>
          <ThemeToggle />
          <Link
            href="/login"
            className="bg-ink text-cream px-[22px] py-2.5 rounded-pill text-sm font-medium transition-transform duration-normal hover:scale-[1.03]"
          >
            Sign in
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
          Your AI can do more. Much more.
        </p>

        {/* Title */}
        <h1
          className="font-serif text-[clamp(2.8rem,7vw,5.2rem)] leading-[1.04] font-normal max-w-[820px] tracking-[-0.025em] relative"
          style={{ animation: 'hero-fade-up 0.8s ease-out 0.08s both' }}
        >
          Your{' '}
          <em className="italic text-accent relative">
            internet
            <span className="absolute bottom-0.5 left-0 right-0 h-[3px] bg-accent-soft rounded-sm" />
          </em>
          .<br />
          Your AI inside.
          <span className="block font-sans text-[clamp(1rem,2vw,1.35rem)] font-normal text-content-secondary tracking-normal leading-normal mt-[18px]">
            We built a space where your ChatGPT, Claude or Gemini
            <br className="hidden md:block" />
            creates pages, remembers everything, and works for&nbsp;you&nbsp;—&nbsp;not&nbsp;the&nbsp;platform.
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
                  content: "I'm moving to Lisbon. Remote work, budget 1200\u20AC, I want to run near the water and need decent WiFi.",
                },
                {
                  variant: 'ai' as const,
                  delay: '2.2s',
                  agent: 'Claude \u2192 your project',
                  agentColor: 'var(--color-claude)',
                  content: (
                    <>
                      Saved. Santos is best for you — waterfront, quiet, coworking nearby. Creating an apartment page filtered
                      by <strong>WiFi speed and distance to running routes</strong>.
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-[7px] text-[0.7rem] font-semibold bg-sage/10 text-sage">
                        💾 remembered: remote work, running, 1200\u20AC
                      </span>
                    </>
                  ),
                },
                {
                  variant: 'user' as const,
                  delay: '4.0s',
                  content: 'I also need a document checklist for the residence permit.',
                },
                {
                  variant: 'ai' as const,
                  delay: '5.4s',
                  agent: 'Claude \u2192 your project',
                  agentColor: 'var(--color-claude)',
                  content: (
                    <>
                      Done. "Documents" page — NIF, NISS, bank, insurance. I know you're a freelancer —{' '}
                      <strong>added steps for self-employed</strong>, not salaried workers.
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-[7px] text-[0.7rem] font-semibold bg-accent/[0.08] text-accent">
                        📄 created: /documents, /apartments
                      </span>
                    </>
                  ),
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
          <span className="text-[0.82rem] text-muted mr-1">Works with your AI:</span>
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
            Reserve your space ↗
          </a>
          <a
            href="#examples"
            className="text-muted px-5 py-[15px] text-[0.95rem] font-medium transition-colors duration-normal hover:text-content"
          >
            See examples ↓
          </a>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ EXAMPLES ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-6 pb-[100px] pt-[60px] max-w-[1100px] mx-auto" id="examples">
        <div className="text-[0.78rem] font-semibold tracking-[0.1em] uppercase mb-3.5 text-center text-thread-dark reveal">
          Examples — from personal to group
        </div>
        <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight text-center mb-3 reveal">
          Not just a website. Your{' '}
          <em className="font-serif italic text-accent">space</em> with&nbsp;AI.
        </h2>
        <p className="text-center text-muted text-base max-w-[540px] mx-auto mb-12 leading-relaxed reveal">
          The same LoomKnot. For yourself, for two, for a team. Here's what it looks like:
        </p>

        {/* ── Example 1: Personal — Lisbon ─── */}
        <div className="mb-20 reveal">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-[0.72rem] font-semibold tracking-[0.06em] uppercase bg-thread/[0.12] text-thread-dark mb-3.5">
            👤 Personal project
          </span>
          <div className="font-serif text-[clamp(1.5rem,3vw,2rem)] mb-1.5">Moving to Lisbon</div>
          <p className="text-muted text-[0.95rem] mb-6 leading-relaxed max-w-[600px]">
            You're moving to a new city. Instead of dozens of tabs — one project where AI gathers everything for you and
            remembers every decision.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ChatPanel agent="Claude" agentColor="var(--color-claude)" mcpLabel="MCP → lisbon-move">
              <UserMsg>
                I'm moving to Lisbon in May. I work remotely, rent budget up to 1200\u20AC, I need good WiFi and the sea
                or a park nearby for running.
              </UserMsg>
              <AiMsg agent="Claude" agentColor="var(--color-claude)">
                Great! I'll save your criteria to the project. For Lisbon, the 3 best neighborhoods for you are:{' '}
                <strong>Principe Real</strong> (park + coworkings), <strong>Santos</strong> (waterfront + quiet) and{' '}
                <strong>Gra\u00E7a</strong> (views + cheaper). Creating a comparison page.
                <br />
                <MemTag>💾 Saved to project memory</MemTag>
                <PageCreatedTag>📄 Created: /neighborhoods</PageCreatedTag>
              </AiMsg>
              <UserMsg>Santos — that's exactly what I need. Find apartments on Idealista under 1100\u20AC with a balcony.</UserMsg>
              <AiMsg agent="Claude" agentColor="var(--color-claude)">
                Santos selected as the main neighborhood. Found 8 apartments, filtered by WiFi reviews and balcony
                availability. The best 3 are on a new page. I also added <strong>distance to the nearest running trail</strong> — I
                remember that's important to you.
                <br />
                <PageCreatedTag>📄 Created: /apartments</PageCreatedTag>
              </AiMsg>
            </ChatPanel>

            <PagePanel url={<>loomknot.com/app/<b className="text-accent font-semibold">lisbon-move</b>/apartments</>}>
              <div className="font-serif text-[1.3rem] mb-1">🏠 Apartments in Santos</div>
              <div className="text-[0.72rem] text-muted mb-[18px]">Updated 5 minutes ago · Claude</div>

              <ContentBlock label="Your filters (remembered)">
                <div className="flex gap-1 flex-wrap">
                  <Tag className="bg-thread/10 text-thread-dark">under 1100\u20AC</Tag>
                  <Tag className="bg-sage/10 text-sage">balcony</Tag>
                  <Tag className="bg-info/10 text-info">WiFi 100+ Mbps</Tag>
                  <Tag className="bg-accent/[0.08] text-accent">running nearby</Tag>
                </div>
              </ContentBlock>

              <ContentBlock label="⭐ Best option">
                <strong>Rua de Santos, T2 · 1050\u20AC/mo</strong>
                <br />
                Sunset-facing balcony. WiFi 220 Mbps (verified).
                <br />
                🏃 600m to Jardim da Estrela (1.2 km dirt trail)
                <br />
                🛒 Pingo Doce — 3 min walk
              </ContentBlock>

              <ContentBlock label="📋 Auto-checklist for moving">
                ☑️ NIF (tax number) —{' '}
                <span className="text-accent cursor-pointer">guide →</span>
                <br />
                ☐ Rental contract
                <br />
                ☐ NISS (social security)
                <br />
                ☐ Conta banc\u00E1ria (bank account) — <em>NIF required</em>
              </ContentBlock>
            </PagePanel>
          </div>
        </div>

        {/* ── Example 2: Group — Barcelona ─── */}
        <div className="mb-20 reveal">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-[0.72rem] font-semibold tracking-[0.06em] uppercase bg-sage/[0.12] text-sage mb-3.5">
            👥 Group project
          </span>
          <div className="font-serif text-[clamp(1.5rem,3vw,2rem)] mb-1.5">Barcelona for four</div>
          <p className="text-muted text-[0.95rem] mb-6 leading-relaxed max-w-[600px]">
            Four friends. Two AIs. Everyone has their own preferences — AI agents see them all and build a route that
            works for everyone.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ChatPanel agent="ChatGPT" agentColor="var(--color-chatgpt)" mcpLabel="MCP → bcn-march">
              <UserMsg>
                Connect to our Barcelona project. I'm Petya, I love nightlife and street food, budget is tight.
              </UserMsg>
              <AiMsg agent="ChatGPT" agentColor="var(--color-chatgpt)">
                Connected! I see a project with 3 participants. Masha (via Claude) prefers walking tours and vegan food,
                Anya — museums and coffee shops. I'll save your preferences.
                <br />
                <MemTag>💾 Petya's profile saved</MemTag>
              </AiMsg>
              <UserMsg>Make a plan for Saturday that's great for everyone.</UserMsg>
              <AiMsg agent="ChatGPT" agentColor="var(--color-chatgpt)">
                Done! Morning — a group walk through the Gothic Quarter (everyone loves it). Brunch — I found{' '}
                <strong>Flax & Kale</strong>: vegan menu for Masha, regular food for everyone else, budget-friendly.
                Afternoon — Masha and Anya at MACBA, while you hit the nearby street food market{' '}
                <strong>La Boqueria</strong>. Evening — everyone at Barceloneta together, then you and whoever's up for
                it — Razzmatazz.
                <br />
                <PageCreatedTag>📄 Updated: /saturday</PageCreatedTag>
              </AiMsg>
            </ChatPanel>

            <PagePanel url={<>loomknot.com/web/<b className="text-accent font-semibold">bcn-march</b>/saturday</>}>
              <div className="font-serif text-[1.3rem] mb-1">📍 Saturday, March 21</div>
              <div className="text-[0.72rem] text-muted mb-4">4 participants · 2 AI agents</div>

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
                      <div className="text-[0.8rem] font-semibold">Masha</div>
                      <div className="text-[0.68rem] text-muted">Claude · 🚶 🌱</div>
                    </div>
                  </div>
                  <div className="text-[0.8rem] leading-relaxed space-y-1">
                    <div>09:00 — Park G\u00FCell (on foot!)</div>
                    <div>
                      11:00 — Flax & Kale <span className="text-sage font-semibold">vegan ✓</span>
                    </div>
                    <div>14:00 — MACBA</div>
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
                      <div className="text-[0.8rem] font-semibold">Petya</div>
                      <div className="text-[0.68rem] text-muted">ChatGPT · 🎉 💰</div>
                    </div>
                  </div>
                  <div className="text-[0.8rem] leading-relaxed space-y-1">
                    <div>09:00 — Park G\u00FCell (together)</div>
                    <div>
                      11:00 — Flax & Kale <span className="text-thread-dark font-semibold">menu 12\u20AC</span>
                    </div>
                    <div>14:00 — La Boqueria 🌮</div>
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
                  ⚡ AI compromise
                </div>
                <div className="text-[0.84rem] leading-relaxed">
                  <strong>18:00 — Barceloneta</strong> together (free, by the water).
                  <br />
                  <strong>22:00 — split up:</strong> Masha + Anya → wine bar in El Born. Petya + Dima → Razzmatazz
                  (entry 15\u20AC before midnight).
                </div>
              </div>
            </PagePanel>
          </div>
        </div>

        {/* ── Example 3: Work — Kitchen ─── */}
        <div className="reveal">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-[0.72rem] font-semibold tracking-[0.06em] uppercase bg-sage/[0.12] text-sage mb-3.5">
            👥 Work project
          </span>
          <div className="font-serif text-[clamp(1.5rem,3vw,2rem)] mb-1.5">Kitchen renovation</div>
          <p className="text-muted text-[0.95rem] mb-6 leading-relaxed max-w-[600px]">
            A client, a designer, and a contractor — each with their own AI. All decisions, materials, and budget — on
            one page that updates in real time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ChatPanel agent="Gemini" agentColor="var(--color-gemini)" mcpLabel="MCP → kitchen-reno">
              <UserMsg>I'm the contractor, joining the renovation project. What's the status on the kitchen?</UserMsg>
              <AiMsg agent="Gemini" agentColor="var(--color-gemini)">
                I see the project: client Lena (Claude) chose Scandinavian style, budget 800,000₽, designer Oleg
                (ChatGPT) approved the L-shaped kitchen layout, 12m². Saving you as the contractor. You have access to:{' '}
                <strong>budget</strong>, <strong>materials</strong>, <strong>timeline</strong>.
                <br />
                <MemTag>💾 Role: contractor</MemTag>
              </AiMsg>
              <UserMsg>Quartz composite countertop won't fit the budget. Any alternatives?</UserMsg>
              <AiMsg agent="Gemini" agentColor="var(--color-gemini)">
                I see that Lena wrote "want a light countertop, stain-resistant." Quartz — 85,000₽. Alternatives:{' '}
                <strong>HPL Egger</strong> (18,000₽, similar look, less durable) or <strong>12mm porcelain stoneware</strong>{' '}
                (45,000₽, premium look). Creating a comparison and pinging Lena and Oleg.
                <br />
                <PageCreatedTag>📄 Created: /countertop-options</PageCreatedTag>
              </AiMsg>
            </ChatPanel>

            <PagePanel url={<>loomknot.com/app/<b className="text-accent font-semibold">kitchen-reno</b>/budget</>}>
              <div className="font-serif text-[1.3rem] mb-1">💰 Kitchen budget</div>
              <div className="text-[0.72rem] text-muted mb-4">3 participants · 3 AI agents · Updated 2h ago</div>

              <ContentBlock label="Total budget">
                <div className="flex justify-between items-center">
                  <div className="text-[1.3rem] font-bold font-serif">
                    672,000₽ <span className="text-[0.8rem] text-muted font-normal">of 800,000₽</span>
                  </div>
                  <div className="w-[100px] h-2 bg-surface-alt rounded overflow-hidden ml-3">
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

              <ContentBlock label="⚠️ Decision needed">
                <strong>Countertop</strong> — contractor suggests <strong>12mm porcelain stoneware</strong> instead of
                quartz (saving 40,000₽).
                <br />
                <span className="text-[0.76rem] text-muted">
                  Oleg (designer): "Looks fine visually, but check the seams"
                </span>
                <br />
                <span className="text-[0.76rem] text-accent font-semibold">Awaiting Lena's decision →</span>
              </ContentBlock>

              <ContentBlock label="✅ Approved by all">
                <span className="text-[0.82rem]">
                  IKEA Voxtorp cabinets · Bosch appliances · Backsplash — white subway tile · Grohe faucet · Lighting —
                  Maytoni track
                </span>
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
            How it works
          </div>
          <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight text-center mb-3 reveal">
            Four steps — and&nbsp;your AI&nbsp;is&nbsp;inside
          </h2>
          <p className="text-center text-cream/50 text-base max-w-[540px] mx-auto mb-14 leading-relaxed reveal">
            No signing up for new services. You already use AI — now it can do more.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '1', icon: '🔗', title: 'Connect your AI', desc: 'During onboarding, add your ChatGPT, Claude or Gemini via MCP. One click.' },
              { num: '2', icon: '💬', title: 'Talk as usual', desc: 'Just chat with your AI. It automatically saves what matters to the project and builds pages.' },
              { num: '3', icon: '📄', title: 'Pages are alive', desc: 'Each page updates, remembers decisions, and adapts to you. It\'s not a document — it\'s memory.' },
              { num: '4', icon: '👥', title: 'Invite people', desc: 'Friends, colleagues, contractors — everyone connects their own AI and sees the project through their own lens.' },
            ].map((step, i) => (
              <div
                key={step.num}
                className="text-center p-8 rounded-xl border border-thread/10 bg-white/[0.02] transition-all duration-slow hover:bg-white/[0.04] hover:border-thread/20 hover:-translate-y-1 reveal"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-thread/10 flex items-center justify-center font-serif text-lg text-thread mx-auto mb-4">
                  {step.num}
                </div>
                <span className="text-[2rem] mb-3.5 block">{step.icon}</span>
                <h3 className="font-serif text-lg mb-2">{step.title}</h3>
                <p className="text-[0.84rem] text-cream/55 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ REVOLUTION ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 px-6 max-w-[900px] mx-auto" id="revolution">
        <div className="text-[0.78rem] font-semibold tracking-[0.1em] uppercase mb-3.5 text-center text-thread-dark reveal">
          Why this is a different web
        </div>
        <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight text-center mb-3 reveal">
          A page is{' '}
          <em className="font-serif italic text-accent">memory</em>, not a file
        </h2>
        <p className="text-center text-muted text-base max-w-[540px] mx-auto mb-12 leading-relaxed reveal">
          A regular website shows everyone the same thing. LoomKnot knows who you are, what you decided, and what you specifically need.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: '🧠', title: 'Explain once', desc: 'Tell your AI you\'re vegan — and on every project page, restaurants, recipes, and stores are already filtered. Forever.' },
            { icon: '🔓', title: 'No lock-in', desc: 'Using Claude? Great. Switched to ChatGPT? Your project stays, your memory stays. It\'s your data.' },
            { icon: '⚡', title: 'AI negotiates for you', desc: 'When preferences clash — "budget" vs "premium" — agents suggest a compromise instead of you arguing in chat.' },
            { icon: '🌐', title: 'One URL — a million versions', desc: 'The Barcelona link for a student shows bars and beaches, for a family — parks and restaurants. Content reshapes for everyone.' },
            { icon: '🛠', title: 'Claude Code works too', desc: 'Developer? Connect your project via CLI. The agent writes to the same pages — from the terminal, via API, however you want.' },
            { icon: '🔒', title: 'Three levels of privacy', desc: 'Personal preferences — only for your AI. Project decisions — for the team. Public page — for\u00A0everyone.' },
          ].map((card, i) => (
            <div
              key={card.title}
              className="p-7 rounded-[18px] border border-border bg-surface-elevated transition-all duration-slow hover:-translate-y-[3px] hover:shadow-md reveal"
              style={{ transitionDelay: `${(i % 2) * 0.1}s` }}
            >
              <span className="text-[1.8rem] mb-3 block">{card.icon}</span>
              <div className="font-serif text-lg mb-1.5">{card.title}</div>
              <div className="text-[0.86rem] text-muted leading-relaxed">{card.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ STRUCTURE ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-6 pt-[60px] pb-20 max-w-[700px] mx-auto text-center reveal">
        <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight mb-8">
          Simple. One place for&nbsp;everything.
        </h2>
        <div className="flex flex-col gap-2.5">
          {[
            { emoji: '🏠', path: 'loomknot.com', desc: 'Landing, documentation, information' },
            { emoji: '⚙️', path: 'loomknot.com', accent: '/app', desc: 'Your dashboard: projects, AI settings, preferences' },
            { emoji: '🌐', path: 'loomknot.com', accent: '/web/bcn-march', desc: 'Public page — what you share with friends' },
          ].map((row) => (
            <div
              key={row.accent ?? row.path}
              className="flex flex-col md:flex-row items-center gap-3.5 px-5 py-4 rounded-[14px] border border-border bg-surface-elevated text-left transition-colors duration-normal hover:border-thread"
            >
              <span className="text-xl min-w-[28px] text-center">{row.emoji}</span>
              <span className="font-mono font-semibold text-[0.86rem] md:min-w-[210px]">
                {row.path}
                {row.accent && <span className="text-accent">{row.accent}</span>}
              </span>
              <span className="text-[0.84rem] text-muted">{row.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ CTA ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-[100px] px-6 text-center relative" id="cta" style={{ background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-warm) 100%)' }}>
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-thread-light), transparent)' }}
        />
        <h2 className="font-serif text-[clamp(2rem,5vw,3.2rem)] leading-[1.1] mb-[18px] max-w-[580px] mx-auto reveal">
          Stake{' '}
          <em className="font-serif italic">your place</em> in&nbsp;the&nbsp;new&nbsp;web
        </h2>
        <p className="text-base text-muted mb-8 leading-relaxed reveal">
          Reserve loomknot.com/web/<strong>your-name</strong> — before it's taken.
        </p>
        <div className="flex flex-col md:flex-row gap-2.5 max-w-[440px] mx-auto reveal">
          <input
            type="text"
            className="flex-1 px-[18px] py-[15px] border-[1.5px] border-thread-light rounded-[14px] text-[0.95rem] font-sans bg-surface-elevated text-content outline-none transition-colors duration-normal focus:border-thread placeholder:text-muted"
            placeholder="loomknot.com/web/  your-project"
          />
          <button className="px-7 py-[15px] bg-accent text-white border-none rounded-[14px] text-[0.95rem] font-semibold font-sans cursor-pointer transition-all duration-normal hover:bg-[#C4543D] hover:-translate-y-0.5 whitespace-nowrap">
            Reserve
          </button>
        </div>
        <p className="mt-3.5 text-[0.78rem] text-muted reveal">Free. Launching spring 2026.</p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="py-9 px-6 text-center border-t border-border">
        <p className="text-[0.8rem] text-muted">&copy; 2026 LoomKnot &middot; Weaving AI, people, and&nbsp;pages</p>
      </footer>
    </>
  );
}
