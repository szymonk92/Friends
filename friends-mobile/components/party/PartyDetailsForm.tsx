import { StyleSheet, View } from 'react-native';
import { fz } from '@/lib/design/tokens';
import { FormSection, FormInput } from '@/components/FormKit';
import { PillGroup } from '@/components/PillGroup';
import { useTranslation } from 'react-i18next';

interface PartyDetailsFormProps {
  name: string;
  setName: (name: string) => void;
  type: 'dinner' | 'party' | 'gathering';
  setType: (type: 'dinner' | 'party' | 'gathering') => void;
  date: string;
  setDate: (date: string) => void;
  location: string;
  setLocation: (location: string) => void;
}

const TYPES = ['dinner', 'party', 'gathering'] as const;

export default function PartyDetailsForm({
  name,
  setName,
  type,
  setType,
  date,
  setDate,
  location,
  setLocation,
}: PartyDetailsFormProps) {
  const { t } = useTranslation();
  return (
    <FormSection title={t('party.details')}>
      <FormInput
        label={t('party.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('party.namePlaceholder')}
      />

      <PillGroup value={type} onChange={setType} options={TYPES.map((value) => ({ value, label: t(`timeline.types.${value}`) }))} style={styles.pillRow} />

      <FormInput
        label={t('party.date')}
        value={date}
        onChangeText={setDate}
        placeholder="2024-12-25"
      />

      <FormInput
        label={t('party.location')}
        value={location}
        onChangeText={setLocation}
        placeholder={t('party.locationPlaceholder')}
        style={styles.lastInput}
      />
    </FormSection>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    marginBottom: fz.s.md,
  },
  lastInput: {
    marginBottom: 0,
  },
});
