import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, View, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Chip } from 'react-native-paper';
import { useState } from 'react';
import { router } from 'expo-router';
import { useCreatePerson } from '@/hooks/usePeople';
import { useTranslation } from 'react-i18next';
import { devLogger } from '@/lib/utils/devLogger';
import MetLocationInput from '@/components/person/MetLocationInput';
import SocialLinksEditor from '@/components/person/SocialLinksEditor';
import LanguagesEditor from '@/components/person/LanguagesEditor';
import BrainDumpSection, { type AppliedBrainDump } from '@/components/person/BrainDumpSection';
import { serializeSocialLinks, type SocialLink } from '@/lib/social/socialLinks';
import { serializeLanguages } from '@/lib/utils/languages';
import { isValidEmail, isValidPhone, normalizePhone } from '@/lib/utils/pii';
import { pickContact, isContactPickerAvailable } from '@/lib/utils/contactsPicker';
import { useCreatePerson as useCreatePartnerPerson } from '@/hooks/usePeople';
import { useCreateConnection } from '@/hooks/useConnections';
import { useCreateRelations } from '@/hooks/useRelations';
import type { BrainDumpAttribute } from '@/lib/ai/brain-dump';
import { parseFlexibleDate } from '@/lib/utils/dates';

export default function AddPersonModal() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [personType, setPersonType] = useState<'primary' | 'mentioned'>('primary');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [metDate, setMetDate] = useState('');
  const [metLocation, setMetLocation] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [notes, setNotes] = useState('');
  const [pendingPartnerName, setPendingPartnerName] = useState<string | null>(null);
  const [pendingAttributes, setPendingAttributes] = useState<BrainDumpAttribute[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickFromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    if (picked.phone) setPhone(picked.phone);
    if (picked.email) setEmail(picked.email);
    if (picked.name && !name.trim()) setName(picked.name);
  };

  const ALWAYS_PRIMARY_RELATIONSHIPS = ['partner', 'friend', 'family'];

  const createPerson = useCreatePerson();
  const createPartnerPerson = useCreatePartnerPerson();
  const createConnection = useCreateConnection();
  const createRelations = useCreateRelations();

  const handleBrainDumpApply = (applied: AppliedBrainDump) => {
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

    // Side-effects need a personId — defer until after createPerson resolves
    if (applied.partnerName) setPendingPartnerName(applied.partnerName);
    if (applied.attributes.length) {
      setPendingAttributes((prev) => [...prev, ...applied.attributes]);
    }
  };

  const handleRelationshipChange = (value: string) => {
    setRelationshipType(value);
    if (ALWAYS_PRIMARY_RELATIONSHIPS.includes(value)) {
      setPersonType('primary');
    } else if (value === 'acquaintance') {
      setPersonType('mentioned');
    } else {
      setPersonType('primary');
    }
  };

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      Alert.alert(t('person.invalidName'), t('person.invalidNameMessage'));
      return;
    }

    if (name.trim().length > 255) {
      Alert.alert(t('person.nameTooLong'), t('person.nameTooLongMessage'));
      return;
    }

    if (nickname.trim().length > 255) {
      Alert.alert(t('person.nicknameTooLong'), t('person.nicknameTooLongMessage'));
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

      const created = await createPerson.mutateAsync({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        relationshipType: relationshipType as any,
        dateOfBirth: parsedBirthday || undefined,
        metDate: parsedMetDate || undefined,
        metLocation: metLocation.trim() || undefined,
        homeLocation: homeLocation.trim() || undefined,
        phone: trimmedPhone || undefined,
        email: trimmedEmail || undefined,
        languages: serializeLanguages(languages) || undefined,
        socialLinks: serializeSocialLinks(socialLinks) || undefined,
        notes: notes.trim() || undefined,
        personType: personType,
        dataCompleteness: 'partial',
        addedBy: 'user',
        status: 'active',
      });

      // Apply brain-dump side-effects (partner + attributes) now that we have an ID
      if (created?.id) {
        try {
          if (pendingPartnerName) {
            const partner = await createPartnerPerson.mutateAsync({
              name: pendingPartnerName,
              personType: 'primary',
              dataCompleteness: 'minimal',
              addedBy: 'ai_extraction',
              status: 'active',
              relationshipType: 'partner',
            });
            if (partner?.id) {
              await createConnection.mutateAsync({
                person1Id: created.id,
                person2Id: partner.id,
                relationshipType: 'partner',
                status: 'active',
              });
            }
          }
          if (pendingAttributes.length) {
            await createRelations.mutateAsync(
              pendingAttributes.map((a) => ({
                subjectId: created.id,
                subjectType: 'person',
                relationType: a.relationType,
                objectLabel: a.objectLabel,
                confidence: a.confidence,
                source: 'ai_extraction',
                status: a.assertion === 'aspiration' ? 'aspiration' : 'current',
                assertion: a.assertion,
              }))
            );
          }
        } catch (sideEffectError) {
          devLogger.error('Brain-dump side-effects failed', { sideEffectError });
        }
      }

      Alert.alert(t('common.success'), t('person.successAdded', { name }), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('already exists')) {
        Alert.alert(t('person.duplicateName'), errorMessage, [{ text: t('common.ok') }]);
      } else {
        Alert.alert(t('common.error'), t('person.errorAdding'));
      }
      devLogger.error('Failed to create person', { error, personData: { name } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('person.addSubtitle')}
          </Text>

          <BrainDumpSection personName={name} onApply={handleBrainDumpApply} />

          <TextInput
            mode="outlined"
            label={`${t('person.name')} ${t('person.nameRequired')} `}
            placeholder={t('person.namePlaceholder')}
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoFocus
            autoCapitalize="words"
            maxLength={255}
          />

          <TextInput
            mode="outlined"
            label={t('person.nickname')}
            placeholder={t('person.nicknamePlaceholder')}
            value={nickname}
            onChangeText={setNickname}
            style={styles.input}
            maxLength={255}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="titleSmall" style={styles.label}>
              {t('person.relationshipType')}
            </Text>
            {!ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
              <Chip
                compact
                style={{ 
                  backgroundColor: personType === 'primary' ? '#e3f2fd' : '#fff3e0',
                  borderColor: personType === 'primary' ? '#2196f3' : '#ff9800',
                  borderWidth: 1,
                }}
                textStyle={{ 
                  fontSize: 10, 
                  marginVertical: 0, 
                  marginHorizontal: 4, 
                  color: personType === 'primary' ? '#0d47a1' : '#e65100',
                }}
              >
                {personType.toUpperCase()}
              </Chip>
            )}
          </View>
          <SegmentedButtons
            value={relationshipType}
            onValueChange={handleRelationshipChange}
            buttons={[
              { value: 'friend', label: t('person.friend'), icon: 'account-heart' },
              { value: 'family', label: t('person.family'), icon: 'home-heart' },
              { value: 'colleague', label: t('person.colleague'), icon: 'briefcase' },
            ]}
            style={styles.segmented}
          />
          <SegmentedButtons
            value={relationshipType}
            onValueChange={handleRelationshipChange}
            buttons={[
              { value: 'acquaintance', label: t('person.acquaintance') },
              { value: 'partner', label: t('person.partner'), icon: 'heart' },
            ]}
            style={styles.segmented}
          />

          {!ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
            <View style={{ marginBottom: 16 }}>
              <Text variant="titleSmall" style={styles.label}>
                Person Type
              </Text>
              <SegmentedButtons
                value={personType}
                onValueChange={value => setPersonType(value as 'primary' | 'mentioned')}
                buttons={[
                  {
                    value: 'primary',
                    label: 'Primary',
                    icon: 'account',
                  },
                  {
                    value: 'mentioned',
                    label: 'Mentioned',
                    icon: 'account-outline',
                  },
                ]}
              />
              <Text variant="bodySmall" style={{ marginTop: 8, color: '#666' }}>
                {personType === 'primary' 
                  ? 'Visible in main lists and search.' 
                  : 'Hidden from main lists, used for context only.'}
              </Text>
            </View>
          )}

          <TextInput
            mode="outlined"
            label={t('person.birthday')}
            placeholder={t('person.birthdayPlaceholder')}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            style={styles.input}
          />
          <Text variant="labelSmall" style={styles.birthdayHint}>
            {t('person.birthdayHint')}
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

          <TextInput
            mode="outlined"
            label={t('person.notes')}
            placeholder={t('person.notesPlaceholder')}
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
            {t('person.addButton')}
          </Button>

          <Button mode="text" onPress={() => router.back()} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
        </View>

        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  birthdayHint: {
    opacity: 0.6,
    marginTop: -12,
    marginBottom: 16,
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
