import i18n from 'i18next';

/**
 * Translate outside React components (formatters, constants, validation messages).
 * Uses the app-wide i18next instance; before it is initialised — unit tests — the
 * English fallback is returned, so pure helpers stay deterministic.
 */
export function tr(key: string, fallback: string, opts?: Record<string, unknown>): string {
  if (!i18n.isInitialized) return fallback;
  const translate = i18n.t as unknown as (k: string, o?: Record<string, unknown>) => string;
  return translate(key, { defaultValue: fallback, ...opts });
}

const humanize = (value: string) =>
  value
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

/** Person ↔ person relationship type ("friend", "ex-partner", …). */
export function relationshipTypeLabel(value: string, fallback?: string): string {
  return tr(`labels.relationshipType.${value}`, fallback ?? humanize(value));
}

/** Story-fact relation type ("LIKES", "STRUGGLES_WITH", …). */
export function relationTypeLabel(value: string, fallback?: string): string {
  return tr(`labels.relationType.${value.toUpperCase()}`, fallback ?? humanize(value));
}

export function intensityLabel(value: string, fallback: string): string {
  return tr(`labels.intensity.${value}`, fallback);
}

export function relationStatusLabel(value: string, fallback: string): string {
  return tr(`labels.relationStatus.${value}`, fallback);
}

export function connectionStatusLabel(value: string, fallback?: string): string {
  return tr(`labels.connectionStatus.${value}`, fallback ?? humanize(value));
}

export function importanceLabel(value: string, fallback?: string): string {
  return tr(`labels.importance.${value}`, fallback ?? humanize(value));
}

export function personTypeLabel(value: string): string {
  return tr(`labels.personType.${value}`, humanize(value));
}

/** Label for a value that may be a relation type (LIKES) or a relationship type (friend). */
export function anyRelationLabel(value: string): string {
  const keys = [
    `labels.relationType.${value.toUpperCase()}`,
    `labels.relationshipType.${value.toLowerCase()}`,
  ];
  if (i18n.isInitialized) {
    const hit = keys.find((k) => i18n.exists(k));
    if (hit) return tr(hit, humanize(value));
  }
  return humanize(value);
}
