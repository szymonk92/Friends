import { Stack } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { usePerson } from '@/hooks/usePeople';
import RelationForm from './relation-form';

export default function AddRelationScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);

  return (
    <>
      <Stack.Screen
        options={{
          title: person?.name || 'Add Relation',
        }}
      />
      <RelationForm mode="add" />
    </>
  );
}
