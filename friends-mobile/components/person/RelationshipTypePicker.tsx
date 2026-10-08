import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Pill } from '@/components/Pill';
import { relationshipTypeLabel } from '@/lib/i18n/labels';
import { fzText } from '@/lib/design/tokens';
import {
  RELATIONSHIP_TOP_LEVEL,
  FAMILY_SUBTYPES,
  FAMILY_SUBTYPE_VALUES,
} from '@/lib/constants/relations';
import { useTranslation } from 'react-i18next';

const FAMILY_VALUES: readonly string[] = ['family', ...FAMILY_SUBTYPE_VALUES];

/**
 * Relationship-type pills. `family` is a wrapper: Parent / Child / Sibling only
 * show once Family is selected, and stay optional (plain "Family" is valid).
 */
export function RelationshipTypePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const familyOpen = FAMILY_VALUES.includes(value);
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.row}>
        {RELATIONSHIP_TOP_LEVEL.map((type) => (
          <Pill
            key={type.value}
            label={relationshipTypeLabel(type.value, type.label)}
            selected={type.value === 'family' ? familyOpen : value === type.value}
            onPress={() => onChange(type.value)}
          />
        ))}
      </View>

      {familyOpen && (
        <>
          <Text style={[fzText.sub, styles.hint]}>{t('relationshipPicker.specify')}</Text>
          <View style={styles.row}>
            <Pill label={relationshipTypeLabel('family', 'Family')} selected={value === 'family'} onPress={() => onChange('family')} />
            {FAMILY_SUBTYPES.map((type) => (
              <Pill
                key={type.value}
                label={relationshipTypeLabel(type.value, type.label)}
                selected={value === type.value}
                onPress={() => onChange(type.value)}
              />
            ))}
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  hint: { marginTop: 10 },
});
