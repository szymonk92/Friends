import { Alert } from 'react-native';

type Opts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => unknown;
};

// FzConfirmHost (mounted in the root layout) registers itself here.
let present: ((opts: Opts) => void) | null = null;
export const registerConfirmHost = (fn: typeof present) => {
  present = fn;
};

/**
 * Two-button "Cancel / <destructive>" confirmation, shown in the FriendZ dialog.
 * Pass the full async handler as onConfirm — success/error toasts stay inside it.
 * Falls back to the native alert if the host isn't mounted yet.
 */
export function confirmDestructive(opts: Opts) {
  if (present) return present(opts);
  Alert.alert(opts.title, opts.message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: opts.confirmLabel ?? 'Delete',
      style: 'destructive',
      onPress: () => {
        void opts.onConfirm();
      },
    },
  ]);
}
