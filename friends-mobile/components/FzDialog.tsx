import { tr } from '@/lib/i18n/labels';
import { useState, useCallback, useEffect, type ReactElement } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fz, fzText } from '@/lib/design/tokens';
import { registerAlertHost, type AlertButton } from '@/lib/utils/confirm';

type Notice = { title: string; message?: string; buttons: AlertButton[] };

/**
 * Alert.alert in the FriendZ look: `const { alert, dialog } = useFzAlert()`,
 * call `alert(title, message, buttons)`, render `{dialog}` once.
 * First non-cancel button is the filled primary action, the rest are outlined,
 * cancel-style buttons go last. Buttons stack so long labels never truncate.
 * Uses an RN Modal (not a Paper Portal) so it stacks above other open Modals.
 */
export function useFzAlert(): {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
  dialog: ReactElement;
} {
  const [notice, setNotice] = useState<Notice | null>(null);
  const alert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) =>
      setNotice({
        title,
        message,
        buttons: buttons?.length
          ? [...buttons.filter((b) => b.style !== 'cancel'), ...buttons.filter((b) => b.style === 'cancel')]
          : [{ text: tr('common.ok', 'OK') }],
      }),
    []
  );
  const close = () => setNotice(null);

  const dialog = (
    <Modal visible={!!notice} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        {/* Inner Pressable swallows taps so only the backdrop dismisses. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{notice?.title}</Text>
          {notice?.message ? <Text style={styles.message}>{notice.message}</Text> : null}
          <View style={styles.actions}>
            {notice?.buttons.map((b, i) => (
              <Pressable
                key={`${i}-${b.text}`}
                accessibilityRole="button"
                onPress={() => {
                  close();
                  void b.onPress?.();
                }}
                style={({ pressed }) => [
                  styles.btn,
                  i === 0 ? styles.btnPrimary : styles.btnOutline,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={i === 0 ? fzText.btn : fzText.btnOutline}>{b.text}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { alert, dialog };
}

/** Mount once in the root layout: renders fzAlert() / confirmDestructive() in the FriendZ dialog. */
export function FzConfirmHost() {
  const { alert, dialog } = useFzAlert();
  useEffect(() => {
    registerAlertHost(alert);
    return () => registerAlertHost(null);
  }, [alert]);
  return dialog;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27,24,21,0.4)',
    justifyContent: 'center',
    padding: fz.s.edge,
  },
  card: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
    padding: fz.s.xxl,
    gap: fz.s.md,
  },
  title: fzText.title,
  message: fzText.body,
  actions: { gap: fz.s.sm, marginTop: fz.s.md },
  btn: {
    height: 48,
    borderRadius: fz.rButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: fz.ink },
  btnOutline: { borderWidth: 1, borderColor: fz.outline, backgroundColor: fz.card },
});
