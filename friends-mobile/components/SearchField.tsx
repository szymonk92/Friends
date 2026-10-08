import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LineIcon } from '@/components/LineIcon';
import { fz } from '@/lib/design/tokens';

/** Pill search field (same look as the Search tab) with a clear button. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  style?: any;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.input, style]}>
      <LineIcon name="search" size={16} color={fz.textMute} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={fz.textMute}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        style={styles.text}
      />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
          <LineIcon name="close" size={14} color={fz.textMute} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 44,
    borderRadius: fz.rPill,
    backgroundColor: fz.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: { flex: 1, fontFamily: fz.font, fontSize: 15, color: fz.ink, padding: 0 },
});
