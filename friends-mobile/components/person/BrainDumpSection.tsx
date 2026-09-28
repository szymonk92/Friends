import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Banner,
  Button,
  Card,
  Checkbox,
  Chip,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings, type AIModel } from '@/store/useSettings';
import { extractPersonBrainDump, type BrainDumpResult, type BrainDumpAttribute } from '@/lib/ai/brain-dump';
import {
  diffBrainDump,
  type BrainDumpDiff,
  type DiffClass,
  type ExistingPersonState,
  type FieldDiff,
} from '@/lib/ai/brain-dump-diff';
import type { SocialLink } from '@/lib/social/socialLinks';

const CONSENT_KEY = 'brainDump.consentSeen.v1';

// Dev-only model list for quick switching during testing
const DEV_MODELS: Array<{ key: AIModel; label: string }> = [
  { key: 'gemini-2.5-flash-lite', label: '2.5 Lite' },
  { key: 'gemini-3.1-flash-lite', label: '3.1 Lite' },
  { key: 'gemini', label: '2.0 Lite' },
  { key: 'gemini-1.5-flash', label: '1.5 Flash' },
  { key: 'anthropic', label: 'Claude' },
];

export type AppliedBrainDump = {
  metLocation?: string;
  metDate?: string;
  homeLocation?: string;
  phone?: string;
  email?: string;
  partnerName?: string;
  /** Existing partner connection to end (status='ended') when partnerName replaces it. */
  endsPartnerConnectionId?: string;
  socialHandles: SocialLink[];
  languages: string[];
  attributes: BrainDumpAttribute[];
  /** Existing relation IDs to archive (status='past', valid_to=now) on Apply. */
  archiveRelationIds: string[];
  rawText: string;
  summary?: string;
};

type Props = {
  personName: string;
  /** Optional snapshot of current person state. When provided, chips show NEW/UPDATE/MATCH/CONFLICT. */
  existing?: ExistingPersonState;
  /** Called with the user's selected subset when they tap Apply. */
  onApply: (applied: AppliedBrainDump) => void;
};

type FieldChipState = { value: string; accepted: boolean; diff?: DiffClass; existing?: string };
type ListChipState<T> = { value: T; accepted: boolean; diff?: DiffClass; existing?: T };

