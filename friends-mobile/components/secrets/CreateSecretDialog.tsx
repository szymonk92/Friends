import { StyleSheet } from 'react-native';
import { Dialog, Portal, TextInput, Menu, Button, Text } from 'react-native-paper';

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
            <Dialog visible={visible} onDismiss={onDismiss}>
                <Dialog.Title>New Secret</Dialog.Title>
                <Dialog.Content>
                    <TextInput
                        label="Title"
                        value={newSecretTitle}
                        onChangeText={setNewSecretTitle}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Secret Content"
                        value={newSecretContent}
                        onChangeText={setNewSecretContent}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.input}
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
                    <Text variant="bodySmall" style={styles.dialogHint}>
                        Content will be encrypted with your {isPasswordBased ? 'password' : 'biometric key'}
                    </Text>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>Cancel</Button>
                    <Button
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
