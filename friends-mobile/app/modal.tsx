import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, View, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Chip } from 'react-native-paper';
import { useState } from 'react';
import { router } from 'expo-router';
import { useCreatePerson } from '@/hooks/usePeople';
import { useTranslation } from 'react-i18next';
import { devLogger } from '@/lib/utils/devLogger';

export default function AddPersonModal() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [personType, setPersonType] = useState<'primary' | 'mentioned'>('primary');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ALWAYS_PRIMARY_RELATIONSHIPS = ['partner', 'friend', 'family'];

  const createPerson = useCreatePerson();

  const parseFlexibleDate = (input: string): Date | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const parts = trimmed.split('-').map((p) => parseInt(p, 10));

    if (parts.length === 1 && parts[0] >= 1900 && parts[0] <= 2100) {
      return new Date(parts[0], 0, 1);
    } else if (parts.length === 2 && parts[0] >= 1900 && parts[1] >= 1 && parts[1] <= 12) {
      return new Date(parts[0], parts[1] - 1, 1);
    } else if (parts.length === 3 && parts[0] >= 1900 && parts[1] >= 1 && parts[2] >= 1) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
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

    setIsSubmitting(true);

    try {
      const parsedBirthday = parseFlexibleDate(dateOfBirth);

      await createPerson.mutateAsync({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        relationshipType: relationshipType as any,
        dateOfBirth: parsedBirthday || undefined,
        notes: notes.trim() || undefined,
        personType: personType,
        dataCompleteness: 'partial',
        addedBy: 'user',
        status: 'active',
      });

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
});
