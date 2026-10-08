import { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Portal, Dialog, Button, Text, RadioButton, Avatar, List } from 'react-native-paper';
import { fz } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      <Dialog visible={visible} onDismiss={onCancel} style={[styles.dialog, styles.dialogShape]}>
        <Dialog.Title style={styles.dialogTitle}>
          {t('ambiguity.title', { name: currentMatch.nameInStory })}
        </Dialog.Title>
        <Dialog.Content>
          <Text style={[styles.helperText, styles.dialogFont]}>
            {t('ambiguity.helper', { name: currentMatch.nameInStory })}
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
                  description={t('ambiguity.existing')}
                  left={() => <RadioButton value={match.id} />}
                  onPress={() => handleSelect(match.id)}
                  style={styles.optionItem}
                />
              ))}

              {/* Create New Option */}
              <List.Item
                title={t('ambiguity.createNew', { name: currentMatch.nameInStory })}
                description={t('ambiguity.addAsNew')}
                left={() => <RadioButton value="NEW" />}
                onPress={() => handleSelect('NEW')}
                style={styles.optionItem}
              />

              {/* Ignore Option */}
              <List.Item
                title={t('ambiguity.ignore')}
                description={t('ambiguity.skip')}
                left={() => <RadioButton value="IGNORE" />}
                onPress={() => handleSelect('IGNORE')}
                style={styles.optionItem}
              />
            </ScrollView>
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <Button labelStyle={styles.dialogFont} onPress={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            labelStyle={styles.dialogFont}
            mode="contained"
            onPress={handleNext}
            disabled={!resolutions[currentMatch.nameInStory]}
          >
            {currentIndex < ambiguousMatches.length - 1 ? t('ambiguity.next') : t('ambiguity.confirm')}
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
  dialogShape: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
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
