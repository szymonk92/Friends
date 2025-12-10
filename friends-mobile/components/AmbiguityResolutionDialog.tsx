import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Portal, Dialog, Button, Text, RadioButton, Avatar, List } from 'react-native-paper';

interface AmbiguityMatch {
  nameInStory: string;
  possibleMatches: Array<{ id: string; name: string; reason: string }>;
}

interface AmbiguityResolutionDialogProps {
  visible: boolean;
  ambiguousMatches: AmbiguityMatch[];
  onResolve: (resolutions: { [name: string]: string | 'NEW' | 'IGNORE' }) => void;
  onCancel: () => void;
}

export default function AmbiguityResolutionDialog({
  visible,
  ambiguousMatches,
  onResolve,
  onCancel,
}: AmbiguityResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<{ [name: string]: string | 'NEW' | 'IGNORE' }>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentMatch = ambiguousMatches[currentIndex];

  const handleSelect = (value: string) => {
    setResolutions({
      ...resolutions,
      [currentMatch.nameInStory]: value,
    });
  };

  const handleNext = () => {
    if (currentIndex < ambiguousMatches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onResolve(resolutions);
      // Reset for next time
      setCurrentIndex(0);
      setResolutions({});
    }
  };

  if (!currentMatch) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
        <Dialog.Title>Who is "{currentMatch.nameInStory}"?</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.helperText}>
            The AI is not sure which "{currentMatch.nameInStory}" you are referring to.
          </Text>

          <RadioButton.Group
            onValueChange={handleSelect}
            value={resolutions[currentMatch.nameInStory] || ''}
          >
            <ScrollView style={styles.optionsList}>
              {/* Existing Matches */}
              {currentMatch.possibleMatches.map((match) => (
                <List.Item
                  key={match.id}
                  title={match.name}
                  description="Existing Contact"
                  left={() => <RadioButton value={match.id} />}
                  onPress={() => handleSelect(match.id)}
                  style={styles.optionItem}
                />
              ))}

              {/* Create New Option */}
              <List.Item
                title={`Create new "${currentMatch.nameInStory}"`}
                description="Add as a new person"
                left={() => <RadioButton value="NEW" />}
                onPress={() => handleSelect('NEW')}
                style={styles.optionItem}
              />

              {/* Ignore Option */}
              <List.Item
                title="Ignore / Not a person"
                description="Skip this name"
                left={() => <RadioButton value="IGNORE" />}
                onPress={() => handleSelect('IGNORE')}
                style={styles.optionItem}
              />
            </ScrollView>
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={!resolutions[currentMatch.nameInStory]}
          >
            {currentIndex < ambiguousMatches.length - 1 ? 'Next' : 'Confirm'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  helperText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: 4,
  },
});
