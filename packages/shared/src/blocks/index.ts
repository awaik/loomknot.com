import { z } from 'zod';
import { BLOCK_TYPES, BLOCK_TYPE_VALUES } from '../constants/index.js';
import type { BlockType } from '../constants/index.js';

export { BLOCK_TYPES, BLOCK_TYPE_VALUES, type BlockType };

/** Description of known block types for agent-facing schemas */
export const KNOWN_TYPES_DESCRIPTION = `Known types: ${BLOCK_TYPE_VALUES.join(', ')}. Unknown types accepted with warnings.`;

// --- Per-type content schemas (all use .passthrough() for forward compatibility) ---

const coordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
}).passthrough();

export const textContentSchema = z.object({
  text: z.string(),
}).passthrough();

export const headingContentSchema = z.object({
  text: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional(),
}).passthrough();

export const imageContentSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional(),
  caption: z.string().optional(),
}).passthrough();

export const mapContentSchema = z.object({
  center: coordinatesSchema,
  zoom: z.number().optional(),
  markers: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

export const listContentSchema = z.object({
  items: z.array(z.union([
    z.string(),
    z.object({ text: z.string() }).passthrough(),
  ])),
}).passthrough();

export const itineraryContentSchema = z.object({
  items: z.array(z.object({
    title: z.string(),
  }).passthrough()),
  date: z.string().optional(),
  dayNumber: z.number().optional(),
}).passthrough();

export const placeContentSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
}).passthrough();

export const budgetContentSchema = z.object({
  items: z.array(z.object({
    category: z.string(),
  }).passthrough()),
  currency: z.string().optional(),
}).passthrough();

export const galleryContentSchema = z.object({
  images: z.array(z.object({
    url: z.string().min(1),
  }).passthrough()),
}).passthrough();

// --- Schema registry ---

export const BLOCK_CONTENT_SCHEMAS: Record<BlockType, z.ZodTypeAny> = {
  [BLOCK_TYPES.text]: textContentSchema,
  [BLOCK_TYPES.heading]: headingContentSchema,
  [BLOCK_TYPES.image]: imageContentSchema,
  [BLOCK_TYPES.map]: mapContentSchema,
  [BLOCK_TYPES.list]: listContentSchema,
  [BLOCK_TYPES.itinerary]: itineraryContentSchema,
  [BLOCK_TYPES.place]: placeContentSchema,
  [BLOCK_TYPES.budget]: budgetContentSchema,
  [BLOCK_TYPES.gallery]: galleryContentSchema,
};

// --- Validation ---

export function validateBlockContent(type: string, content: unknown): { warnings: string[] } {
  const warnings: string[] = [];

  const schema = BLOCK_CONTENT_SCHEMAS[type as BlockType];

  if (!schema) {
    warnings.push(
      `Unknown block type "${type}". Known types: ${BLOCK_TYPE_VALUES.join(', ')}. ` +
      `Unknown types are accepted but may not render correctly in the UI.`,
    );
    return { warnings };
  }

  const result = schema.safeParse(content);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? ` at "${issue.path.join('.')}"` : '';
      warnings.push(`Block type "${type}"${path}: ${issue.message}`);
    }
  }

  return { warnings };
}
