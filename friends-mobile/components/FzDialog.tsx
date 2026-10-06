import { useState, useCallback, useEffect, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { fz, fzText } from '@/lib/design/tokens';
import { registerConfirmHost } from '@/lib/utils/confirm';

type Button = { text: string; onPress?: () => void };
type Notice = { title: string; message?: string; buttons: Button[] };

/**
 * Drop-in for Alert.alert in the FriendZ look: `const { alert, dialog } = useFzAlert()`,
 * call `alert(title, message, buttons)`, render `{dialog}` once.
 * First button is the filled primary action, the rest are outlined. Buttons stack
 * so 3 long labels ("Add Different Type") never get truncated.
 */
export function useFzAlert(): {
  alert: (title: string, message?: string, buttons?: Button[]) => void;
  dialog: ReactElement;
} {
  const [notice, setNotice] = useState<Notice | null>(null);
  const alert = useCallback(
    (title: string, message?: string, buttons: Button[] = [{ text: 'OK' }]) =>
      setNotice({ title, message, buttons }),
    []
  );
  const close = () => setNotice(null);

  const dialog = (
    <Portal>
      <Dialog visible={!!notice} onDismiss={close} style={styles.dialog}>
        <View style={styles.body}>
          <Text style={styles.title}>{notice?.title}</Text>
          {notice?.message ? <Text style={styles.message}>{notice.message}</Text> : null}
          <View style={styles.actions}>
            {notice?.buttons.map((b, i) => (
              <Pressable
                key={b.text}
                accessibilityRole="button"
                onPress={() => {
                  close();
                  b.onPress?.();
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
        </View>
      </Dialog>
    </Portal>
  );

  return { alert, dialog };
}

/** Mount once in the root layout: renders confirmDestructive() in the FriendZ dialog. */
export function FzConfirmHost() {
  const { alert, dialog } = useFzAlert();
  useEffect(() => {
    registerConfirmHost((o) =>
      alert(o.title, o.message, [
        { text: o.confirmLabel ?? 'Delete', onPress: () => void o.onConfirm() },
        { text: 'Cancel' },
      ])
    );
    return () => registerConfirmHost(null);
  }, [alert]);
  return dialog;
}

const styles = StyleSheet.create({
  dialog: { borderRadius: fz.rCard, backgroundColor: fz.card },
  body: { padding: fz.s.xxl, gap: fz.s.md },
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
