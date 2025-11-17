import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { usePerson, useUpdatePerson } from '@/hooks/usePeople';

export default function EditPersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person, isLoading } = usePerson(personId!);
  const updatePerson = useUpdatePerson();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');
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
      setNotes(person.notes || '');
    }
  }, [person]);

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

    setIsSubmitting(true);

    try {
      const parsedBirthday = parseFlexibleDate(dateOfBirth);

      await updatePerson.mutateAsync({
        id: personId!,
        name: name.trim(),
        nickname: nickname.trim() || null,
        relationshipType: relationshipType as any,
        dateOfBirth: parsedBirthday || undefined,
        notes: notes.trim() || null,
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
        Alert.alert(
          'Duplicate Name',
          errorMessage,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to update person. Please try again.');
      }
      console.error('Update person error:', error);
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Edit Person
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Update information for {person.name}
        </Text>

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
});
