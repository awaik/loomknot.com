// Memory levels
export const MEMORY_LEVELS = ['private', 'project', 'public'] as const;

// API key prefix
export const API_KEY_PREFIX = 'lk_';

// Verticals (launch with travel, expand later)
export const VERTICALS = {
  travel: 'travel',
  wedding: 'wedding',
  renovation: 'renovation',
  education: 'education',
  events: 'events',
} as const;

// RBAC roles
export const ROLES = {
  owner: 'owner',
  admin: 'admin',
  editor: 'editor',
  member: 'member',
  viewer: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role permissions
export const ROLE_PERMISSIONS: Record<Role, {
  canManageProject: boolean;
  canManageMembers: boolean;
  canEditMemory: boolean;
  canConnectAgent: boolean;
  canView: boolean;
}> = {
  owner:  { canManageProject: true,  canManageMembers: true,  canEditMemory: true,  canConnectAgent: true,  canView: true },
  admin:  { canManageProject: true,  canManageMembers: true,  canEditMemory: true,  canConnectAgent: true,  canView: true },
  editor: { canManageProject: false, canManageMembers: false, canEditMemory: true,  canConnectAgent: true,  canView: true },
  member: { canManageProject: false, canManageMembers: false, canEditMemory: false, canConnectAgent: true,  canView: true },
  viewer: { canManageProject: false, canManageMembers: false, canEditMemory: false, canConnectAgent: false, canView: true },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.owner;

// Block types (typed catalog for page content blocks)
export const BLOCK_TYPES = {
  text: 'text',
  heading: 'heading',
  image: 'image',
  map: 'map',
  list: 'list',
  itinerary: 'itinerary',
  place: 'place',
  budget: 'budget',
  gallery: 'gallery',
} as const;

export type BlockType = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES];
export const BLOCK_TYPE_VALUES = Object.values(BLOCK_TYPES);

// System pages
export const INDEX_PAGE_SLUG = 'index';
export const INDEX_PAGE_SORT_ORDER = -1000;

// Invite constants
export const INVITE_STATUSES = {
  pending: 'pending',
  accepted: 'accepted',
  expired: 'expired',
} as const;
export type InviteStatus = (typeof INVITE_STATUSES)[keyof typeof INVITE_STATUSES];

export const INVITE_RESEND_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Memory limits
export const MAX_PRIVATE_MEMORIES = 500;
export const MAX_PROJECT_MEMORIES = 2000;

// Email
export const EMAIL_FROM = 'Loomknot <noreply@loomknot.com>';

// MCP
export const MCP_PROTOCOL_VERSION = '2025-03-26';

/**
 * Cyrillic → Latin transliteration map (covers Russian/Ukrainian).
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya', є: 'ye', і: 'i', ї: 'yi', ґ: 'g',
};

/**
 * Generate a URL-friendly slug from a string.
 * Transliterates Cyrillic, lowercases, replaces non-alphanumeric chars with dashes.
 */
export function slugify(text: string, maxLength = 100): string {
  const transliterated = text
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join('');

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength) || 'untitled';
}
