import { Link } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { StyleSheet, Text } from 'react-native';

import CenteredContainer from '@/components/CenteredContainer';
import { fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <AppBar title={t('notFound.title')} />
      <CenteredContainer style={styles.container}>
        <Text style={fzText.title}>{t('notFound.message')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.link')}</Text>
        </Link>
      </CenteredContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
