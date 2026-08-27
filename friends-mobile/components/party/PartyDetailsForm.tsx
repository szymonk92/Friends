import { StyleSheet, View } from 'react-native';
import { fz } from '@/lib/design/tokens';
import { FormSection, FormInput } from '@/components/FormKit';
import { PillGroup } from '@/components/PillGroup';

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

const TYPES: Array<{ value: 'dinner' | 'party' | 'gathering'; label: string }> = [
  { value: 'dinner', label: 'Dinner' },
  { value: 'party', label: 'Party' },
  { value: 'gathering', label: 'Gathering' },
];

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
  return (
    <FormSection title="Party Details">
      <FormInput
        label="Party Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g., Summer BBQ, Birthday Dinner"
      />

      <PillGroup value={type} onChange={setType} options={TYPES} style={styles.pillRow} />

      <FormInput
        label="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        placeholder="2024-12-25"
      />

      <FormInput
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g., My place, Restaurant name"
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
