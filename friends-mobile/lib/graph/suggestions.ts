import { parseJsonArray, parseJsonObject } from '@/lib/utils/json';

export type ConnectionSuggestion = { a: string; b: string; sharedStories: number };

/**
 * People in a story. `peopleIds` is written by extraction since issue #03; older stories
 * fall back to the extraction result, where only already-known people carry real ids.
 */
export function storyPeople(story: { peopleIds: string | null; extractedData: string | null }): string[] {
  const ids = parseJsonArray<string>(story.peopleIds);
  if (ids.length) return ids;
  const data = parseJsonObject<{ people?: Array<{ id?: string; isNew?: boolean }> }>(story.extractedData, {});
  return (data.people ?? []).filter((p) => p.id && !p.isNew).map((p) => p.id!);
}

/**
 * Pairs of people mentioned together in stories who have no connection yet, most
 * shared stories first. Only people in `activeIds` are considered.
 */
export function suggestConnections(
  storyPeopleLists: string[][],
  connections: Array<{ person1Id: string; person2Id: string }>,
  activeIds: Set<string>,
  limit = 5
): ConnectionSuggestion[] {
  const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const linked = new Set(connections.map((c) => key(c.person1Id, c.person2Id)));
  const counts = new Map<string, number>();
  for (const list of storyPeopleLists) {
    const ids = [...new Set(list)].filter((id) => activeIds.has(id));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const k = key(ids[i], ids[j]);
        if (!linked.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, limit)
    .map(([k, n]) => {
      const [a, b] = k.split('|');
      return { a, b, sharedStories: n };
    });
}
