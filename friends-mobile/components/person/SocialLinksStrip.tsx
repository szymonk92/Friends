import { Linking, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { IconButton } from 'react-native-paper';
import { fz } from '@/lib/design/tokens';
import {
  buildSocialUrl,
  platformIcon,
  platformLabel,
  type SocialLink,
} from '@/lib/social/socialLinks';
import { useTranslation } from 'react-i18next';
import { fzAlert } from '@/lib/utils/confirm';

type Props = {
  links: SocialLink[];
};

export default function SocialLinksStrip({ links }: Props) {
  const { t } = useTranslation();
  if (!links.length) return null;

  const open = async (link: SocialLink) => {
    const url = buildSocialUrl(link);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        fzAlert(platformLabel(link.platform), url);
      }
    } catch {
      fzAlert(t('socialStrip.openFailed'), url);
    }
  };

  const copyHandle = async (link: SocialLink) => {
    await Clipboard.setStringAsync(link.handle);
    fzAlert(t('socialStrip.copied'), t('socialStrip.copiedMessage', { handle: link.handle }));
  };

  return (
    <>
      {links.map((link, idx) => (
        <IconButton
          key={`${link.platform}-${idx}`}
          icon={platformIcon(link.platform)}
          size={18}
          onPress={() => open(link)}
          onLongPress={() => copyHandle(link)}
          accessibilityLabel={`${platformLabel(link.platform)}: ${link.handle}`}
          iconColor={fz.ink}
          style={styles.icon}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    margin: 0,
  },
});
