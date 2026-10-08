import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fz, fzText } from '@/lib/design/tokens';
import { LineIcon, type LineIconName } from './LineIcon';

export type ActionSheetAction = {
  label: string;
  icon?: LineIconName;
  onPress: () => void;
  /** Hairline above this row, to separate groups of actions. */
  divider?: boolean;
  /** Greyed out and not tappable (e.g. "Set as profile" on the current profile photo). */
  disabled?: boolean;
};

/**
 * Bottom menu for per-item actions (e.g. tapping a tag). Tapping the backdrop
 * dismisses it; picking an action closes the sheet first, then runs it.
 */
export function ActionSheet({
  visible,
  title,
  message,
  actions,
  onDismiss,
  cancelLabel,
}: {
  visible: boolean;
  title?: string;
  /** Muted detail under the title (e.g. a gift's occasion and notes). */
  message?: string | null;
  actions: ActionSheetAction[];
  onDismiss: () => void;
  cancelLabel?: string;
}) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const cancel = cancelLabel ?? t('common.cancel');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel={cancel}>
        <Pressable style={[styles.sheet, { paddingBottom: fz.s.xl + bottom }]} onPress={() => {}}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!a.disabled }}
              disabled={a.disabled}
              style={({ pressed }) => [
                styles.row,
                a.divider && styles.divider,
                pressed && { opacity: 0.7 },
                a.disabled && { opacity: 0.4 },
              ]}
              onPress={() => {
                onDismiss();
                a.onPress();
              }}
            >
              {a.icon && <LineIcon name={a.icon} size={18} color={fz.ink} />}
              <Text style={fzText.body}>{a.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: fz.card,
    borderTopLeftRadius: fz.rCard,
    borderTopRightRadius: fz.rCard,
    paddingHorizontal: fz.s.edge,
    paddingTop: fz.s.xl,
    gap: fz.s.xs,
  },
  title: { ...fzText.label, marginBottom: fz.s.sm },
  message: { ...fzText.sub, marginBottom: fz.s.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: fz.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
});
