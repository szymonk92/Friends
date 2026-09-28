import { Alert } from 'react-native';

/**
 * Two-button "Cancel / <destructive>" confirmation dialog.
 * Replaces the hand-rolled Alert.alert(..., [{ style: 'cancel' }, { style: 'destructive' }])
 * block repeated across ~15 screens. Pass the full async handler as onConfirm —
 * success/error toasts stay inside it, same as before.
 */
export function confirmDestructive(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => unknown;
}) {
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
