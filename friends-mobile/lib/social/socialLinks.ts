import { z } from 'zod';

export const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
  'linkedin',
  'threads',
  'other',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialLink = {
  platform: SocialPlatform;
  handle: string;
  url?: string;
  label?: string;
};

export const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  handle: z.string().trim().min(1).max(60),
  url: z.string().url().max(500).optional(),
  label: z.string().trim().max(40).optional(),
});

export const socialLinksSchema = z.array(socialLinkSchema).max(10);

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; icon: string; baseUrl: (handle: string) => string; hostMatch: RegExp }
> = {
  instagram: {
    label: 'Instagram',
    icon: 'instagram',
    baseUrl: (h) => `https://instagram.com/${stripAt(h)}`,
    hostMatch: /(?:^|\.)instagram\.com$/i,
  },
  facebook: {
    label: 'Facebook',
    icon: 'facebook',
    baseUrl: (h) => `https://facebook.com/${stripAt(h)}`,
    hostMatch: /(?:^|\.)facebook\.com$/i,
  },
  tiktok: {
    label: 'TikTok',
    icon: 'music-note',
    baseUrl: (h) => `https://tiktok.com/@${stripAt(h)}`,
    hostMatch: /(?:^|\.)tiktok\.com$/i,
  },
  twitter: {
    label: 'X / Twitter',
    icon: 'twitter',
    baseUrl: (h) => `https://x.com/${stripAt(h)}`,
    hostMatch: /(?:^|\.)(?:twitter|x)\.com$/i,
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'linkedin',
    baseUrl: (h) => `https://linkedin.com/in/${stripAt(h)}`,
    hostMatch: /(?:^|\.)linkedin\.com$/i,
  },
  threads: {
    label: 'Threads',
    icon: 'at',
    baseUrl: (h) => `https://threads.net/@${stripAt(h)}`,
    hostMatch: /(?:^|\.)threads\.(?:net|com)$/i,
  },
  other: {
    label: 'Other',
    icon: 'link-variant',
    baseUrl: (h) => (h.startsWith('http') ? h : `https://${h}`),
    hostMatch: /^$/,
  },
};

function stripAt(h: string): string {
  return h.replace(/^@+/, '');
}

export function platformLabel(p: SocialPlatform): string {
  return PLATFORM_META[p].label;
}

export function platformIcon(p: SocialPlatform): string {
  return PLATFORM_META[p].icon;
}

export function buildSocialUrl(link: SocialLink): string {
  if (link.url) return link.url;
  return PLATFORM_META[link.platform].baseUrl(link.handle);
}

export function detectPlatformFromUrl(input: string): SocialPlatform | null {
  try {
    const url = new URL(input.trim());
    for (const p of SOCIAL_PLATFORMS) {
      if (p === 'other') continue;
      if (PLATFORM_META[p].hostMatch.test(url.hostname)) return p;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Normalises pasted text into a {handle, url?} pair.
 * Accepts:
 *   "@agata"                                  -> { handle: "@agata" }
 *   "agata"                                   -> { handle: "@agata" }
 *   "https://instagram.com/agata"             -> { handle: "@agata", url: ... }
 *   "https://www.instagram.com/agata.test/?hl=en" -> { handle: "@agata.test", url: ... }
 *   "https://tiktok.com/@agata"               -> { handle: "@agata", url: ... }
 *   "https://linkedin.com/in/szymon-k"        -> { handle: "szymon-k", url: ... }
 */
export function parseSocialInput(
  raw: string,
  platformHint?: SocialPlatform
): { handle: string; url?: string; platform?: SocialPlatform } {
  const trimmed = raw.trim();
  if (!trimmed) return { handle: '' };

  // URL form
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const detected = detectPlatformFromUrl(trimmed) ?? platformHint;
      const segments = url.pathname.split('/').filter(Boolean);
      let candidate = segments[0] ?? '';
      // LinkedIn: /in/<handle>
      if (detected === 'linkedin' && segments[0] === 'in') candidate = segments[1] ?? '';
      // TikTok / Threads: /@<handle>
      if (candidate.startsWith('@')) candidate = candidate.slice(1);
      const handle = candidate ? `@${candidate}` : '';
      return { handle, url: stripQueryFragments(url), platform: detected ?? undefined };
    } catch {
      // fallthrough
    }
  }

  // Plain handle form
  const cleaned = trimmed.replace(/\s+/g, '');
  return { handle: cleaned.startsWith('@') ? cleaned : `@${cleaned}` };
}

function stripQueryFragments(url: URL): string {
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

export function parseSocialLinksJson(raw: string | null | undefined): SocialLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const result = socialLinksSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function serializeSocialLinks(links: SocialLink[]): string | null {
  const cleaned = links
    .map((l) => ({ ...l, handle: l.handle.trim() }))
    .filter((l) => l.handle.length > 0);
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}
