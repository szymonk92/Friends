import { useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Text, Checkbox, Dialog, Portal, Button, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePeople } from '@/hooks/usePeople';
import {
  requestContactsPermission,
  loadContacts,
  matchContacts,
  useImportContacts,
  type ContactRow,
  type ImportDecision,
  type MatchInfo,
} from '@/hooks/useContactsImport';
import { fz, fzText } from '@/lib/design/tokens';
import { IconCircle } from '@/components/IconCircle';

type Phase = 'loading' | 'ready' | 'denied' | 'empty';

export default function ImportContactsScreen() {
  const insets = useSafeAreaInsets();
  const { data: people = [] } = usePeople({ type: 'all' });
  const importMutation = useImportContacts();

  const [phase, setPhase] = useState<Phase>('loading');
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [review, setReview] = useState<{
    queue: ContactRow[];
    index: number;
    decisions: ImportDecision[];
  } | null>(null);

  const matches = useMemo(
    () => (rows.length ? matchContacts(rows, people) : {}),
    // people ref changes each query return; fine to recompute
    [rows, people]
  );

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setPhase('loading');
    try {
      const ok = await requestContactsPermission();
      if (!ok) {
        setPhase('denied');
        return;
      }
      const contacts = await loadContacts();
      if (contacts.length === 0) {
        setPhase('empty');
        return;
      }
      setRows(contacts);
      setPhase('ready');
    } catch (e) {
      Alert.alert('Could not load contacts', (e as Error).message);
      setPhase('denied');
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.phone ?? '').includes(q)
    );
  }, [rows, search]);

  const selectableCount = useMemo(
    () => filtered.filter((r) => matches[r.id]?.kind !== 'exact').length,
    [filtered, matches]
  );
  const allSelected = selectableCount > 0 && selected.size >= selectableCount;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(
        new Set(filtered.filter((r) => matches[r.id]?.kind !== 'exact').map((r) => r.id))
      );
    }
  }

  function startImport() {
    const selectedRows = rows.filter((r) => selected.has(r.id));
    const decisions: ImportDecision[] = [];
    const fuzzyQueue: ContactRow[] = [];
    for (const r of selectedRows) {
      const m = matches[r.id];
      if (m?.kind === 'fuzzy' && m.candidate) {
        fuzzyQueue.push(r);
      } else if (m?.kind !== 'exact') {
        decisions.push({ contact: r, action: 'create' });
      }
    }
    if (fuzzyQueue.length === 0) {
      void doImport(decisions);
    } else {
      setReview({ queue: fuzzyQueue, index: 0, decisions });
    }
  }

  function onReviewDecision(action: 'skip' | 'create' | 'update') {
    if (!review) return;
    const cur = review.queue[review.index];
    const m = matches[cur.id];
    const decision: ImportDecision =
      action === 'skip'
        ? { contact: cur, action: 'skip' }
        : action === 'update'
          ? { contact: cur, action: 'update', candidateId: m?.candidate?.id }
          : { contact: cur, action: 'create' };
    const decisions = [...review.decisions, decision];
    const index = review.index + 1;
    if (index >= review.queue.length) {
      setReview(null);
      void doImport(decisions);
    } else {
      setReview({ ...review, index, decisions });
    }
  }

  function doImport(decisions: ImportDecision[]) {
    importMutation.mutate(decisions, {
      onSuccess: (result) => {
        const parts = [
          `${result.imported} added`,
          `${result.updated} updated`,
          `${result.skipped} skipped`,
        ];
        if (result.errors.length) parts.push(`${result.errors.length} errors`);
        Alert.alert('Import complete', parts.join(' · '));
        router.back();
      },
      onError: (e) => Alert.alert('Import failed', e.message),
    });
  }

  const importing = importMutation.isPending;

  if (phase === 'loading') {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={{ ...fzText.sub, marginTop: 12 }}>Loading contacts…</Text>
      </View>
    );
  }

  if (phase === 'denied') {
    return (
      <View style={s.centered}>
        <Text style={fzText.title}>Contacts access needed</Text>
        <Text style={[fzText.sub, { marginTop: 8, marginBottom: 24, textAlign: 'center' }]}>
          Grant contacts permission in system settings to import people from your address book.
        </Text>
        <Button mode="contained" onPress={() => void init()}>
          Try again
        </Button>
      </View>
    );
  }

  if (phase === 'empty') {
    return (
      <View style={s.centered}>
        <Text style={fzText.title}>No contacts found</Text>
        <Text style={[fzText.sub, { marginTop: 8, marginBottom: 24, textAlign: 'center' }]}>
          Your address book is empty.
        </Text>
        <Button mode="outlined" onPress={() => router.back()}>
          Back
        </Button>
      </View>
    );
  }

  const reviewContact = review ? review.queue[review.index] : null;
  const reviewMatch = reviewContact ? matches[reviewContact.id] : null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      {/* App bar */}
      <View style={[s.appBar, { paddingTop: insets.top + 8 }]}>
        <View style={s.appBarRow}>
          <IconCircle icon="back" onPress={() => router.back()} />
          <View style={s.titleWrap}>
            <Text style={fzText.screenTitle}>Import contacts</Text>
            <Text style={fzText.meta}>
              {selected.size} selected · {rows.length} total
            </Text>
          </View>
          <TouchableOpacity onPress={toggleAll} disabled={selectableCount === 0}>
            <Text style={fzText.chipSolid}>{allSelected ? 'Clear' : 'Select all'}</Text>
          </TouchableOpacity>
        </View>

        {/* search */}
        <View style={[s.searchRow, { paddingBottom: fz.s.md }]}>
          <View style={s.searchInput}>
            <TextInput
              placeholder="Search contacts"
              placeholderTextColor={fz.textMute}
              value={search}
              onChangeText={setSearch}
              style={s.searchText}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const m = matches[item.id];
          const isExact = m?.kind === 'exact';
          const isFuzzy = m?.kind === 'fuzzy';
          const checked = selected.has(item.id);
          return (
            <TouchableOpacity
              style={s.row}
              onPress={() => !isExact && toggle(item.id)}
              disabled={isExact}
              activeOpacity={0.7}
            >
              <Checkbox
                status={checked ? 'checked' : 'unchecked'}
                disabled={isExact}
                color={fz.ink}
              />
              <View style={s.rowBody}>
                <Text style={fzText.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={fzText.sub} numberOfLines={1}>
                  {item.phone || item.email || 'No phone or email'}
                </Text>
                {isFuzzy && m?.candidate && (
                  <Text style={s.dupText} numberOfLines={1}>
                    Possible match: {m.candidate.name}
                  </Text>
                )}
                {isExact && m?.candidate && (
                  <Text style={s.existsText} numberOfLines={1}>
                    Already added: {m.candidate.name}
                  </Text>
                )}
              </View>
              {isFuzzy && <Chip label="Review" />}
              {isExact && <Chip label="Added" muted />}
            </TouchableOpacity>
          );
        }}
      />

      {/* Import FAB */}
      <TouchableOpacity
        style={[s.fab, { bottom: 24 + insets.bottom }]}
        onPress={startImport}
        disabled={selected.size === 0 || importing}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>
          {importing ? 'Importing…' : `Import ${selected.size || ''}`.trim()}
        </Text>
      </TouchableOpacity>

      {/* Fuzzy review dialog */}
      <Portal>
        <Dialog
          visible={review !== null}
          onDismiss={() => {
            if (!review) return;
            const decisions = review.decisions;
            setReview(null);
            void doImport(decisions);
          }}
        >
          <Dialog.Title>Possible duplicate</Dialog.Title>
          <Dialog.Content>
            <Text style={fzText.body}>
              Contact “{reviewContact?.name}”
              {reviewContact?.phone ? ` (${reviewContact.phone})` : ''}
            </Text>
            <Text style={[fzText.body, { marginTop: 8 }]}>
              looks like your existing person “{reviewMatch?.candidate?.name}”. Same person?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => onReviewDecision('skip')}>Skip</Button>
            <Button onPress={() => onReviewDecision('create')}>Add as new</Button>
            <Button onPress={() => onReviewDecision('update')}>Update existing</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <View style={[s.chip, muted && s.chipMuted]}>
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: fz.paper,
  },
  appBar: { backgroundColor: fz.paper },
  appBarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: fz.s.edge, paddingBottom: fz.s.sm,
  },
  titleWrap: { flex: 1 },
  searchRow: { paddingHorizontal: fz.s.edge, paddingTop: fz.s.xs },
  searchInput: {
    height: 42, borderRadius: fz.rPill, backgroundColor: fz.surface,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchText: { fontFamily: fz.font, fontSize: 15, color: fz.ink, padding: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: fz.s.edge,
  },
  rowBody: { flex: 1, minWidth: 0 },
  dupText: {
    fontFamily: fz.font, fontSize: 12, color: '#C77700', marginTop: 2,
  },
  existsText: {
    fontFamily: fz.font, fontSize: 12, color: fz.textMute, marginTop: 2,
  },
  chip: {
    backgroundColor: '#FFF3E0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  chipMuted: { backgroundColor: fz.surface },
  chipText: {
    fontFamily: fz.font, fontWeight: '500', fontSize: 11, color: '#C77700',
  },
  fab: {
    position: 'absolute', right: fz.s.edge, left: fz.s.edge, height: 50,
    borderRadius: fz.rButton, backgroundColor: fz.ink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: fz.ink, shadowOpacity: 0.32, shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  fabText: { color: '#fff', fontFamily: fz.font, fontWeight: '600', fontSize: 15 },
});