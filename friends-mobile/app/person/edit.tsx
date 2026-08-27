import { StatusBar } from 'expo-status-bar';
import {
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
  View,
  Alert,
  KeyboardAvoidingView,
  Text as RNText,
} from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { usePerson, useUpdatePerson } from '@/hooks/usePeople';
import { devLogger } from '@/lib/utils/devLogger';
import MetLocationInput from '@/components/person/MetLocationInput';
import SocialLinksEditor from '@/components/person/SocialLinksEditor';
import LanguagesEditor from '@/components/person/LanguagesEditor';
import BrainDumpSection, { type AppliedBrainDump } from '@/components/person/BrainDumpSection';
import { usePersonRelations } from '@/hooks/useRelations';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople } from '@/hooks/usePeople';
import type { ExistingPersonState } from '@/lib/ai/brain-dump-diff';
import {
  parseSocialLinksJson,
  serializeSocialLinks,
  type SocialLink,
} from '@/lib/social/socialLinks';
import { parseLanguagesJson, serializeLanguages } from '@/lib/utils/languages';
import { isValidEmail, isValidPhone, normalizePhone } from '@/lib/utils/pii';
import { pickContact, isContactPickerAvailable } from '@/lib/utils/contactsPicker';
import { useCreatePerson } from '@/hooks/usePeople';
import { useCreateConnection } from '@/hooks/useConnections';
import { useCreateRelations, useUpdateRelation } from '@/hooks/useRelations';
import { useUpdateConnection } from '@/hooks/useConnections';
import { parseFlexibleDate } from '@/lib/utils/dates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { FormSection, FormInput } from '@/components/FormKit';

function buildExistingState(args: {
  metLocation: string;
  metDate: string;
  homeLocation: string;
  phone: string;
  email: string;
  socialLinks: SocialLink[];
  languages: string[];
  personRelations: { id: string; relationType: string; objectLabel: string; status?: string | null }[];
  personConnections: { id: string; person1Id: string; person2Id: string; relationshipType: string | null; status: string | null }[];
  allPeople: { id: string; name: string }[];
  personId: string;
}): ExistingPersonState {
  const activePartnerConn = args.personConnections.find(
    (c) => c.relationshipType === 'partner' && c.status !== 'ended'
  );
  let activePartner: ExistingPersonState['activePartner'];
  if (activePartnerConn) {
    const otherId =
      activePartnerConn.person1Id === args.personId
        ? activePartnerConn.person2Id
        : activePartnerConn.person1Id;
    const partner = args.allPeople.find((p) => p.id === otherId);
    if (partner) {
      activePartner = {
        id: activePartnerConn.id,
        partnerName: partner.name,
        status: activePartnerConn.status,
      };
    }
  }
  return {
    metLocation: args.metLocation || null,
    metDate: args.metDate || null,
    homeLocation: args.homeLocation || null,
    phone: args.phone || null,
    email: args.email || null,
    socialLinks: args.socialLinks,
    languages: args.languages,
    activePartner,
    attributes: args.personRelations.map((r) => ({
      id: r.id,
      relationType: r.relationType,
      objectLabel: r.objectLabel,
      status: r.status ?? null,
    })),
  };
}

