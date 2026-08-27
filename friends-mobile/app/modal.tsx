import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, View, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, Button } from 'react-native-paper';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { FormSection, FormInput } from '@/components/FormKit';

export default function AddPersonModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + fz.s.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={[fzText.sub, styles.subtitle]}>
            {t('person.addSubtitle')}
          </Text>

          <BrainDumpSection personName={name} onApply={handleBrainDumpApply} />

          <View style={styles.plainGroup}>
            <FormInput
              label={`${t('person.name')} ${t('person.nameRequired')} `}
              placeholder={t('person.namePlaceholder')}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              maxLength={255}
            />

            <FormInput
              label={t('person.nickname')}
              placeholder={t('person.nicknamePlaceholder')}
              value={nickname}
              onChangeText={setNickname}
              style={styles.lastInput}
              maxLength={255}
            />
          </View>

          <FormSection title={t('person.relationshipType')}>
            <View style={styles.pillRow}>
              {[
                { value: 'friend', label: t('person.friend') },
                { value: 'family', label: t('person.family') },
                { value: 'colleague', label: t('person.colleague') },
                { value: 'acquaintance', label: t('person.acquaintance') },
                { value: 'partner', label: t('person.partner') },
              ].map((opt) => (
                <Pill
                  key={opt.value}
                  label={opt.label}
                  selected={relationshipType === opt.value}
                  onPress={() => handleRelationshipChange(opt.value)}
                />
              ))}
            </View>

            {!ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
              <View style={styles.personTypeBlock}>
                <Text style={[fzText.label, styles.label]}>Person Type</Text>
                <View style={styles.pillRow}>
                  <Pill
                    label="Primary"
                    selected={personType === 'primary'}
                    onPress={() => setPersonType('primary')}
                  />
                  <Pill
                    label="Mentioned"
                    selected={personType === 'mentioned'}
                    onPress={() => setPersonType('mentioned')}
                  />
                </View>
                <Text style={[fzText.sub, { marginTop: 8 }]}>
                  {personType === 'primary'
                    ? 'Visible in main lists and search.'
                    : 'Hidden from main lists, used for context only.'}
                </Text>
              </View>
            )}
          </FormSection>

          <View style={styles.plainGroup}>
            <FormInput
              label={t('person.birthday')}
              placeholder={t('person.birthdayPlaceholder')}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />
            <Text style={[fzText.sub, styles.birthdayHint]}>
              {t('person.birthdayHint')}
            </Text>

            <FormInput
              label="When you met"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              value={metDate}
              onChangeText={setMetDate}
            />
            <Text style={[fzText.sub, styles.birthdayHint]}>
              Year alone is fine, e.g. 2024.
            </Text>
          </View>

          <MetLocationInput value={metLocation} onChangeText={setMetLocation} kind="met" />

          <MetLocationInput value={homeLocation} onChangeText={setHomeLocation} kind="home" />

          <View style={styles.plainGroup}>
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
                  icon="contacts"
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
              <Text style={[fzText.sub, styles.birthdayHint]}>
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
              style={styles.lastInput}
              maxLength={254}
            />
          </View>

          <LanguagesEditor value={languages} onChange={setLanguages} />

          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />

          <View style={styles.plainGroup}>
            <FormInput
              label={t('person.notes')}
              placeholder={t('person.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.lastInput}
            />
          </View>

          <Button
            mode="contained"
            buttonColor={fz.ink}
            textColor={fz.paper}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || name.trim().length < 2}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={fzText.btn}
          >
            {t('person.addButton')}
          </Button>

          <Button mode="text" onPress={() => router.back()} disabled={isSubmitting} textColor={fz.textMute}>
            {t('common.cancel')}
          </Button>
        </View>

        <StatusBar style="dark" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fz.paper,
  },
  content: {
    padding: fz.s.xxl,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  lastInput: {
    marginBottom: 0,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  personTypeBlock: {
    marginTop: fz.s.lg,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: fz.rButton,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  birthdayHint: {
    marginTop: 4,
    marginBottom: 12,
  },
  plainGroup: {
    marginBottom: fz.s.lg,
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
