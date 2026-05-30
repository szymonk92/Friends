import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, View, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
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
      });

      Alert.alert('Success', `${name} has been updated!`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
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
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Person not found</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Edit ${person.name}`,
          headerBackTitle: 'Cancel',
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.container}>
          <View style={styles.content}>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Update information for {person.name}
            </Text>

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

            <TextInput
              mode="outlined"
              label="Name *"
              placeholder="Enter their name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoFocus
            />

            <TextInput
              mode="outlined"
              label="Nickname"
              placeholder="Optional nickname"
              value={nickname}
              onChangeText={setNickname}
              style={styles.input}
            />

            <Text variant="titleSmall" style={styles.label}>
              Relationship Type
            </Text>
            <SegmentedButtons
              value={relationshipType}
              onValueChange={setRelationshipType}
              buttons={[
                { value: 'friend', label: 'Friend', icon: 'account-heart' },
                { value: 'family', label: 'Family', icon: 'home-heart' },
                { value: 'colleague', label: 'Colleague', icon: 'briefcase' },
              ]}
              style={styles.segmented}
            />
            <SegmentedButtons
              value={relationshipType}
              onValueChange={setRelationshipType}
              buttons={[
                { value: 'acquaintance', label: 'Acquaintance' },
                { value: 'partner', label: 'Partner', icon: 'heart' },
              ]}
              style={styles.segmented}
            />

            <TextInput
              mode="outlined"
              label="Birthday"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              style={styles.input}
            />
            <Text variant="labelSmall" style={styles.birthdayHint}>
              Enter year only (1990), year-month (1990-06), or full date (1990-06-15)
            </Text>

            <TextInput
              mode="outlined"
              label="When you met"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              value={metDate}
              onChangeText={setMetDate}
              style={styles.input}
            />
            <Text variant="labelSmall" style={styles.birthdayHint}>
              Year alone is fine, e.g. 2024.
            </Text>

            <MetLocationInput value={metLocation} onChangeText={setMetLocation} kind="met" />

            <MetLocationInput value={homeLocation} onChangeText={setHomeLocation} kind="home" />

            <View style={styles.phoneRow}>
              <TextInput
                mode="outlined"
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
                  icon="contacts"
                  onPress={handlePickFromContacts}
                  style={styles.pickButton}
                  compact
                >
                  Pick
                </Button>
              )}
            </View>
            {isContactPickerAvailable() && (
              <Text variant="labelSmall" style={styles.birthdayHint}>
                Tap "Pick" to choose one contact from your address book. Nothing is uploaded.
              </Text>
            )}

            <TextInput
              mode="outlined"
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              maxLength={254}
            />

            <LanguagesEditor value={languages} onChange={setLanguages} />

            <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />

            <Text variant="titleSmall" style={styles.label}>
              Person Type
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              Primary people appear in party mode and food quiz. Mentioned people are tracked but
              less prominent.
            </Text>
            <SegmentedButtons
              value={personType}
              onValueChange={setPersonType}
              buttons={[
                { value: 'primary', label: 'Primary', icon: 'star' },
                { value: 'mentioned', label: 'Mentioned', icon: 'account-outline' },
              ]}
              style={styles.segmented}
            />

            <Text variant="titleSmall" style={styles.label}>
              Importance to You
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              Used for sorting people by importance. Very important people appear first.
            </Text>
            <SegmentedButtons
              value={importanceToUser}
              onValueChange={setImportanceToUser}
              buttons={[
                { value: 'very_important', label: 'Very Important', icon: 'star' },
                { value: 'important', label: 'Important', icon: 'star-half-full' },
              ]}
              style={styles.segmented}
            />
            <SegmentedButtons
              value={importanceToUser}
              onValueChange={setImportanceToUser}
              buttons={[
                { value: 'peripheral', label: 'Peripheral', icon: 'star-outline' },
                { value: 'unknown', label: 'Unknown' },
              ]}
              style={styles.segmented}
            />

            <TextInput
              mode="outlined"
              label="Notes"
              placeholder="Any notes about this person..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || name.trim().length < 2}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Save Changes
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
              icon="plus"
              style={styles.addRelationButton}
              disabled={isSubmitting}
            >
              Add Relation
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
              icon="account-multiple-plus"
              style={styles.addRelationButton}
              disabled={isSubmitting}
            >
              Add Connection to Person
            </Button>

            <Button mode="text" onPress={() => router.back()} disabled={isSubmitting}>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
  },
  content: {
    padding: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  segmented: {
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  addRelationButton: {
    marginBottom: 8,
  },
  birthdayHint: {
    opacity: 0.6,
    marginTop: -12,
    marginBottom: 16,
  },
  hint: {
    opacity: 0.7,
    marginBottom: 8,
    marginTop: -4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  phoneInput: {
    flex: 1,
  },
  pickButton: {
    alignSelf: 'center',
  },
});