export default function BrainDumpSection({ personName, existing, onApply }: Props) {
  const theme = useTheme();
  const { selectedModel, apiKey: anthropicKey, geminiApiKey } = useSettings();
  const [brainDump, setBrainDump] = useState('');
  const [devModel, setDevModel] = useState<AIModel>(selectedModel);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<BrainDumpResult | null>(null);
  const [diff, setDiff] = useState<BrainDumpDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  // Per-chip accept state (initialised from extraction confidence)
  const [metLocationChip, setMetLocationChip] = useState<FieldChipState | null>(null);
  const [metDateChip, setMetDateChip] = useState<FieldChipState | null>(null);
  const [homeLocationChip, setHomeLocationChip] = useState<FieldChipState | null>(null);
  const [phoneChip, setPhoneChip] = useState<FieldChipState | null>(null);
  const [emailChip, setEmailChip] = useState<FieldChipState | null>(null);
  const [partnerChip, setPartnerChip] = useState<FieldChipState | null>(null);
  const [socialChips, setSocialChips] = useState<ListChipState<SocialLink>[]>([]);
  const [languageChips, setLanguageChips] = useState<ListChipState<string>[]>([]);
  const [attributeChips, setAttributeChips] = useState<ListChipState<BrainDumpAttribute>[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((seen) => setShowConsent(!seen));
  }, []);

  const dismissConsent = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, '1');
    setShowConsent(false);
  };

  const extract = async () => {
    if (!brainDump.trim()) return;
    const activeModel = __DEV__ ? devModel : selectedModel;
    const activeApiKey = (activeModel === 'anthropic' ? anthropicKey : geminiApiKey) ?? '';
    if (!activeApiKey.trim()) {
      Alert.alert(
        'AI key needed',
        `Add ${activeModel === 'anthropic' ? 'an Anthropic' : 'a Gemini'} API key in Settings to use brain-dump extraction.`
      );
      return;
    }
    setExtracting(true);
    setError(null);
    try {
      const r = await extractPersonBrainDump(
        { model: activeModel, apiKey: activeApiKey },
        brainDump,
        personName
      );
      setResult(r);
      const d = diffBrainDump(r, existing ?? {});
      setDiff(d);
      hydrateChips(r, d);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const raw = (e as any)?.originalError?.message;
      setError(__DEV__ && raw ? `${msg}\n\nRaw: ${raw}` : msg);
    } finally {
      setExtracting(false);
    }
  };

  /** Default acceptance: NEW = on, UPDATE/CONFLICT = off (user must opt in to overwrite), MATCH = irrelevant (chip is hidden anyway). */
  const defaultAccept = (cls?: DiffClass): boolean => cls === 'NEW' || cls === undefined;

  const hydrateChips = (r: BrainDumpResult, d: BrainDumpDiff) => {
    const fieldChip = (
      value: string | undefined,
      fd: FieldDiff<string> | undefined,
      piiOffByDefault = false
    ): FieldChipState | null => {
      if (!value) return null;
      if (fd?.class === 'MATCH') return null; // skip — already on file
      const accepted = piiOffByDefault ? false : defaultAccept(fd?.class);
      return { value, accepted, diff: fd?.class, existing: fd?.existing };
    };

    setMetLocationChip(fieldChip(r.metLocation, d.metLocation));
    setMetDateChip(fieldChip(r.metDate, d.metDate));
    setHomeLocationChip(fieldChip(r.homeLocation, d.homeLocation));
    setPhoneChip(fieldChip(r.phone, d.phone, true));
    setEmailChip(fieldChip(r.email, d.email, true));
    setPartnerChip(fieldChip(r.partnerName, d.partner));

    setSocialChips(
      r.socialHandles
        .map((s, i) => {
          const sd = d.socials[i];
          if (sd?.class === 'MATCH') return null;
          return {
            value: s,
            accepted: defaultAccept(sd?.class),
            diff: sd?.class,
            existing: sd?.existing,
          } as ListChipState<SocialLink>;
        })
        .filter((x): x is ListChipState<SocialLink> => x !== null)
    );

    setLanguageChips(
      r.languages
        .map((l, i) => {
          const ld = d.languages[i];
          if (ld?.class === 'MATCH') return null;
          return { value: l, accepted: defaultAccept(ld?.class), diff: ld?.class } as ListChipState<string>;
        })
        .filter((x): x is ListChipState<string> => x !== null)
    );

    setAttributeChips(
      r.attributes
        .map((a, i) => {
          const ad = d.attributes[i];
          if (ad?.class === 'MATCH') return null;
          // Confidence still gates NEW chips (low-confidence ones pre-unchecked); UPDATE/CONFLICT also off.
          const accepted =
            ad?.class === 'NEW' || ad?.class === undefined
              ? a.confidence >= 0.7
              : false;
          return {
            value: a,
            accepted,
            diff: ad?.class,
          } as ListChipState<BrainDumpAttribute>;
        })
        .filter((x): x is ListChipState<BrainDumpAttribute> => x !== null)
    );
  };

  const apply = () => {
    if (!result) return;

    // Collect the IDs of existing relations whose UPDATE chip was accepted →
    // these get archived (status='past') instead of duplicated.
    const archiveRelationIds: string[] = [];
    if (diff) {
      attributeChips.forEach((c, i) => {
        const ad = diff.attributes[i];
        if (c.accepted && ad?.class === 'UPDATE' && ad.existingRelation?.id) {
          archiveRelationIds.push(ad.existingRelation.id);
        }
      });
    }
    const endsPartnerConnectionId =
      partnerChip?.accepted && partnerChip.diff === 'UPDATE'
        ? existing?.activePartner?.id
        : undefined;

    const applied: AppliedBrainDump = {
      metLocation: metLocationChip?.accepted ? metLocationChip.value : undefined,
      metDate: metDateChip?.accepted ? metDateChip.value : undefined,
      homeLocation: homeLocationChip?.accepted ? homeLocationChip.value : undefined,
      phone: phoneChip?.accepted ? phoneChip.value : undefined,
      email: emailChip?.accepted ? emailChip.value : undefined,
      partnerName: partnerChip?.accepted ? partnerChip.value : undefined,
      endsPartnerConnectionId,
      socialHandles: socialChips.filter((s) => s.accepted).map((s) => s.value),
      languages: languageChips.filter((l) => l.accepted).map((l) => l.value),
      attributes: attributeChips.filter((a) => a.accepted).map((a) => a.value),
      archiveRelationIds,
      rawText: brainDump.trim(),
      summary: result.notesSummary,
    };
    onApply(applied);
    // Clear UI so the section feels reset
    setBrainDump('');
    setResult(null);
    setDiff(null);
    setMetLocationChip(null);
    setMetDateChip(null);
    setHomeLocationChip(null);
    setPhoneChip(null);
    setEmailChip(null);
    setPartnerChip(null);
    setSocialChips([]);
    setLanguageChips([]);
    setAttributeChips([]);
  };

  const hasChips =
    metLocationChip ||
    metDateChip ||
    homeLocationChip ||
    phoneChip ||
    emailChip ||
    partnerChip ||
    socialChips.length ||
    languageChips.length ||
    attributeChips.length;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleSmall">Quick brain-dump (optional)</Text>
        <Text
          variant="bodySmall"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
        >
          Type everything you remember. Tap Extract — review, accept the bits you want, ignore the rest.
        </Text>

        {showConsent && (
          <Banner visible icon="information" style={styles.banner}>
            Your text is sent to {selectedModel === 'anthropic' ? 'Anthropic' : 'Google Gemini'} using
            your API key. Friends doesn't keep a copy on any server.{'  '}
            <Text style={styles.consentDismiss} onPress={dismissConsent}>
              Got it
            </Text>
          </Banner>
        )}

        <TextInput
          mode="outlined"
          placeholder='e.g. "Met Agata + Tom in Chile during W-trek. Couple from UK, met in Vietnam. Agata studied in London, parents are doctors, dad has a campervan. IG @agata.x"'
          value={brainDump}
          onChangeText={setBrainDump}
          multiline
          numberOfLines={5}
          style={styles.textarea}
          maxLength={4000}
        />

        {__DEV__ && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.devModelRow}>
            {DEV_MODELS.map((m) => (
              <Chip
                key={m.key}
                selected={devModel === m.key}
                onPress={() => setDevModel(m.key)}
                compact
                style={styles.devModelChip}
              >
                {m.label}
              </Chip>
            ))}
          </ScrollView>
        )}

        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            icon="auto-fix"
            onPress={extract}
            loading={extracting}
            disabled={extracting || !brainDump.trim()}
          >
            Extract
          </Button>
          {brainDump && !extracting && (
            <Button mode="text" onPress={() => setBrainDump('')}>
              Clear
            </Button>
          )}
        </View>

        {error && (
          <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}



        {result && (
          <View style={styles.results}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Found {countAccepted({
                metLocationChip,
                metDateChip,
                homeLocationChip,
                phoneChip,
                emailChip,
                partnerChip,
                socialChips,
                languageChips,
                attributeChips,
              })}{' '}
              of {countTotal(result)} facts
              {diff && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {'  '}· {diff.summary.new} new · {diff.summary.update} update
                  {diff.summary.conflict > 0 ? ` · ${diff.summary.conflict} conflict` : ''}
                  {diff.summary.match > 0 ? ` · ${diff.summary.match} already on file` : ''}
                </Text>
              )}
            </Text>

            {result.mentionedOthers.length > 0 && (
              <Banner visible icon="account-multiple" style={styles.banner}>
                Other people mentioned: {result.mentionedOthers.join(', ')}. Their facts were
                NOT attributed to {personName}.
              </Banner>
            )}

            <FieldRow
              icon="map-marker"
              label="Met in"
              chip={metLocationChip}
              onToggle={() =>
                metLocationChip &&
                setMetLocationChip({ ...metLocationChip, accepted: !metLocationChip.accepted })
              }
              onEdit={(v) => setMetLocationChip(metLocationChip ? { ...metLocationChip, value: v } : null)}
            />
            <FieldRow
              icon="calendar"
              label="Met"
              chip={metDateChip}
              onToggle={() =>
                metDateChip &&
                setMetDateChip({ ...metDateChip, accepted: !metDateChip.accepted })
              }
              onEdit={(v) => setMetDateChip(metDateChip ? { ...metDateChip, value: v } : null)}
            />
            <FieldRow
              icon="home"
              label="Lives in"
              chip={homeLocationChip}
              onToggle={() =>
                homeLocationChip &&
                setHomeLocationChip({ ...homeLocationChip, accepted: !homeLocationChip.accepted })
              }
              onEdit={(v) =>
                setHomeLocationChip(homeLocationChip ? { ...homeLocationChip, value: v } : null)
              }
            />
            <FieldRow
              icon="heart"
              label="Partner"
              chip={partnerChip}
              note={partnerChip ? 'Will create a placeholder person + connection' : undefined}
              onToggle={() =>
                partnerChip && setPartnerChip({ ...partnerChip, accepted: !partnerChip.accepted })
              }
              onEdit={(v) => setPartnerChip(partnerChip ? { ...partnerChip, value: v } : null)}
            />
            <FieldRow
              icon="phone"
              label="Phone"
              chip={phoneChip}
              note="PII — off by default. Tap to keep."
              onToggle={() =>
                phoneChip && setPhoneChip({ ...phoneChip, accepted: !phoneChip.accepted })
              }
              onEdit={(v) => setPhoneChip(phoneChip ? { ...phoneChip, value: v } : null)}
            />
            <FieldRow
              icon="email"
              label="Email"
              chip={emailChip}
              note="PII — off by default. Tap to keep."
              onToggle={() =>
                emailChip && setEmailChip({ ...emailChip, accepted: !emailChip.accepted })
              }
              onEdit={(v) => setEmailChip(emailChip ? { ...emailChip, value: v } : null)}
            />

            {socialChips.length > 0 && (
              <View style={styles.group}>
                <Text variant="labelSmall" style={styles.groupLabel}>
                  Social
                </Text>
                <View style={styles.chipsRow}>
                  {socialChips.map((c, i) => (
                    <Chip
                      key={`${c.value.platform}-${i}`}
                      icon="check"
                      selected={c.accepted}
                      showSelectedOverlay
                      onPress={() => {
                        const next = [...socialChips];
                        next[i] = { ...c, accepted: !c.accepted };
                        setSocialChips(next);
                      }}
                      style={styles.chip}
                    >
                      {c.value.platform}: {c.value.handle}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {languageChips.length > 0 && (
              <View style={styles.group}>
                <Text variant="labelSmall" style={styles.groupLabel}>
                  Languages
                </Text>
                <View style={styles.chipsRow}>
                  {languageChips.map((c, i) => (
                    <Chip
                      key={c.value + i}
                      icon="translate"
                      selected={c.accepted}
                      showSelectedOverlay
                      onPress={() => {
                        const next = [...languageChips];
                        next[i] = { ...c, accepted: !c.accepted };
                        setLanguageChips(next);
                      }}
                      style={styles.chip}
                    >
                      {c.value}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {attributeChips.length > 0 && (
              <View style={styles.group}>
                <Text variant="labelSmall" style={styles.groupLabel}>
                  Attributes
                </Text>
                {attributeChips.map((c, i) => (
                  <View key={i} style={styles.attrRow}>
                    <Checkbox
                      status={c.accepted ? 'checked' : 'unchecked'}
                      onPress={() => {
                        const next = [...attributeChips];
                        next[i] = { ...c, accepted: !c.accepted };
                        setAttributeChips(next);
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.fieldHeader}>
                        <Text variant="bodyMedium">
                          {assertionPrefix(c.value.assertion)}
                          {c.value.objectLabel}
                        </Text>
                        {c.value.assertion !== 'asserted' && (
                          <Text
                            variant="labelSmall"
                            style={[
                              styles.diffBadge,
                              {
                                color: theme.colors.onSurfaceVariant,
                                borderColor: theme.colors.onSurfaceVariant,
                              },
                            ]}
                          >
                            {c.value.assertion}
                          </Text>
                        )}
                      </View>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {c.value.relationType.toLowerCase().replace('_', ' ')} ·{' '}
                        {Math.round(c.value.confidence * 100)}% confidence
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {hasChips ? (
              <Button
                mode="contained"
                icon="check-all"
                onPress={apply}
                style={styles.applyButton}
              >
                Apply selected
              </Button>
            ) : (
              <Text variant="bodySmall" style={[styles.error, { color: theme.colors.onSurfaceVariant }]}>
                Nothing extracted from that note.
              </Text>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function assertionPrefix(a: BrainDumpAttribute['assertion']): string {
  switch (a) {
    case 'speculation':
      return '? ';
    case 'reported':
      return '“ ';
    case 'aspiration':
      return '→ ';
    default:
      return '';
  }
}

function FieldRow({
  icon,
  label,
  chip,
  note,
  onToggle,
  onEdit,
}: {
  icon: string;
  label: string;
  chip: FieldChipState | null;
  note?: string;
  onToggle: () => void;
  onEdit: (next: string) => void;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  if (!chip) return null;
  const cls = chip.diff ?? 'NEW';
  const badgeColor =
    cls === 'CONFLICT'
      ? theme.colors.error
      : cls === 'UPDATE'
      ? theme.colors.tertiary ?? theme.colors.primary
      : theme.colors.primary;
  return (
    <View style={styles.fieldRow}>
      <Checkbox status={chip.accepted ? 'checked' : 'unchecked'} onPress={onToggle} />
      <View style={{ flex: 1 }}>
        <View style={styles.fieldHeader}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {label}
          </Text>
          {chip.diff && chip.diff !== 'MATCH' && (
            <Text
              variant="labelSmall"
              style={[styles.diffBadge, { color: badgeColor, borderColor: badgeColor }]}
            >
              {chip.diff}
            </Text>
          )}
        </View>
        {editing ? (
          <TextInput
            mode="outlined"
            dense
            value={chip.value}
            onChangeText={onEdit}
            onBlur={() => setEditing(false)}
            autoFocus
          />
        ) : (
          <Text variant="bodyMedium" onPress={() => setEditing(true)}>
            {chip.value}
          </Text>
        )}
        {chip.existing && (cls === 'UPDATE' || cls === 'CONFLICT') && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            was: {chip.existing}
          </Text>
        )}
        {note && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {note}
          </Text>
        )}
      </View>
      <IconButton icon={icon} size={18} style={styles.fieldIconChip} />
    </View>
  );
}

function countTotal(r: BrainDumpResult): number {
  return (
    (r.metLocation ? 1 : 0) +
    (r.metDate ? 1 : 0) +
    (r.homeLocation ? 1 : 0) +
    (r.phone ? 1 : 0) +
    (r.email ? 1 : 0) +
    (r.partnerName ? 1 : 0) +
    r.socialHandles.length +
    r.languages.length +
    r.attributes.length
  );
}

function countAccepted(state: {
  metLocationChip: FieldChipState | null;
  metDateChip: FieldChipState | null;
  homeLocationChip: FieldChipState | null;
  phoneChip: FieldChipState | null;
  emailChip: FieldChipState | null;
  partnerChip: FieldChipState | null;
  socialChips: ListChipState<SocialLink>[];
  languageChips: ListChipState<string>[];
  attributeChips: ListChipState<BrainDumpAttribute>[];
}): number {
  let n = 0;
  for (const c of [
    state.metLocationChip,
    state.metDateChip,
    state.homeLocationChip,
    state.phoneChip,
    state.emailChip,
    state.partnerChip,
  ]) {
    if (c?.accepted) n++;
  }
  n += state.socialChips.filter((c) => c.accepted).length;
  n += state.languageChips.filter((c) => c.accepted).length;
  n += state.attributeChips.filter((c) => c.accepted).length;
  return n;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  hint: {
    marginTop: 4,
    marginBottom: 12,
  },
  banner: {
    marginBottom: 8,
  },
  consentDismiss: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  textarea: {
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devModelRow: {
    marginBottom: 8,
  },
  devModelChip: {
    marginRight: 4,
  },
  error: {
    marginTop: 8,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  results: {
    marginTop: 16,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  group: {
    marginTop: 12,
  },
  groupLabel: {
    marginBottom: 6,
    opacity: 0.7,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  attrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fieldIconChip: {
    marginLeft: 6,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffBadge: {
    fontSize: 9,
    letterSpacing: 0.6,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontWeight: '700',
  },
  applyButton: {
    marginTop: 16,
  },
});
