import { useTranslation } from 'react-i18next';
import { AVAILABLE_FONTS, type FontFamily } from '@/store/useSettings';
import { FormSection } from '@/components/FormKit';
import { PillGroup } from '@/components/PillGroup';
import { Text } from 'react-native';
import { fzText } from '@/lib/design/tokens';

interface AppearanceSettingsProps {
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
}

export default function AppearanceSettings({ fontFamily, setFontFamily }: AppearanceSettingsProps) {
  const { t } = useTranslation();
  const options = (Object.keys(AVAILABLE_FONTS) as FontFamily[]).map((f) => ({
    value: f,
    label: f,
  }));
  return (
    <FormSection title={t('settings.appearance')} hint={t('settings.appearanceDescription')}>
      <Text style={[fzText.sub, { marginBottom: 8 }]}>{t('settings.fontFamily')}</Text>
      <PillGroup options={options} value={fontFamily} onChange={setFontFamily} />
    </FormSection>
  );
}
