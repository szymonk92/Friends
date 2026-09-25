import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Text as RNText } from 'react-native';
import { formatRelativeTime } from '@/lib/utils/format';
import { getBiometricTypeName } from '@/lib/crypto/biometric-secrets';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { IconCircle } from '@/components/IconCircle';

interface SecretListProps {
  secrets: any[];
  loadingSecrets: boolean;
  isPasswordBased: boolean;
  biometricStatus: any;
  people: any[];
  handleViewSecret: (id: string) => void;
  handleDeleteSecret: (id: string, title: string) => void;
  setShowCreateDialog: (show: boolean) => void;
  insets: any;
}

export default function SecretList({
  secrets,
  loadingSecrets,
  isPasswordBased,
  biometricStatus,
  people,
  handleViewSecret,
  handleDeleteSecret,
}: SecretListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Pill
          label={`Protected by ${
            isPasswordBased
              ? 'Password'
              : getBiometricTypeName(biometricStatus?.biometricType || 'none')
          }`}
          icon="checkCircle"
        />
        <RNText style={fzText.meta}>{secrets.length} secret(s) stored</RNText>
      </View>

      {loadingSecrets ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={fz.ink} />
        </View>
      ) : secrets.length === 0 ? (
        <View style={styles.emptyState}>
          <RNText style={fzText.title}>No Secrets Yet</RNText>
          <RNText style={[fzText.sub, { marginTop: fz.s.sm, textAlign: 'center' }]}>
            Tap the + button to add your first secret
          </RNText>
        </View>
      ) : (
        <FlatList
          data={secrets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const associatedPerson = item.personId
              ? people.find((p) => p.id === item.personId)
              : null;
            return (
              <TouchableOpacity
                style={styles.secretCard}
                onPress={() => handleViewSecret(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.secretInfo}>
                  <RNText style={fzText.name} numberOfLines={1}>
                    {item.title}
                  </RNText>
                  {associatedPerson && (
                    <RNText style={styles.personTag}>{associatedPerson.name}</RNText>
                  )}
                  <RNText style={styles.secretDate}>
                    {formatRelativeTime(new Date(item.createdAt))}
                  </RNText>
                </View>
                <IconCircle
                  icon="trash"
                  size={34}
                  iconSize={16}
                  onPress={() => handleDeleteSecret(item.id, item.title)}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
    paddingVertical: fz.s.md,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  listContent: { padding: fz.s.edge, paddingTop: 0, paddingBottom: 120 },
  secretCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: fz.card,
    borderRadius: fz.rRow,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    padding: fz.s.md,
    marginBottom: fz.s.sm,
  },
  secretInfo: { flex: 1, marginRight: fz.s.sm },
  personTag: { ...fzText.chip, color: fz.textMute, marginTop: 2 },
  secretDate: { ...fzText.time, marginTop: 4 },
});