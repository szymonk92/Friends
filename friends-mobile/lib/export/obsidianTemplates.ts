import {
  type Person,
  type Connection,
  type Relation,
  type ContactEvent,
  type Story,
  type File as PersonFile,
} from '@/lib/db/schema';
import { RELATIONSHIP_TYPES, RELATION_TYPE_OPTIONS } from '@/lib/constants/relations';
import { parseSocialLinksJson, buildSocialUrl, platformLabel } from '@/lib/social/socialLinks';

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_TYPES.map((t) => [t.value, t.label])
);
const RELATION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RELATION_TYPE_OPTIONS.map((t) => [t.value, t.label])
);

const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(UNSAFE_FILENAME_CHARS, '').replace(/\s+/g, ' ').trim();
  return cleaned || 'Unnamed';
}

export function buildFilenameMap(peopleRows: Person[]): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const p of peopleRows) {
    const base = sanitizeFilename(p.name);
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base} ${n++}`;
    }
    used.add(candidate);
    map.set(p.id, candidate);
  }
  return map;
}

function toDateStr(d: Date | number | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split('T')[0];
}

function frontmatterValue(v: string | string[] | null): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  return v;
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildFrontmatter(person: Person): string {
  const fields: [string, string | string[] | null][] = [
    ['tags', parseJsonArray(person.tags)],
    ['relationshipType', person.relationshipType],
    ['importanceToUser', person.importanceToUser],
    ['gender', person.gender],
    ['status', person.status],
    ['metDate', toDateStr(person.metDate)],
    ['metLocation', person.metLocation],
    ['homeLocation', person.homeLocation],
    ['languages', parseJsonArray(person.languages)],
    ['dateOfBirth', toDateStr(person.dateOfBirth)],
  ];

  const lines = fields
    .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v != null && v !== ''))
    .map(([k, v]) => `${k}: ${frontmatterValue(v)}`);

  if (lines.length === 0) return '';
  return `---\n${lines.join('\n')}\n---\n\n`;
}

export interface PersonRelatedData {
  connections: Connection[];
  relations: Relation[];
  contactEvents: ContactEvent[];
  photos: PersonFile[];
  filenameMap: Map<string, string>;
}

function renderConnectionBullet(
  conn: Connection,
  selfId: string,
  filenameMap: Map<string, string>
): string | null {
  const otherId = conn.person1Id === selfId ? conn.person2Id : conn.person1Id;
  const otherFilename = filenameMap.get(otherId);
  if (!otherFilename) return null;

  const typeLabel = RELATIONSHIP_TYPE_LABELS[conn.relationshipType] ?? conn.relationshipType;
  const label = conn.qualifier ? `${conn.qualifier} (${typeLabel})` : typeLabel;
  return `- ${label}: [[${otherFilename}]]`;
}

function renderFactBullet(rel: Relation): string {
  const label = RELATION_TYPE_LABELS[rel.relationType] ?? rel.relationType;
  return `- ${label}: ${rel.objectLabel}`;
}

function renderGiftBullet(rel: Relation): string {
  const metadata = rel.metadata ? JSON.parse(rel.metadata) : {};
  const details: string[] = [];
  if (metadata.priority) details.push(`priority: ${metadata.priority}`);
  if (metadata.priceRange) details.push(`~${metadata.priceRange}`);
  if (metadata.occasion) details.push(`for: ${metadata.occasion}`);
  const suffix = metadata.purchased ? ' (purchased)' : '';
  const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
  return `- ${rel.objectLabel}${detailsStr}${suffix}`;
}

function renderImportantDateBullet(rel: Relation): string {
  const date = toDateStr(rel.validFrom) ?? '';
  return `- ${rel.objectLabel}: ${date}`;
}

function renderTimelineBullet(event: ContactEvent): string {
  const date = toDateStr(event.eventDate) ?? '';
  const meta = [event.eventType, event.location].filter(Boolean).join(', ');
  const notes = event.notes ? `: ${event.notes}` : '';
  return `- ${date} (${meta})${notes}`;
}

export function fileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx) : '';
}

export function renderPersonNote(person: Person, related: PersonRelatedData): string {
  const sections: string[] = [];

  sections.push(buildFrontmatter(person) + `# ${person.name}`);

  const headerLines: string[] = [];
  if (person.nickname) headerLines.push(`**Nickname:** ${person.nickname}`);
  if (person.phone) headerLines.push(`**Phone:** ${person.phone}`);
  if (person.email) headerLines.push(`**Email:** ${person.email}`);
  if (headerLines.length > 0) sections.push(headerLines.join('\n'));

  const socialLinks = parseSocialLinksJson(person.socialLinks);
  if (socialLinks.length > 0) {
    const lines = socialLinks.map((l) => `- [${platformLabel(l.platform)}](${buildSocialUrl(l)})`);
    sections.push(`## Social\n${lines.join('\n')}`);
  }

  const giftRelations = related.relations.filter((r) => r.category === 'gift_idea');
  const importantDateRelations = related.relations.filter(
    (r) => r.category === 'important_date' || r.relationType === 'HAS_IMPORTANT_DATE'
  );
  const factRelations = related.relations.filter(
    (r) => !giftRelations.includes(r) && !importantDateRelations.includes(r)
  );

  const relationLines = [
    ...related.connections
      .map((c) => renderConnectionBullet(c, person.id, related.filenameMap))
      .filter((l): l is string => l !== null),
    ...factRelations.map(renderFactBullet),
  ];
  if (relationLines.length > 0) sections.push(`## Relations\n${relationLines.join('\n')}`);

  if (giftRelations.length > 0) {
    sections.push(`## Gift Ideas\n${giftRelations.map(renderGiftBullet).join('\n')}`);
  }

  const importantDateLines: string[] = [];
  const birthday = toDateStr(person.dateOfBirth);
  if (birthday) importantDateLines.push(`- Birthday: ${birthday}`);
  importantDateLines.push(...importantDateRelations.map(renderImportantDateBullet));
  if (importantDateLines.length > 0) {
    sections.push(`## Important Dates\n${importantDateLines.join('\n')}`);
  }

  if (related.contactEvents.length > 0) {
    const sorted = [...related.contactEvents].sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    );
    sections.push(`## Timeline\n${sorted.map(renderTimelineBullet).join('\n')}`);
  }

  if (related.photos.length > 0) {
    const lines = related.photos.map((f) => `![[${f.id}${fileExtension(f.filename)}]]`);
    sections.push(`## Photos\n${lines.join('\n')}`);
  }

  if (person.notes) sections.push(`## Notes\n${person.notes}`);

  return sections.join('\n\n') + '\n';
}

export function renderStoryNote(story: Story): string {
  const title = story.title ?? toDateStr(story.storyDate) ?? 'Untitled Story';
  const lines: string[] = [`# ${title}`];
  const date = toDateStr(story.storyDate);
  if (date) lines.push(`**Date:** ${date}`);
  lines.push(story.content);
  return lines.join('\n\n') + '\n';
}

export function storyFilename(story: Story, used: Set<string>): string {
  const base = sanitizeFilename(
    story.title ?? toDateStr(story.storyDate) ?? `Story ${story.id.slice(0, 8)}`
  );
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base} ${n++}`;
  }
  used.add(candidate);
  return candidate;
}