export default function EditPersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const insets = useSafeAreaInsets();
  const { data: person, isLoading } = usePerson(personId!);
  const updatePerson = useUpdatePerson();
  const createPerson = useCreatePerson();
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const createRelations = useCreateRelations();
  const updateRelation = useUpdateRelation();
  const { data: personRelations = [] } = usePersonRelations(personId!);
  const { data: personConnections = [] } = usePersonConnections(personId!);
  const { data: allPeople = [] } = usePeople();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [metDate, setMetDate] = useState('');
  const [metLocation, setMetLocation] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [notes, setNotes] = useState('');
  const [personType, setPersonType] = useState<string>('primary');
  const [importanceToUser, setImportanceToUser] = useState<string>('unknown');
  const [gender, setGender] = useState<string>('');
  const [genderOther, setGenderOther] = useState('');
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form when person data loads
  useEffect(() => {
    if (person) {
      setName(person.name);
      setNickname(person.nickname || '');
      setRelationshipType(person.relationshipType || 'friend');
      setDateOfBirth(
        person.dateOfBirth ? new Date(person.dateOfBirth).toISOString().split('T')[0] : ''
      );
      setMetDate(person.metDate ? new Date(person.metDate).toISOString().split('T')[0] : '');
      setMetLocation(person.metLocation || '');
      setHomeLocation(person.homeLocation || '');
      setPhone(person.phone || '');
      setEmail(person.email || '');
      setLanguages(parseLanguagesJson(person.languages));
      setSocialLinks(parseSocialLinksJson(person.socialLinks));
      setNotes(person.notes || '');
      setPersonType(person.personType || 'primary');
      setImportanceToUser(person.importanceToUser || 'unknown');
      const g = person.gender || '';
      const known = g === 'male' || g === 'female';
      setGender(!g ? '' : known ? g : 'other');
      setGenderOther(!g || known || g === 'other' ? '' : g);
    }
  }, [person]);

  const handlePickFromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    if (picked.phone) setPhone(picked.phone);
    if (picked.email) setEmail(picked.email);
    if (picked.name && !name.trim()) setName(picked.name);
  };

  const handleBrainDumpApply = async (applied: AppliedBrainDump) => {
    if (applied.metLocation) setMetLocation(applied.metLocation);
    if (applied.metDate) setMetDate(applied.metDate);
    if (applied.homeLocation) setHomeLocation(applied.homeLocation);
    if (applied.phone) setPhone(applied.phone);
    if (applied.email) setEmail(applied.email);

    if (applied.socialHandles.length) {
      const existingKeys = new Set(socialLinks.map((s) => `${s.platform}:${s.handle.toLowerCase()}`));
      const additions = applied.socialHandles.filter(
        (s) => !existingKeys.has(`${s.platform}:${s.handle.toLowerCase()}`)
      );
      if (additions.length) setSocialLinks([...socialLinks, ...additions]);
    }

    if (applied.languages.length) {
      const existing = new Set(languages.map((l) => l.toLowerCase()));
      const additions = applied.languages.filter((l) => !existing.has(l.toLowerCase()));
      if (additions.length) setLanguages([...languages, ...additions]);
    }

    const appendedNote = [notes.trim(), applied.rawText].filter(Boolean).join('\n\n');
    setNotes(appendedNote);

    // Side-effect writes (require a saved person + the AI key flow that just ran)
    try {
      // 1) Archive existing relations that the user accepted as UPDATE
      if (applied.archiveRelationIds.length) {
        const now = new Date();
        await Promise.all(
          applied.archiveRelationIds.map((id) =>
            updateRelation.mutateAsync({ id, status: 'past', validTo: now })
          )
        );
      }

      // 2) End the old partner connection if the user accepted a new partner
      if (applied.endsPartnerConnectionId) {
        await updateConnection.mutateAsync({
          id: applied.endsPartnerConnectionId,
          status: 'ended',
          endDate: new Date(),
          endReason: 'breakup',
        });
      }

      if (applied.partnerName && personId) {
        const partner = await createPerson.mutateAsync({
          name: applied.partnerName,
          personType: 'primary',
          dataCompleteness: 'minimal',
          addedBy: 'ai_extraction',
          status: 'active',
          relationshipType: 'partner',
        });
        if (partner?.id) {
          await createConnection.mutateAsync({
            person1Id: personId,
            person2Id: partner.id,
            relationshipType: 'partner',
            status: 'active',
          });
        }
      }

      if (applied.attributes.length && personId) {
        await createRelations.mutateAsync(
          applied.attributes.map((a) => ({
            subjectId: personId,
            subjectType: 'person',
            relationType: a.relationType,
            objectLabel: a.objectLabel,
            confidence: a.confidence,
            source: 'ai_extraction',
            // Aspirations are tense-future; speculations/reported are still about the present.
            status: a.assertion === 'aspiration' ? 'aspiration' : 'current',
            assertion: a.assertion,
          }))
        );
      }
    } catch (e) {
      Alert.alert(
        'Some side-effects failed',
        e instanceof Error ? e.message : 'Could not write partner or attributes.'
      );
    }
  };

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter a name with at least 2 characters');
      return;
    }
    const trimmedPhone = normalizePhone(phone);
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      Alert.alert('Invalid phone', 'Phone may include digits, spaces, +, ( ), - and . only.');
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedBirthday = parseFlexibleDate(dateOfBirth);
      const parsedMetDate = parseFlexibleDate(metDate);

      await updatePerson.mutateAsync({
        id: personId!,
        name: name.trim(),
        nickname: nickname.trim() || null,
        relationshipType: relationshipType as any,
        dateOfBirth: parsedBirthday || undefined,
        metDate: parsedMetDate || null,
        metLocation: metLocation.trim() || null,
        homeLocation: homeLocation.trim() || null,
        phone: trimmedPhone || null,
        email: trimmedEmail || null,
        languages: serializeLanguages(languages),
        socialLinks: serializeSocialLinks(socialLinks),
        notes: notes.trim() || null,
        personType: personType as any,
        importanceToUser: importanceToUser as any,
        gender:
          gender === 'other' ? genderOther.trim() || 'other' : gender || null,
      });

      router.back();
    } catch (error) {
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('already exists')) {
        Alert.alert('Duplicate Name', errorMessage, [{ text: 'OK' }]);
      } else {
        Alert.alert('Error', 'Failed to update person. Please try again.');
      }
      devLogger.error('Failed to update person', { error, personId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={[fzText.sub, styles.loadingText]}>Loading...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text style={fzText.title}>Person not found</Text>
        <Button mode="contained" onPress={() => router.back()} buttonColor={fz.ink} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <RNText style={styles.headerTitle} numberOfLines={1}>
              Edit <RNText style={styles.headerTitleName}>{person.name}</RNText>
            </RNText>
          ),
          headerBackTitle: 'Cancel',
          headerStyle: { backgroundColor: fz.paper },
          headerTintColor: fz.ink,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + fz.s.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={[fzText.sub, styles.subtitle]}>Update information for {person.name}</Text>

            <View style={styles.plainGroup}>
              <FormInput label="Name *" placeholder="Enter their name" value={name} onChangeText={setName} autoFocus />
              <FormInput label="Nickname" placeholder="Optional nickname" value={nickname} onChangeText={setNickname} style={styles.lastInput} />
            </View>

            <FormSection title="Social &amp; languages">
              <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
              <LanguagesEditor value={languages} onChange={setLanguages} />
            </FormSection>

            <FormSection title="Gender">
              <View style={styles.pillRow}>
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: '', label: 'Unknown' },
                ].map((opt) => (
                  <Pill key={opt.value || 'unknown'} label={opt.label} selected={gender === opt.value} onPress={() => setGender(opt.value)} />
                ))}
              </View>
              {gender === 'other' && (
                <FormInput
                  label="Specify gender"
                  placeholder="e.g. non-binary"
                  value={genderOther}
                  onChangeText={setGenderOther}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={40}
                  style={styles.genderOtherInput}
                />
              )}
            </FormSection>

            <FormSection title="Relationship Type">
              <View style={styles.pillRow}>
                {[
                  { value: 'friend', label: 'Friend' },
                  { value: 'family', label: 'Family' },
                  { value: 'colleague', label: 'Colleague' },
                  { value: 'acquaintance', label: 'Acquaintance' },
                  { value: 'partner', label: 'Partner' },
                ].map((opt) => (
                  <Pill key={opt.value} label={opt.label} selected={relationshipType === opt.value} onPress={() => setRelationshipType(opt.value)} />
                ))}
              </View>
            </FormSection>

            <View style={styles.plainGroup}>
              <FormInput
                label="Birthday"
                placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                style={styles.inputAboveHint}
              />
              <Text style={[fzText.sub, styles.hintTile]}>
                Enter year only (1990), year-month (1990-06), or full date (1990-06-15)
              </Text>

              <FormInput
                label="When you met"
                placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
                value={metDate}
                onChangeText={setMetDate}
                style={styles.inputAboveHint}
              />
              <Text style={[fzText.sub, styles.hintTile]}>Year alone is fine, e.g. 2024.</Text>

              <MetLocationInput value={metLocation} onChangeText={setMetLocation} kind="met" />
              <MetLocationInput value={homeLocation} onChangeText={setHomeLocation} kind="home" />

              <View style={styles.phoneRow}>
                <FormInput
                  label="Phone"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  style={styles.phoneInput}
                  maxLength={32}
                />
                {isContactPickerAvailable() && (
                  <Button
                    mode="outlined"
                    onPress={handlePickFromContacts}
                    style={styles.pickButton}
                    textColor={fz.ink}
                    compact
                  >
                    Pick
                  </Button>
                )}
              </View>
              {isContactPickerAvailable() && (
                <Text style={[fzText.sub, styles.hintTight]}>
                  Tap "Pick" to choose one contact from your address book. Nothing is uploaded.
                </Text>
              )}

              <FormInput
                label="Email"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                style={styles.lastInput}
              />
            </View>

            <FormSection
              title="Person Type"
              hint="Primary people appear in party mode and food quiz. Mentioned people are tracked but less prominent."
            >
              <View style={styles.pillRow}>
                <Pill label="Primary" selected={personType === 'primary'} onPress={() => setPersonType('primary')} />
                <Pill label="Mentioned" selected={personType === 'mentioned'} onPress={() => setPersonType('mentioned')} />
              </View>
            </FormSection>

            <FormSection
              title="Importance to You"
              hint="Used for sorting people by importance. Very important people appear first."
            >
              <View style={styles.pillRow}>
                {[
                  { value: 'very_important', label: 'Very Important' },
                  { value: 'important', label: 'Important' },
                  { value: 'peripheral', label: 'Peripheral' },
                  { value: 'unknown', label: 'Unknown' },
                ].map((opt) => (
                  <Pill key={opt.value} label={opt.label} selected={importanceToUser === opt.value} onPress={() => setImportanceToUser(opt.value)} />
                ))}
              </View>
            </FormSection>

            <View style={styles.plainGroup}>
              <FormInput
                label="Notes"
                placeholder="Any notes about this person..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                style={styles.lastInput}
              />
            </View>

            <Pressable
              onPress={() => setShowBrainDump((v) => !v)}
              style={styles.foldHeader}
              accessibilityRole="button"
            >
              <Text style={fzText.label}>Quick brain-dump (optional)</Text>
              <Text style={fzText.sub}>{showBrainDump ? 'Hide' : 'Show'}</Text>
            </Pressable>
            {showBrainDump && (
              <BrainDumpSection
                personName={person.name}
                existing={buildExistingState({
                  metLocation,
                  metDate,
                  homeLocation,
                  phone,
                  email,
                  socialLinks,
                  languages,
                  personRelations,
                  personConnections,
                  allPeople,
                  personId: personId!,
                })}
                onApply={handleBrainDumpApply}
              />
            )}

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || name.trim().length < 2}
              buttonColor={fz.ink}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={fzText.btn}
            >
              Save Changes
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
              style={styles.secondaryButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={fzText.btnOutline}
              disabled={isSubmitting}
            >
              Add Something They're Into
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
              style={styles.secondaryButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={fzText.btnOutline}
              disabled={isSubmitting}
            >
              Add Connection to Person
            </Button>

            <Button mode="text" onPress={() => router.back()} disabled={isSubmitting} textColor={fz.textMute}>
              Cancel
            </Button>
          </View>

          <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontFamily: fz.font,
    fontWeight: '500',
    fontSize: 18,
    color: fz.ink,
  },
  headerTitleName: {
    fontFamily: fz.font,
    fontWeight: '700',
    fontSize: 18,
    color: fz.ink,
  },
  container: {
    flex: 1,
    backgroundColor: fz.paper,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: fz.paper,
  },
  loadingText: {
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
  },
  content: {
    padding: fz.s.edge,
  },
  subtitle: {
    marginBottom: fz.s.lg,
  },
  lastInput: {
    marginBottom: 0,
  },
  plainGroup: {
    marginBottom: fz.s.lg,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hintTight: {
    marginTop: 4,
    marginBottom: fz.s.md,
  },
  inputAboveHint: {
    marginBottom: fz.s.xs,
  },
  hintTile: {
    marginBottom: fz.s.md,
    backgroundColor: fz.surfaceSoft,
    borderRadius: fz.rButton,
    paddingVertical: fz.s.sm,
    paddingHorizontal: fz.s.md,
    overflow: 'hidden',
  },
  genderOtherInput: {
    marginTop: fz.s.md,
    marginBottom: 0,
  },
  foldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: fz.s.md,
    marginBottom: fz.s.sm,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: fz.rButton,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  secondaryButton: {
    marginBottom: 8,
    borderColor: fz.outline,
    borderRadius: fz.rButton,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: fz.s.md,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  pickButton: {
    alignSelf: 'center',
    borderColor: fz.outline,
  },
});
