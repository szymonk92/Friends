import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillGroup } from '@/components/PillGroup';
import { IconCircle } from '@/components/IconCircle';
import { fz, fzText } from '@/lib/design/tokens';
import { flexibleDateText, type DatePrecision } from '@/lib/utils/dates';

type Precision = DatePrecision;

const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate(); // m is 1-based

/**
 * Inline date picker that can stop at year or year+month. Reads/writes the
 * "YYYY" | "YYYY-MM" | "YYYY-MM-DD" strings parseFlexibleDate accepts.
 */
export function FlexibleDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const [y0, m0, d0] = value.split('-').map((p) => parseInt(p, 10));
  const year = Number.isNaN(y0) || !y0 ? now.getFullYear() : y0;
  const month = m0 || null;
  const day = d0 || null;
  const precision: Precision = day ? 'day' : month ? 'month' : 'year';
  // Year typed in progress; committed on valid 4 digits.
  const [yearDraft, setYearDraft] = useState<string | null>(null);

  const emit = (y: number, m: number | null, d: number | null, p: Precision = precision) =>
    onChange(flexibleDateText(y, m, d, p));

  const lang = i18n.language;
  const monthName = (m: number, style: 'short' | 'long') =>
    new Date(2000, m - 1, 1).toLocaleDateString(lang, { month: style });
  // Monday-first weekday initials (2024-01-01 was a Monday).
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(lang, { weekday: 'narrow' })
  );

  const summary =
    precision === 'day'
      ? new Date(year, month! - 1, day!).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
      : precision === 'month'
        ? `${monthName(month!, 'long')} ${year}`
        : String(year);

  const commitYear = (text: string) => {
    setYearDraft(text.replace(/\D/g, '').slice(0, 4));
    const n = parseInt(text, 10);
    if (text.length === 4 && n >= 1900 && n <= 2100) {
      setYearDraft(null);
      emit(n, month, day);
    }
  };

  return (
    <View>
      <PillGroup
        options={[
          { value: 'day', label: t('dates.precisionDay') },
          { value: 'month', label: t('dates.precisionMonth') },
          { value: 'year', label: t('dates.precisionYear') },
        ]}
        value={precision}
        onChange={(p) => emit(year, month, day, p)}
      />

      <Text style={[fzText.name, styles.summary]}>{summary}</Text>

      <View style={styles.yearRow}>
        <IconCircle icon="back" fill={fz.surface} onPress={() => year > 1900 && emit(year - 1, month, day)} />
        <TextInput
          value={yearDraft ?? String(year)}
          onChangeText={commitYear}
          onBlur={() => setYearDraft(null)}
          keyboardType="number-pad"
          maxLength={4}
          selectTextOnFocus
          style={styles.yearInput}
          accessibilityLabel={t('dates.precisionYear')}
        />
        <IconCircle
          icon="back"
          fill={fz.surface}
          style={styles.flip}
          onPress={() => year < 2100 && emit(year + 1, month, day)}
        />
      </View>

      {precision !== 'year' && (
        <View style={styles.grid}>
          {chunk(Array.from({ length: 12 }, (_, i) => i + 1), 4).map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((m) => (
                <Cell key={m} label={monthName(m!, 'short')} selected={m === month} wide onPress={() => emit(year, m, day)} />
              ))}
            </View>
          ))}
        </View>
      )}

      {precision === 'day' && month && (
        <View style={[styles.grid, styles.calendar]}>
          <View style={styles.row}>
            {weekdays.map((w, i) => (
              <Text key={i} style={[fzText.time, styles.weekday]}>
                {w}
              </Text>
            ))}
          </View>
          {/* Leading nulls so day 1 lands on its weekday (Monday-first). */}
          {chunk(
            [
              ...Array<null>((new Date(year, month - 1, 1).getDay() + 6) % 7).fill(null),
              ...Array.from({ length: daysIn(year, month) }, (_, i) => i + 1),
            ],
            7
          ).map((week, r) => (
            <View key={r} style={styles.row}>
              {week.map((d, i) =>
                d === null ? (
                  <View key={`b${i}`} style={styles.cell} />
                ) : (
                  <Cell key={d} label={String(d)} selected={d === day} onPress={() => emit(year, month, d)} />
                )
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Cell({
  label,
  selected,
  wide,
  onPress,
}: {
  label: string;
  selected: boolean;
  wide?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={styles.cell}>
      <View style={[wide ? styles.monthMark : styles.dayMark, selected && styles.markOn]}>
        <Text style={selected ? fzText.chipOn : fzText.chip}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Split into rows of `size`, padding the last row with nulls so columns stay aligned. */
function chunk<T>(items: T[], size: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += size) {
    const row: (T | null)[] = items.slice(i, i + size);
    while (row.length < size) row.push(null);
    rows.push(row);
  }
  return rows;
}

const styles = StyleSheet.create({
  summary: { marginTop: fz.s.lg },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: fz.s.md,
  },
  yearInput: {
    ...fzText.title,
    flex: 1,
    textAlign: 'center',
    padding: 0,
  },
  flip: { transform: [{ rotate: '180deg' }] },
  grid: { marginTop: fz.s.md, gap: 4 },
  calendar: { borderTopWidth: 1, borderTopColor: fz.hairline, paddingTop: fz.s.sm },
  row: { flexDirection: 'row' },
  // Equal flex columns; the highlight is a fixed shape centred in each cell.
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monthMark: {
    height: 36,
    alignSelf: 'stretch',
    marginHorizontal: 3,
    borderRadius: fz.rPill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markOn: { backgroundColor: fz.ink },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 4 },
});
