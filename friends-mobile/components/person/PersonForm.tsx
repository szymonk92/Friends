import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, ScrollView, View, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MetLocationInput from '@/components/person/MetLocationInput';
import SocialLinksEditor from '@/components/person/SocialLinksEditor';
import LanguagesEditor from '@/components/person/LanguagesEditor';
import BrainDumpSection, { type AppliedBrainDump } from '@/components/person/BrainDumpSection';
import type { ExistingPersonState } from '@/lib/ai/brain-dump-diff';
import type { SocialLink } from '@/lib/social/socialLinks';
import { isValidEmail, isValidPhone, normalizePhone } from '@/lib/utils/pii';
import { pickContact, isContactPickerAvailable } from '@/lib/utils/contactsPicker';
import { fz, fzText } from '@/lib/design/tokens';
import { PillGroup } from '@/components/PillGroup';
import { FormSection, FormInput, Foldable } from '@/components/FormKit';

export type PersonFormValues = {
  name: string;
  nickname: string;
  relationshipType: string;
  personType: string;
  importanceToUser: string;
  gender: string;
  genderOther: string;
  dateOfBirth: string;
  metDate: string;
  metLocation: string;
  homeLocation: string;
  phone: string;
  email: string;
  languages: string[];
  socialLinks: SocialLink[];
  notes: string;
};

const DEFAULTS: PersonFormValues = {
  name: '',
  nickname: '',
  relationshipType: 'friend',
  personType: 'primary',
  importanceToUser: 'unknown',
  gender: '',
  genderOther: '',
  dateOfBirth: '',
  metDate: '',
  metLocation: '',
  homeLocation: '',
  phone: '',
  email: '',
  languages: [],
  socialLinks: [],
  notes: '',
};

// Relationships that force personType = primary (so the picker is hidden on add).
const ALWAYS_PRIMARY_RELATIONSHIPS = ['partner', 'friend', 'family'];

type RelationRow = {
  id: string;
  relationType: string;
  objectLabel: string;
  status?: string | null;
};
type ConnectionRow = {
  id: string;
  person1Id: string;
  person2Id: string;
  relationshipType: string | null;
  status: string | null;
};
export type BrainDumpContext = {
  personId: string;
  personRelations: RelationRow[];
  personConnections: ConnectionRow[];
  allPeople: { id: string; name: string }[];
};

// Assembles the "what we already know" snapshot the brain-dump diff needs,
// using the form's LIVE field values (not the saved record) so a phone/handle
// the user just typed still counts as known.
function buildExistingState(
  live: Pick<
    PersonFormValues,
    'metLocation' | 'metDate' | 'homeLocation' | 'phone' | 'email' | 'socialLinks' | 'languages'
  >,
  ctx: BrainDumpContext
): ExistingPersonState {
  const activePartnerConn = ctx.personConnections.find(
    (c) => c.relationshipType === 'partner' && c.status !== 'ended'
  );
  let activePartner: ExistingPersonState['activePartner'];
  if (activePartnerConn) {
    const otherId =
      activePartnerConn.person1Id === ctx.personId
        ? activePartnerConn.person2Id
        : activePartnerConn.person1Id;
    const partner = ctx.allPeople.find((p) => p.id === otherId);
    if (partner) {
      activePartner = {
        id: activePartnerConn.id,
        partnerName: partner.name,
        status: activePartnerConn.status,
      };
    }
  }
  return {
    metLocation: live.metLocation || null,
    metDate: live.metDate || null,
    homeLocation: live.homeLocation || null,
    phone: live.phone || null,
    email: live.email || null,
    socialLinks: live.socialLinks,
    languages: live.languages,
    activePartner,
    attributes: ctx.personRelations.map((r) => ({
      id: r.id,
      relationType: r.relationType,
      objectLabel: r.objectLabel,
      status: r.status ?? null,
    })),
  };
}

type Props = {
  mode: 'add' | 'edit';
  /** Seeds field state once on mount. Edit passes the mapped person record. */
  initial?: Partial<PersonFormValues>;
  subtitle?: string;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: PersonFormValues) => void;
  onCancel: () => void;
  /** Name shown in the brain-dump prompt; falls back to the live name field. */
  brainDumpPersonName?: string;
  /** Relations/connections/people context for the brain-dump diff (edit only). */
  brainDumpContext?: BrainDumpContext;
  /** Side-effects only (partner / attributes) — field merges happen here. */
  onBrainDumpApply?: (applied: AppliedBrainDump) => void;
  /** Extra buttons rendered under the submit button (edit: add relation/connection). */
  footer?: ReactNode;
};

