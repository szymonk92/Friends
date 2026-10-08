import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { fz, fzText } from '@/lib/design/tokens';
import { LineIcon, type LineIconName } from './LineIcon';

export type ActionSheetAction = {
  label: string;
  icon?: LineIconName;
  onPress: () => void;
};

/**
 * Bottom menu for per-item actions (e.g. tapping a tag). Tapping the backdrop or
 * Cancel dismisses it; picking an action closes the sheet first, then runs it.
 */
export function ActionSheet({
  visible,
  title,
  actions,
  onDismiss,
  cancelLabel = 'Cancel',
}: {
  visible: boolean;
  title?: string;
  actions: ActionSheetAction[];
  onDismiss: () => void;
  cancelLabel?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel={cancelLabel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() => {
                onDismiss();
                a.onPress();
              }}
            >
              {a.icon && <LineIcon name={a.icon} size={18} color={fz.ink} />}
              <Text style={fzText.body}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
            onPress={onDismiss}
          >
            <Text style={fzText.btnOutline}>{cancelLabel}</Text>
          </Pressable>
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
    paddingBottom: fz.s.xxl,
    gap: fz.s.xs,
  },
  title: { ...fzText.label, marginBottom: fz.s.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  cancel: {
    height: 48,
    marginTop: fz.s.sm,
    borderRadius: fz.rButton,
    borderWidth: 1,
    borderColor: fz.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
