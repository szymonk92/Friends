import { useTranslation } from 'react-i18next';
import { FormSection } from '@/components/FormKit';
import { PillGroup } from '@/components/PillGroup';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' },
];

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();
  return (
    <FormSection title={t('settings.language')}>
      <PillGroup
        options={LANGUAGES}
        value={i18n.language}
        onChange={(code) => i18n.changeLanguage(code)}
      />
    </FormSection>
  );
}