export default function PersonForm({
  mode,
  initial,
  subtitle,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  brainDumpPersonName,
  brainDumpContext,
  onBrainDumpApply,
  footer,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const seed = { ...DEFAULTS, ...initial };

  const [name, setName] = useState(seed.name);
  const [nickname, setNickname] = useState(seed.nickname);
  const [relationshipType, setRelationshipType] = useState(seed.relationshipType);
  const [personType, setPersonType] = useState(seed.personType);
  const [importanceToUser, setImportanceToUser] = useState(seed.importanceToUser);
  const [gender, setGender] = useState(seed.gender);
  const [genderOther, setGenderOther] = useState(seed.genderOther);
  const [dateOfBirth, setDateOfBirth] = useState(seed.dateOfBirth);
  const [metDate, setMetDate] = useState(seed.metDate);
  const [metLocation, setMetLocation] = useState(seed.metLocation);
  const [homeLocation, setHomeLocation] = useState(seed.homeLocation);
  const [phone, setPhone] = useState(seed.phone);
  const [email, setEmail] = useState(seed.email);
  const [languages, setLanguages] = useState<string[]>(seed.languages);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(seed.socialLinks);
  const [notes, setNotes] = useState(seed.notes);

  const handleRelationshipChange = (value: string) => {
    setRelationshipType(value);
    // On add, personType tracks the relationship; on edit it is its own field.
    if (mode === 'add') {
      setPersonType(value === 'acquaintance' ? 'mentioned' : 'primary');
    }
  };

  const handlePickFromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    if (picked.phone) setPhone(picked.phone);
    if (picked.email) setEmail(picked.email);
    if (picked.name && !name.trim()) setName(picked.name);
  };

  const handleBrainDumpApply = (applied: AppliedBrainDump) => {
    if (applied.metLocation) setMetLocation(applied.metLocation);
    if (applied.metDate) setMetDate(applied.metDate);
    if (applied.homeLocation) setHomeLocation(applied.homeLocation);
    if (applied.phone) setPhone(applied.phone);
    if (applied.email) setEmail(applied.email);

    if (applied.socialHandles.length) {
      const keys = new Set(socialLinks.map((s) => `${s.platform}:${s.handle.toLowerCase()}`));
      const additions = applied.socialHandles.filter(
        (s) => !keys.has(`${s.platform}:${s.handle.toLowerCase()}`)
      );
      if (additions.length) setSocialLinks([...socialLinks, ...additions]);
    }

    if (applied.languages.length) {
      const have = new Set(languages.map((l) => l.toLowerCase()));
      const additions = applied.languages.filter((l) => !have.has(l.toLowerCase()));
      if (additions.length) setLanguages([...languages, ...additions]);
    }

    setNotes([notes.trim(), applied.rawText].filter(Boolean).join('\n\n'));

    onBrainDumpApply?.(applied);
  };

  const handleSubmitPress = () => {
    if (name.trim().length < 2) {
      Alert.alert(t('person.invalidName'), t('person.invalidNameMessage'));
      return;
    }
    const trimmedPhone = normalizePhone(phone);
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      Alert.alert(t('person.invalidPhone'), t('person.invalidPhoneMessage'));
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      Alert.alert(t('person.invalidEmail'), t('person.invalidEmailMessage'));
      return;
    }
    onSubmit({
      name,
      nickname,
      relationshipType,
      personType,
      importanceToUser,
      gender,
      genderOther,
      dateOfBirth,
      metDate,
      metLocation,
      homeLocation,
      phone,
      email,
      languages,
      socialLinks,
      notes,
    });
  };

  const showLinkedPersonType =
    mode === 'add' && !ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType);

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
          {subtitle ? <Text style={[fzText.sub, styles.subtitle]}>{subtitle}</Text> : null}

          <View style={styles.plainGroup}>
            <FormInput
              label={`${t('person.name')} ${t('person.nameRequired')}`}
              placeholder={t('person.namePlaceholder')}
              value={name}
              onChangeText={setName}
              autoFocus={mode === 'add'}
              autoCapitalize="words"
              maxLength={255}
            />
            <FormInput
              label={t('person.nickname')}
              placeholder={t('person.nicknamePlaceholder')}
              value={nickname}
              onChangeText={setNickname}
              maxLength={255}
              style={styles.lastInput}
            />
          </View>

          <FormSection title={t('person.socialAndLanguages')} style={styles.flatSection}>
            <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
            <LanguagesEditor value={languages} onChange={setLanguages} />
          </FormSection>

          {mode === 'edit' && (
            <FormSection title={t('person.gender')}>
              <PillGroup
                value={gender}
                onChange={setGender}
                options={[
                  { value: 'male', label: t('person.genderMale') },
                  { value: 'female', label: t('person.genderFemale') },
                  { value: 'other', label: t('person.genderOther') },
                  { value: '', label: t('person.genderUnknown') },
                ]}
              />
              {gender === 'other' && (
                <FormInput
                  label={t('person.specifyGender')}
                  placeholder={t('person.specifyGenderPlaceholder')}
                  value={genderOther}
                  onChangeText={setGenderOther}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={40}
                  style={styles.genderOtherInput}
                />
              )}
            </FormSection>
          )}

          <FormSection title={t('person.relationshipType')}>
            <PillGroup
              value={relationshipType}
              onChange={handleRelationshipChange}
              options={[
                { value: 'friend', label: t('person.friend') },
                { value: 'family', label: t('person.family') },
                { value: 'colleague', label: t('person.colleague') },
                { value: 'acquaintance', label: t('person.acquaintance') },
                { value: 'partner', label: t('person.partner') },
              ]}
            />

            {showLinkedPersonType && (
              <View style={styles.personTypeBlock}>
                <Text style={[fzText.label, styles.personTypeLabel]}>{t('person.personType')}</Text>
                <PillGroup
                  value={personType}
                  onChange={setPersonType}
                  options={[
                    { value: 'primary', label: t('person.primary') },
                    { value: 'mentioned', label: t('person.mentioned') },
                  ]}
                />
                <Text style={[fzText.sub, styles.personTypeDesc]}>
                  {personType === 'primary'
                    ? t('person.personTypePrimaryDesc')
                    : t('person.personTypeMentionedDesc')}
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
              style={styles.inputAboveHint}
            />
            <Text style={[fzText.sub, styles.hintTile]}>{t('person.birthdayHint')}</Text>

            <FormInput
              label={t('person.metDate')}
              placeholder={t('person.metDatePlaceholder')}
              value={metDate}
              onChangeText={setMetDate}
              style={styles.inputAboveHint}
            />
            <Text style={[fzText.sub, styles.hintTile]}>{t('person.metDateHint')}</Text>

            <MetLocationInput value={metLocation} onChangeText={setMetLocation} kind="met" />
            <MetLocationInput value={homeLocation} onChangeText={setHomeLocation} kind="home" />

            <View style={styles.phoneRow}>
              <FormInput
                label={t('person.phone')}
                placeholder={t('person.phonePlaceholder')}
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
                  {t('person.pick')}
                </Button>
              )}
            </View>
            {isContactPickerAvailable() && (
              <Text style={[fzText.sub, styles.hintTight]}>{t('person.contactPickerHint')}</Text>
            )}

            <FormInput
              label={t('person.email')}
              placeholder={t('person.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={254}
              style={styles.lastInput}
            />
          </View>

          {mode === 'edit' && (
            <FormSection title={t('person.personType')} hint={t('person.personTypeHint')}>
              <PillGroup
                value={personType}
                onChange={setPersonType}
                options={[
                  { value: 'primary', label: t('person.primary') },
                  { value: 'mentioned', label: t('person.mentioned') },
                ]}
              />
            </FormSection>
          )}

          {mode === 'edit' && (
            <FormSection title={t('person.importance')} hint={t('person.importanceHint')}>
              <PillGroup
                value={importanceToUser}
                onChange={setImportanceToUser}
                options={[
                  { value: 'very_important', label: t('person.importanceVeryImportant') },
                  { value: 'important', label: t('person.importanceImportant') },
                  { value: 'peripheral', label: t('person.importancePeripheral') },
                  { value: 'unknown', label: t('person.importanceUnknown') },
                ]}
              />
            </FormSection>
          )}

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

          <Foldable title={t('person.brainDumpToggle')}>
            <BrainDumpSection
              personName={brainDumpPersonName || name}
              existing={
                brainDumpContext
                  ? buildExistingState(
                      { metLocation, metDate, homeLocation, phone, email, socialLinks, languages },
                      brainDumpContext
                    )
                  : undefined
              }
              onApply={handleBrainDumpApply}
            />
          </Foldable>

          <Button
            mode="contained"
            onPress={handleSubmitPress}
            loading={submitting}
            disabled={submitting || name.trim().length < 2}
            buttonColor={fz.ink}
            textColor={fz.paper}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={fzText.btn}
          >
            {submitLabel}
          </Button>

          {footer}

          <Button mode="text" onPress={onCancel} disabled={submitting} textColor={fz.textMute}>
            {t('common.cancel')}
          </Button>
        </View>

        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'dark'} />
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
  // ponytail: flat variant — keep the white fill, drop the border/rounding/side padding.
  flatSection: {
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
  },
  personTypeBlock: {
    marginTop: fz.s.lg,
  },
  personTypeLabel: {
    marginTop: 8,
    marginBottom: 8,
  },
  personTypeDesc: {
    marginTop: 8,
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
  hintTight: {
    marginTop: 4,
    marginBottom: fz.s.md,
  },
  genderOtherInput: {
    marginTop: fz.s.md,
    marginBottom: 0,
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
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: fz.rButton,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
