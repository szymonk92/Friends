import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Menu, Text } from 'react-native-paper';
import { useState } from 'react';
import {
  parseSocialInput,
  platformIcon,
  platformLabel,
  SOCIAL_PLATFORMS,
  type SocialLink,
  type SocialPlatform,
} from '@/lib/social/socialLinks';
import { fz, fzText } from '@/lib/design/tokens';
import { FormInput } from '@/components/FormKit';

type Props = {
  value: SocialLink[];
  onChange: (next: SocialLink[]) => void;
};

export default function SocialLinksEditor({ value, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const addLink = (platform: SocialPlatform) => {
    onChange([...value, { platform, handle: '' }]);
    setPickerOpen(false);
  };

  const updateLink = (index: number, patch: Partial<SocialLink>) => {
    onChange(value.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const removeLink = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleHandleChange = (index: number, raw: string) => {
    const link = value[index];
    // If user pastes a URL, normalise it and (optionally) flip the platform
    if (/^https?:\/\//i.test(raw.trim())) {
      const parsed = parseSocialInput(raw, link.platform);
      updateLink(index, {
        handle: parsed.handle,
        url: parsed.url,
        platform: parsed.platform ?? link.platform,
      });
      return;
    }
    updateLink(index, { handle: raw, url: undefined });
  };

  return (
    <View style={styles.container}>
      <Text style={fzText.label}>Social handles</Text>
      <Text style={[fzText.sub, styles.hint]}>Paste a profile URL or just type a handle.</Text>

      {value.map((link, index) => (
        <View key={index} style={styles.row}>
          <IconButton icon={platformIcon(link.platform)} size={20} iconColor={fz.ink} style={styles.platformIcon} />
          <View style={styles.input}>
            <FormInput
              dense
              label={platformLabel(link.platform)}
              placeholder="@handle or full URL"
              value={link.handle}
              onChangeText={(t) => handleHandleChange(index, t)}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={500}
              style={styles.textInput}
            />
          </View>
          <IconButton icon="close" size={18} iconColor={fz.textMute} onPress={() => removeLink(index)} />
        </View>
      ))}

      <Menu
        visible={pickerOpen}
        onDismiss={() => setPickerOpen(false)}
        anchor={
          <Button
            mode="outlined"
            icon="plus"
            onPress={() => setPickerOpen(true)}
            style={styles.addButton}
            textColor={fz.ink}
            compact
          >
            Add social
          </Button>
        }
      >
        {SOCIAL_PLATFORMS.map((p) => (
          <Menu.Item
            key={p}
            leadingIcon={platformIcon(p)}
            title={platformLabel(p)}
            onPress={() => addLink(p)}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  hint: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformIcon: {
    margin: 0,
  },
  input: {
    flex: 1,
  },
  textInput: {
    marginBottom: 0,
  },
  addButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderColor: fz.outline,
  },
});
