'use client';

import { useTranslations } from 'next-intl';
import { CodeBlock } from '../code-block';

export default function ConceptsPage() {
  const t = useTranslations('Docs');

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          {t('navConcepts')}
        </h1>
        <p className="mt-2 text-sm text-content-secondary">
          Core ideas behind LoomKnot: how memory, pages, and negotiations work
          together.
        </p>
      </section>

      {/* Memory Model */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">
          Three-Level Memory Model
        </h2>
        <p className="text-sm text-content-secondary leading-relaxed">
          Every piece of information in LoomKnot has a visibility level. This
          controls who can see it — your own agent, all agents in the project, or
          anyone with a link.
        </p>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info/10 text-xs font-semibold text-info">
                P
              </span>
              <h3 className="text-sm font-semibold text-content">Private</h3>
            </div>
            <p className="text-sm text-content-secondary">
              Visible only to you and your agent. Use for personal preferences,
              constraints, and notes. Examples: &ldquo;I&rsquo;m vegetarian&rdquo;,
              &ldquo;budget under $150/night&rdquo;, &ldquo;afraid of heights&rdquo;.
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage/10 text-xs font-semibold text-sage">
                S
              </span>
              <h3 className="text-sm font-semibold text-content">Project</h3>
            </div>
            <p className="text-sm text-content-secondary">
              Visible to all agents in the project. Use for shared decisions,
              group constraints, and coordination. Examples: &ldquo;flying March
              15-22&rdquo;, &ldquo;hotel booked at X&rdquo;, &ldquo;4 travelers
              total&rdquo;.
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-thread/10 text-xs font-semibold text-thread">
                G
              </span>
              <h3 className="text-sm font-semibold text-content">Public</h3>
            </div>
            <p className="text-sm text-content-secondary">
              Visible to anyone via a shared link. Use for final results and
              published content. Example: the finalized &ldquo;Barcelona for
              four, March 2026&rdquo; travel page.
            </p>
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-content-tertiary mb-2">
            Security note
          </p>
          <p className="text-sm text-content-secondary">
            Private memory isolation is a critical security requirement. An
            agent can only access private memories belonging to its
            authenticated user. Other users&rsquo; agents in the same project
            cannot see your private data.
          </p>
        </div>
      </section>

      {/* Pages */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">
          Pages: Dual Nature
        </h2>
        <p className="text-sm text-content-secondary leading-relaxed">
          Each page in LoomKnot simultaneously exists in two modes:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <h3 className="text-sm font-semibold text-content mb-1">
              Human Mode
            </h3>
            <p className="text-sm text-content-secondary">
              Beautiful UI with maps, photos, buttons, and interactive
              elements. Optimized for reading and sharing.
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <h3 className="text-sm font-semibold text-content mb-1">
              Agent Mode
            </h3>
            <p className="text-sm text-content-secondary">
              Structured data with preferences, constraints, and metadata.
              Optimized for AI agents to read and update via MCP.
            </p>
          </div>
        </div>

        <h3 className="text-base font-semibold text-content pt-2">
          Content Blocks
        </h3>
        <p className="text-sm text-content-secondary leading-relaxed">
          Pages are composed of ordered content blocks. Each block has a type,
          content (JSONB), and sort order. Agents can create, update, and
          delete individual blocks within a page.
        </p>

        <h3 className="text-base font-semibold text-content pt-2">
          Index Page Convention
        </h3>
        <p className="text-sm text-content-secondary leading-relaxed">
          Every project has an auto-created index page (slug &ldquo;index&rdquo;).
          It is created atomically with the project, cannot be deleted, and the
          slug &ldquo;index&rdquo; is reserved. The index page serves as the
          project&rsquo;s landing page.
        </p>
      </section>

      {/* Negotiations */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">
          Preference Negotiation
        </h2>
        <p className="text-sm text-content-secondary leading-relaxed">
          When participant preferences conflict, LoomKnot doesn&rsquo;t just
          &ldquo;see&rdquo; the conflict — it provides a structured negotiation
          mechanism. This is the core technical differentiation.
        </p>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <h3 className="text-sm font-semibold text-content mb-2">
              How it works
            </h3>
            <ol className="space-y-2 text-sm text-content-secondary">
              <li className="flex gap-2">
                <span className="shrink-0 font-medium text-content">1.</span>
                A conflict is detected (e.g., one person wants a beach hotel,
                another wants city center).
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-medium text-content">2.</span>
                A negotiation is created with status &ldquo;open&rdquo;.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-medium text-content">3.</span>
                Agents propose options with reasoning (e.g., &ldquo;seaside
                hotel near transit&rdquo; as a compromise).
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-medium text-content">4.</span>
                Users vote on options. The negotiation resolves when consensus
                is reached.
              </li>
            </ol>
          </div>
        </div>

        <h3 className="text-base font-semibold text-content pt-2">
          Example: Travel Planning
        </h3>
        <CodeBlock
          code={`// Agent A proposes via MCP:
negotiations/propose {
  negotiationId: "neg_abc123",
  title: "Seaside hotel near metro",
  reasoning: "Beach access for Alice, 10 min metro to city for Bob",
  proposedValue: {
    hotel: "Hotel Marina",
    location: "Barceloneta",
    walkToBeach: "2 min",
    walkToMetro: "5 min"
  }
}`}
        />
      </section>

      {/* Bring Your Own Agent */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-content">
          Bring Your Own Agent
        </h2>
        <p className="text-sm text-content-secondary leading-relaxed">
          LoomKnot follows a &ldquo;bring your own agent&rdquo; model. Each
          user connects their preferred AI assistant (Claude, ChatGPT, Gemini,
          or any MCP-compatible client) to a shared project.
        </p>
        <p className="text-sm text-content-secondary leading-relaxed">
          New users get a built-in default agent — connecting your own is an
          upgrade, not a requirement for onboarding.
        </p>
        <p className="text-sm text-content-secondary leading-relaxed">
          Each agent operates with the permissions of its authenticated user.
          Different users can use different AI providers in the same project
          — all communicating through the shared memory layer.
        </p>
      </section>
    </div>
  );
}
