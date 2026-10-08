import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, StatusBar, Text as RNText } from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { fz, fzText } from '@/lib/design/tokens';
import { HeaderBack } from '@/components/HeaderBack';
import { IconCircle } from '@/components/IconCircle';
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
import { useTranslation } from 'react-i18next';

export default function SecretsScreen() {
  const { t } = useTranslation();
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
        fzAlert(t('secrets.securityTitle'), t('secrets.autoClosed'));
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
      fzAlert(t('common.success'), t('secrets.setupDone'));
    } catch (error) {
      fzAlert(t('secrets.setupFailed'), error instanceof Error ? error.message : t('common.unknownError'));
    }
  };

  const handlePasswordSetup = async () => {
    if (setupPassword.length < 8) {
      fzAlert(t('secrets.weakTitle'), t('secrets.weakMessage'));
      return;
    }

    if (setupPassword !== confirmPassword) {
      fzAlert(t('secrets.mismatchTitle'), t('secrets.mismatchMessage'));
      return;
    }

    fzAlert(
      t('secrets.importantTitle'),
      t('secrets.importantMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('secrets.understand'),
          style: 'destructive',
          onPress: async () => {
            try {
              await initializeWithPassword.mutateAsync(setupPassword);
              setShowPasswordSetupDialog(false);
              setSetupPassword('');
              setConfirmPassword('');
              fzAlert(t('common.success'), t('secrets.passwordSetupDone'));
            } catch (error) {
              fzAlert(t('secrets.setupFailed'), error instanceof Error ? error.message : t('common.unknownError'));
            }
          },
        },
      ]
    );
  };

  const handleCreateSecret = async (password?: string) => {
    if (!newSecretTitle.trim() || !newSecretContent.trim()) {
      fzAlert(t('common.error'), t('secrets.needBoth'));
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
      fzAlert(t('common.success'), t('secrets.saved'));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('secrets.saveFailed');
      if (errorMsg === 'Invalid password') {
        fzAlert(t('secrets.wrongTitle'), t('secrets.wrongMessage'));
      } else {
        fzAlert(t('common.error'), errorMsg);
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
      const errorMsg = error instanceof Error ? error.message : t('secrets.decryptFailed');
      if (errorMsg === 'Invalid password') {
        fzAlert(t('secrets.wrongTitle'), t('secrets.wrongMessage'));
      } else {
        fzAlert(t('secrets.accessDenied'), errorMsg);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (!accessPassword) {
      fzAlert(t('common.error'), t('secrets.enterPasswordMsg'));
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
    confirmDestructive({
      title: t('secrets.deleteTitle'),
      message: t('secrets.deleteMessage', { title }),
      onConfirm: async () => {
        try {
          await deleteSecret.mutateAsync(secretId);
          fzAlert(t('secrets.deletedTitle'), t('secrets.deleted'));
        } catch (error) {
          fzAlert(t('common.error'), t('secrets.deleteFailed'));
        }
      },
    });
  };

  const AppBar = ({ title, onAdd }: { title: string; onAdd?: () => void }) => (
    <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.appBarRow}>
        <HeaderBack onPress={() => router.back()} />
        <RNText style={fzText.screenTitle}>{title}</RNText>
        {onAdd ? (
          <IconCircle icon="plus" onPress={onAdd} />
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>
    </View>
  );

  if (loadingBiometric || loadingSetup) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar title={t('secrets.screenTitle')} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
          <RNText style={[fzText.sub, { marginTop: 12 }]}>{t('secrets.checking')}</RNText>
        </View>
      </View>
    );
  }

  // Setup screen if not initialized
  if (!isSetup) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar title={t('secrets.setupScreenTitle')} />
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
      </View>
    );
  }

  // Main secrets list
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
      <AppBar title={t('secrets.screenTitle')} onAdd={() => setShowCreateDialog(true)} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  appBar: { backgroundColor: fz.paper, paddingBottom: fz.s.sm },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
    paddingBottom: fz.s.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
