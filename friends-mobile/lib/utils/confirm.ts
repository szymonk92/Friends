import { tr } from '@/lib/i18n/labels';
import { Alert } from 'react-native';

export type AlertButton = {
  text: string;
  onPress?: () => unknown;
  style?: 'default' | 'cancel' | 'destructive';
};
type Present = (title: string, message?: string, buttons?: AlertButton[]) => void;

// FzConfirmHost (mounted in the root layout) registers itself here.
let present: Present | null = null;
export const registerAlertHost = (fn: Present | null) => {
  present = fn;
};

/**
 * Drop-in for Alert.alert, rendered in the FriendZ dialog.
 * Falls back to the native alert if the host isn't mounted yet.
 */
export function fzAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (present) return present(title, message, buttons);
  Alert.alert(title, message, buttons as Parameters<typeof Alert.alert>[2]);
}

type Opts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => unknown;
};

/**
 * Two-button "Cancel / <destructive>" confirmation, shown in the FriendZ dialog.
 * Pass the full async handler as onConfirm — success/error toasts stay inside it.
 */
export function confirmDestructive(opts: Opts) {
  fzAlert(opts.title, opts.message, [
    { text: tr('common.cancel', 'Cancel'), style: 'cancel' },
    {
      text: opts.confirmLabel ?? tr('common.delete', 'Delete'),
      style: 'destructive',
      onPress: () => {
        void opts.onConfirm();
      },
    },
  ]);
}
