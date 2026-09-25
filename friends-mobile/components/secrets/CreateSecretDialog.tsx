import { StyleSheet } from 'react-native';
import { Dialog, Portal, TextInput, Menu, Button, Text } from 'react-native-paper';
import { fz } from '@/lib/design/tokens';

interface CreateSecretDialogProps {
  visible: boolean;
  onDismiss: () => void;
  newSecretTitle: string;
  setNewSecretTitle: (title: string) => void;
  newSecretContent: string;
  setNewSecretContent: (content: string) => void;
  showPersonMenu: boolean;
  setShowPersonMenu: (show: boolean) => void;
  selectedPersonId: string | undefined;
  setSelectedPersonId: (id: string | undefined) => void;
  people: any[];
  isPasswordBased: boolean;
  handleCreateSecret: () => void;
  createSecretPending: boolean;
}

export default function CreateSecretDialog({
  visible,
  onDismiss,
  newSecretTitle,
  setNewSecretTitle,
  newSecretContent,
  setNewSecretContent,
  showPersonMenu,
  setShowPersonMenu,
  selectedPersonId,
  setSelectedPersonId,
  people,
  isPasswordBased,
  handleCreateSecret,
  createSecretPending,
}: CreateSecretDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>New Secret</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Title"
            value={newSecretTitle}
            onChangeText={setNewSecretTitle}
            mode="outlined"
            style={[styles.input, styles.dialogFont]}
          />
          <TextInput
            label="Secret Content"
            value={newSecretContent}
            onChangeText={setNewSecretContent}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={[styles.input, styles.dialogFont]}
            secureTextEntry
          />
          <Menu
            visible={showPersonMenu}
            onDismiss={() => setShowPersonMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setShowPersonMenu(true)}
                style={styles.personSelector}
                labelStyle={styles.dialogFont}
                icon="account"
              >
                {selectedPersonId
                  ? people.find((p) => p.id === selectedPersonId)?.name || 'Select Person'
                  : 'Associate with Person (Optional)'}
              </Button>
            }
          >
            <Menu.Item
              onPress={() => {
                setSelectedPersonId(undefined);
                setShowPersonMenu(false);
              }}
              title="No Association"
            />
            {people.map((person) => (
              <Menu.Item
                key={person.id}
                onPress={() => {
                  setSelectedPersonId(person.id);
                  setShowPersonMenu(false);
                }}
                title={person.name}
              />
            ))}
          </Menu>
          <Text variant="bodySmall" style={[styles.dialogHint, styles.dialogFont]}>
            Content will be encrypted with your {isPasswordBased ? 'password' : 'biometric key'}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button labelStyle={styles.dialogFont} onPress={onDismiss}>
            Cancel
          </Button>
          <Button
            labelStyle={styles.dialogFont}
            onPress={handleCreateSecret}
            loading={createSecretPending}
            disabled={createSecretPending}
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
  },
  input: {
    marginBottom: 12,
  },
  personSelector: {
    marginBottom: 12,
  },
  dialogHint: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
