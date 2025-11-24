import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import {
  Text,
  Portal,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  useBiometricStatus,
  useSecretsSetupStatus,
  useInitializeSecrets,
  useSecrets,
  useCreateSecret,
  useDecryptSecret,
  useDeleteSecret,
  useInitializeWithPassword,
  usePasswordBasedEncryption,
} from '@/hooks/useSecrets';
import { usePeople } from '@/hooks/usePeople';

import SecretsSetup from '@/components/secrets/SecretsSetup';
import SecretList from '@/components/secrets/SecretList';
import CreateSecretDialog from '@/components/secrets/CreateSecretDialog';
import ViewSecretDialog from '@/components/secrets/ViewSecretDialog';
import PasswordPromptDialog from '@/components/secrets/PasswordPromptDialog';

export default function SecretsScreen() {
  const insets = useSafeAreaInsets();
  const { data: biometricStatus, isLoading: loadingBiometric } = useBiometricStatus();
  const { data: isSetup, isLoading: loadingSetup } = useSecretsSetupStatus();
  const { data: isPasswordBased } = usePasswordBasedEncryption();
  const initializeSecrets = useInitializeSecrets();
  const initializeWithPassword = useInitializeWithPassword();
  const { data: secrets = [], isLoading: loadingSecrets } = useSecrets();
  const { data: people = [] } = usePeople();
  const createSecret = useCreateSecret();
  const decryptSecret = useDecryptSecret();
  const deleteSecret = useDeleteSecret();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPasswordSetupDialog, setShowPasswordSetupDialog] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showPersonMenu, setShowPersonMenu] = useState(false);
  const [newSecretTitle, setNewSecretTitle] = useState('');
  const [newSecretContent, setNewSecretContent] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>(undefined);
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<'create' | 'view' | null>(null);
  const [pendingSecretId, setPendingSecretId] = useState<string | null>(null);
  const [viewedSecret, setViewedSecret] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [remainingTime, setRemainingTime] = useState(60);

  // Security: Auto-clear decrypted secret after 60 seconds
  const secretViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (showViewDialog && viewedSecret) {
      // Reset countdown
      setRemainingTime(60);

      // Clear any existing timers
      if (secretViewTimerRef.current) {
        clearTimeout(secretViewTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      // Set countdown interval
      countdownTimerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set timer to auto-close after 60 seconds
      secretViewTimerRef.current = setTimeout(() => {
        setShowViewDialog(false);
        setViewedSecret(null);
        Alert.alert('Security', 'Secret view closed automatically for security.');
      }, 60000);
    }

    return () => {
      if (secretViewTimerRef.current) {
        clearTimeout(secretViewTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [showViewDialog, viewedSecret]);

  const handleSetup = async () => {
    try {
      await initializeSecrets.mutateAsync();
      Alert.alert('Success', 'Secrets protection has been set up successfully!');
    } catch (error) {
      Alert.alert('Setup Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handlePasswordSetup = async () => {
    if (setupPassword.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    if (setupPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    Alert.alert(
      'IMPORTANT WARNING',
      'You are about to set a password for your secrets.\n\n' +
      '⚠️ IF YOU FORGET THIS PASSWORD, YOUR SECRETS CANNOT BE RECOVERED. ⚠️\n\n' +
      'There is NO password reset option. All encrypted secrets will be permanently lost.\n\n' +
      'Make sure you remember this password or write it down in a safe place.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand, Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              await initializeWithPassword.mutateAsync(setupPassword);
              setShowPasswordSetupDialog(false);
              setSetupPassword('');
              setConfirmPassword('');
              Alert.alert('Success', 'Password-based secrets protection has been set up!');
            } catch (error) {
              Alert.alert('Setup Failed', error instanceof Error ? error.message : 'Unknown error');
            }
          },
        },
      ]
    );
  };

  const handleCreateSecret = async (password?: string) => {
    if (!newSecretTitle.trim() || !newSecretContent.trim()) {
      Alert.alert('Error', 'Please enter both title and content');
      return;
    }

    // If password mode and no password provided, show prompt
    if (isPasswordBased && !password) {
      setPendingAction('create');
      setShowPasswordPrompt(true);
      return;
    }

    try {
      await createSecret.mutateAsync({
        title: newSecretTitle.trim(),
        content: newSecretContent.trim(),
        personId: selectedPersonId,
        password,
      });
      setShowCreateDialog(false);
      setNewSecretTitle('');
      setNewSecretContent('');
      setSelectedPersonId(undefined);
      Alert.alert('Success', 'Secret saved and encrypted!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save secret';
      if (errorMsg === 'Invalid password') {
        Alert.alert('Wrong Password', 'The password you entered is incorrect.');
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const handleViewSecret = async (secretId: string, password?: string) => {
    // If password mode and no password provided, show prompt
    if (isPasswordBased && !password) {
      setPendingAction('view');
      setPendingSecretId(secretId);
      setShowPasswordPrompt(true);
      return;
    }

    try {
      const decrypted = await decryptSecret.mutateAsync({ secretId, password });
      setViewedSecret(decrypted);
      setShowViewDialog(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to decrypt secret';
      if (errorMsg === 'Invalid password') {
        Alert.alert('Wrong Password', 'The password you entered is incorrect.');
      } else {
        Alert.alert('Access Denied', errorMsg);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (!accessPassword) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setShowPasswordPrompt(false);

    if (pendingAction === 'create') {
      await handleCreateSecret(accessPassword);
    } else if (pendingAction === 'view' && pendingSecretId) {
      await handleViewSecret(pendingSecretId, accessPassword);
    }

    setAccessPassword('');
    setPendingAction(null);
    setPendingSecretId(null);
  };

  const handleDeleteSecret = (secretId: string, title: string) => {
    Alert.alert(
      'Delete Secret',
      `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSecret.mutateAsync(secretId);
              Alert.alert('Deleted', 'Secret has been deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete secret');
            }
          },
        },
      ]
    );
  };

  if (loadingBiometric || loadingSetup) {
    return (
      <>
        <Stack.Screen options={{ title: 'Secrets' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Checking device security...</Text>
        </View>
      </>
    );
  }

  // Setup screen if not initialized
  if (!isSetup) {
    return (
      <>
        <Stack.Screen options={{ title: 'Setup Secrets' }} />
        <SecretsSetup
          biometricStatus={biometricStatus}
          initializeSecrets={initializeSecrets}
          initializeWithPassword={initializeWithPassword}
          showPasswordSetupDialog={showPasswordSetupDialog}
          setShowPasswordSetupDialog={setShowPasswordSetupDialog}
          setupPassword={setupPassword}
          setSetupPassword={setSetupPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          handleSetup={handleSetup}
          handlePasswordSetup={handlePasswordSetup}
        />
      </>
    );
  }

  // Main secrets list
  return (
    <>
      <Stack.Screen options={{ title: 'Secrets' }} />
      <SecretList
        secrets={secrets}
        loadingSecrets={loadingSecrets}
        isPasswordBased={!!isPasswordBased}
        biometricStatus={biometricStatus}
        people={people}
        handleViewSecret={(id) => handleViewSecret(id)}
        handleDeleteSecret={handleDeleteSecret}
        setShowCreateDialog={setShowCreateDialog}
        insets={insets}
      />

      <CreateSecretDialog
        visible={showCreateDialog}
        onDismiss={() => setShowCreateDialog(false)}
        newSecretTitle={newSecretTitle}
        setNewSecretTitle={setNewSecretTitle}
        newSecretContent={newSecretContent}
        setNewSecretContent={setNewSecretContent}
        showPersonMenu={showPersonMenu}
        setShowPersonMenu={setShowPersonMenu}
        selectedPersonId={selectedPersonId}
        setSelectedPersonId={setSelectedPersonId}
        people={people}
        isPasswordBased={!!isPasswordBased}
        handleCreateSecret={() => handleCreateSecret()}
        createSecretPending={createSecret.isPending}
      />

      <Portal>
        <ViewSecretDialog
          visible={showViewDialog}
          onDismiss={() => {
            setShowViewDialog(false);
            setViewedSecret(null);
          }}
          viewedSecret={viewedSecret}
          remainingTime={remainingTime}
        />

        <PasswordPromptDialog
          visible={showPasswordPrompt}
          onDismiss={() => {
            setShowPasswordPrompt(false);
            setAccessPassword('');
            setPendingAction(null);
            setPendingSecretId(null);
          }}
          accessPassword={accessPassword}
          setAccessPassword={setAccessPassword}
          pendingAction={pendingAction}
          handlePasswordSubmit={handlePasswordSubmit}
          loading={createSecret.isPending || decryptSecret.isPending}
        />
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
});
