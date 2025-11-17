import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { useState } from 'react';
import { router } from 'expo-router';
import { useCreatePerson } from '@/hooks/usePeople';
import { relationshipTypeEnum } from '@/lib/validation/schemas';

export default function AddPersonModal() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter a name with at least 2 characters');
      return;
    }

    if (name.trim().length > 255) {
      Alert.alert('Name Too Long', 'Name must be 255 characters or less');
      return;
    }

    if (nickname.trim().length > 255) {
      Alert.alert('Nickname Too Long', 'Nickname must be 255 characters or less');
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
        personType: 'primary',
        dataCompleteness: 'partial',
        addedBy: 'user',
        status: 'active',
      });

      Alert.alert('Success', `${name} has been added!`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('already exists')) {
        Alert.alert(
          'Duplicate Name',
          errorMessage,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to add person. Please try again.');
      }
      console.error('Create person error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Add a Person
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Manually add someone to your network
        </Text>

        <TextInput
          mode="outlined"
          label="Name *"
          placeholder="Enter their name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoFocus
          maxLength={255}
        />

        <TextInput
          mode="outlined"
          label="Nickname"
          placeholder="Optional nickname"
          value={nickname}
          onChangeText={setNickname}
          style={styles.input}
          maxLength={255}
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
          label="Birthday (optional)"
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
          Add Person
        </Button>

        <Button mode="text" onPress={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
      </View>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </ScrollView>
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
