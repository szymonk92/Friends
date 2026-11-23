import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, StatusBar, AppState, Text as RNText } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { lockSession, unlockSession } from '@/lib/crypto/biometric-secrets';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { fz, fzText } from '@/lib/design/tokens';
import { AppBar } from '@/components/AppBar';
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
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timers must not restart on language change
  }, [showViewDialog, viewedSecret]);

  const lock = useCallback(() => {
    lockSession();
    setUnlocked(false);
    setShowViewDialog(false);
    setViewedSecret(null);
    setShowCreateDialog(false);
  }, []);

  // Lock when leaving the screen or sending the app to the background.
  useFocusEffect(useCallback(() => lock, [lock]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') lock(); // not 'inactive': Face ID prompt triggers it
    });
    return () => sub.remove();
  }, [lock]);

  const handleUnlock = async (password?: string) => {
    if (isPasswordBased && !password) {
      setShowPasswordPrompt(true);
      return;
    }
    setUnlocking(true);
    const ok = await unlockSession(password);
    setUnlocking(false);
    if (ok) {
      setUnlocked(true);
    } else if (password) {
      fzAlert(t('secrets.wrongTitle'), t('secrets.wrongMessage'));
    }
  };

  // Unlock automatically on entry (biometric prompt; password mode shows the dialog).
  useEffect(() => {
    if (isSetup && !unlocked && isPasswordBased !== undefined && !unlocking) {
      void handleUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when setup/mode is known or after a lock
  }, [isSetup, isPasswordBased, unlocked]);

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

  const handleCreateSecret = async () => {
    if (!newSecretTitle.trim() || !newSecretContent.trim()) {
      fzAlert(t('common.error'), t('secrets.needBoth'));
      return;
    }

    try {
      await createSecret.mutateAsync({
        title: newSecretTitle.trim(),
        content: newSecretContent.trim(),
        personId: selectedPersonId,
      });
      setShowCreateDialog(false);
      setNewSecretTitle('');
      setNewSecretContent('');
      setSelectedPersonId(undefined);
      fzAlert(t('common.success'), t('secrets.saved'));
    } catch (error) {
      fzAlert(t('common.error'), error instanceof Error ? error.message : t('secrets.saveFailed'));
    }
  };

  const handleViewSecret = async (secretId: string) => {
    try {
      const decrypted = await decryptSecret.mutateAsync({ secretId });
      setViewedSecret(decrypted);
      setShowViewDialog(true);
    } catch (error) {
      fzAlert(t('secrets.accessDenied'), error instanceof Error ? error.message : t('secrets.decryptFailed'));
    }
  };

  const handlePasswordSubmit = async () => {
    if (!accessPassword) {
      fzAlert(t('common.error'), t('secrets.enterPasswordMsg'));
      return;
    }
    const pw = accessPassword;
    setShowPasswordPrompt(false);
    setAccessPassword('');
    await handleUnlock(pw);
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

  if (loadingBiometric || loadingSetup) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
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
        <StatusBar barStyle="dark-content" />
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

  if (!unlocked) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <AppBar title={t('secrets.screenTitle')} />
        <View style={styles.centered}>
          {unlocking ? (
            <ActivityIndicator size="large" color={fz.ink} />
          ) : (
            <>
              <RNText style={[fzText.title, { marginBottom: 16 }]}>{t('secrets.locked')}</RNText>
              <PrimaryButton label={t('secrets.unlock')} onPress={() => handleUnlock()} />
            </>
          )}
        </View>
        <Portal>
          <PasswordPromptDialog
            visible={showPasswordPrompt}
            onDismiss={() => {
              setShowPasswordPrompt(false);
              setAccessPassword('');
            }}
            accessPassword={accessPassword}
            setAccessPassword={setAccessPassword}
            handlePasswordSubmit={handlePasswordSubmit}
            loading={unlocking}
          />
        </Portal>
      </View>
    );
  }

  // Main secrets list
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AppBar
        title={t('secrets.screenTitle')}
        right={<IconCircle icon="plus" onPress={() => setShowCreateDialog(true)} />}
      />
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
        handleCreateSecret={handleCreateSecret}
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
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
