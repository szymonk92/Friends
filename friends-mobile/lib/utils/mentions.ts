/**
 * Utilities for parsing and handling @mentions in story text
 */

export interface ParsedMention {
  name: string;
  startIndex: number;
  endIndex: number;
  fullMatch: string;
}

export interface MentionContext {
  name: string;
  contextBefore?: string;
  contextAfter?: string;
}

/**
 * Extract all @mentions from text
 * Matches patterns like: @Sarah, @John, @Maria
 */
export function extractMentions(text: string): ParsedMention[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: ParsedMention[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      name: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      fullMatch: match[0],
    });
  }

  return mentions;
}

/**
 * Get unique person names from mentions
 */
export function getUniqueMentionedPeople(text: string): string[] {
  const mentions = extractMentions(text);
  const uniqueNames = new Set(mentions.map((m) => m.name));
  return Array.from(uniqueNames);
}

/**
 * Get mention with surrounding context for disambiguation
 */
export function getMentionsWithContext(text: string, contextLength: number = 50): MentionContext[] {
  const mentions = extractMentions(text);

  return mentions.map((mention) => {
    const startContext = Math.max(0, mention.startIndex - contextLength);
    const endContext = Math.min(text.length, mention.endIndex + contextLength);

    return {
      name: mention.name,
      contextBefore: text.substring(startContext, mention.startIndex).trim(),
      contextAfter: text.substring(mention.endIndex, endContext).trim(),
    };
  });
}

/**
 * Replace @mentions with formatted text for display
 */
export function highlightMentions(text: string, highlightFn: (name: string) => string): string {
  return text.replace(/@(\w+)/g, (match, name) => highlightFn(name));
}

/**
 * Check if text contains any @mentions
 */
export function hasMentions(text: string): boolean {
  return /@\w+/.test(text);
}

/**
 * Count total mentions in text
 */
export function countMentions(text: string): number {
  return extractMentions(text).length;
}

/**
 * Count unique people mentioned
 */
export function countUniqueMentions(text: string): number {
  return getUniqueMentionedPeople(text).length;
}

/**
 * Format mention text for AI extraction
 * Adds context markers to help AI understand relationships
 */
export function formatMentionsForAI(text: string): string {
  const mentions = getUniqueMentionedPeople(text);

  if (mentions.length === 0) {
    return text;
  }

  // Add a header with mentioned people
  const header = `[People mentioned: ${mentions.join(', ')}]\n\n`;
  return header + text;
}

/**
 * Validate mention format
 * Returns true if mention is valid (alphanumeric, no special chars)
 */
export function isValidMention(mention: string): boolean {
  return /^@\w+$/.test(mention);
}

/**
 * Extract mention patterns with relationship hints
 * E.g., "@Sarah (my sister)" -> { name: "Sarah", relationship: "sister" }
 */
export function extractMentionsWithRelationships(
  text: string
): Array<{ name: string; relationship?: string }> {
  // Match patterns like: @Sarah (my sister), @John (colleague), etc.
  const relationshipRegex = /@(\w+)\s*\((?:my\s+)?([^)]+)\)/gi;
  const results: Array<{ name: string; relationship?: string }> = [];
  let match;

  while ((match = relationshipRegex.exec(text)) !== null) {
    results.push({
      name: match[1],
      relationship: match[2].trim(),
    });
  }

  // Also get simple mentions
  const simpleMentions = getUniqueMentionedPeople(text);
  const mentionedInRelationships = new Set(results.map((r) => r.name));

  simpleMentions.forEach((name) => {
    if (!mentionedInRelationships.has(name)) {
      results.push({ name });
    }
  });

  return results;
}
