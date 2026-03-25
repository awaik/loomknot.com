import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  negotiations,
  negotiationOptions,
  negotiationVotes,
  activityLog,
  createId,
} from '@loomknot/shared/db';
import { db } from '@/services/db.js';
import { toolResult, toolError, classifyError } from '@/utils/errors.js';
import { requireProjectMembership } from '@/utils/permissions.js';

export function registerNegotiationTools(
  server: McpServer,
  userId: string,
  apiKeyId: string,
): void {
  // --- negotiations/list ---
  server.tool(
    'lk_negotiations_list',
    'Loomknot: list preference negotiations in a collaborative project. Used when members have conflicting preferences that need resolution.',
    {
      projectId: z.string().describe('Project ID'),
      status: z.enum(['open', 'resolved', 'dismissed']).optional().describe('Filter by status'),
    },
    async ({ projectId, status }) => {
      try {
        await requireProjectMembership(userId, projectId);

        const conditions = [eq(negotiations.projectId, projectId)];
        if (status) {
          conditions.push(eq(negotiations.status, status));
        }

        const rows = await db
          .select()
          .from(negotiations)
          .where(and(...conditions))
          .orderBy(desc(negotiations.createdAt))
          .limit(100);

        return toolResult({ negotiations: rows });
      } catch (err) {
        return classifyError(err, 'lk_negotiations_list');
      }
    },
  );

  // --- negotiations/get ---
  server.tool(
    'lk_negotiations_get',
    'Loomknot: get a negotiation with all proposed options and votes from participants.',
    {
      negotiationId: z.string().describe('Negotiation ID'),
    },
    async ({ negotiationId }) => {
      try {
        const negRows = await db
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, negotiationId))
          .limit(1);

        if (negRows.length === 0) {
          return toolError('NOT_FOUND', 'Negotiation not found');
        }

        const negotiation = negRows[0];
        await requireProjectMembership(userId, negotiation.projectId);

        // Get options
        const options = await db
          .select()
          .from(negotiationOptions)
          .where(eq(negotiationOptions.negotiationId, negotiationId))
          .orderBy(negotiationOptions.sortOrder);

        // Get votes for all options
        const optionIds = options.map((o) => o.id);
        let votes: typeof negotiationVotes.$inferSelect[] = [];
        if (optionIds.length > 0) {
          votes = await db
            .select()
            .from(negotiationVotes)
            .where(inArray(negotiationVotes.optionId, optionIds));
        }

        // Group votes by option
        const votesByOption = new Map<string, typeof votes>();
        for (const vote of votes) {
          const list = votesByOption.get(vote.optionId) ?? [];
          list.push(vote);
          votesByOption.set(vote.optionId, list);
        }

        const optionsWithVotes = options.map((option) => ({
          ...option,
          votes: votesByOption.get(option.id) ?? [],
        }));

        return toolResult({ ...negotiation, options: optionsWithVotes });
      } catch (err) {
        return classifyError(err, 'lk_negotiations_get');
      }
    },
  );

  // --- negotiations/propose ---
  server.tool(
    'lk_negotiations_propose',
    'Loomknot: propose a compromise option for an open negotiation with reasoning.',
    {
      negotiationId: z.string().describe('Negotiation ID'),
      title: z.string().min(1).max(500).describe('Option title'),
      description: z.string().max(2000).optional().describe('Option description'),
      proposedValue: z.unknown().describe('Proposed value (JSON)'),
      reasoning: z.string().max(5000).optional().describe('Reasoning for this proposal'),
    },
    async ({ negotiationId, title, description, proposedValue, reasoning }) => {
      try {
        // Verify negotiation exists and is open
        const negRows = await db
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, negotiationId))
          .limit(1);

        if (negRows.length === 0) {
          return toolError('NOT_FOUND', 'Negotiation not found');
        }

        const negotiation = negRows[0];
        if (negotiation.status !== 'open') {
          return toolError('VALIDATION', 'Negotiation is not open for proposals');
        }

        await requireProjectMembership(userId, negotiation.projectId);

        // Get current max sort order
        const existingOptions = await db
          .select({ sortOrder: negotiationOptions.sortOrder })
          .from(negotiationOptions)
          .where(eq(negotiationOptions.negotiationId, negotiationId))
          .orderBy(desc(negotiationOptions.sortOrder))
          .limit(1);

        const nextSortOrder = existingOptions.length > 0 ? existingOptions[0].sortOrder + 1 : 0;

        const optionId = createId();
        const [option] = await db
          .insert(negotiationOptions)
          .values({
            id: optionId,
            negotiationId,
            title,
            description: description ?? null,
            proposedValue,
            reasoning: reasoning ?? null,
            source: 'agent',
            apiKeyId,
            sortOrder: nextSortOrder,
          })
          .returning();

        // Log activity (fire-and-forget)
        db.insert(activityLog)
          .values({
            projectId: negotiation.projectId,
            userId,
            apiKeyId,
            action: 'negotiation.create',
            targetType: 'negotiation_option',
            targetId: optionId,
            metadata: { negotiationId, title },
          })
          .catch(() => {});

        return toolResult(option);
      } catch (err) {
        return classifyError(err, 'lk_negotiations_propose');
      }
    },
  );
}
