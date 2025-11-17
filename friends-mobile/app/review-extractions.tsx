import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  IconButton,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { useState } from 'react';
import { router, Stack } from 'expo-router';
import {
  usePendingExtractions,
  useApprovePendingExtraction,
  useRejectPendingExtraction,
  useEditAndApprovePendingExtraction,
} from '@/hooks/usePendingExtractions';
import { formatRelationType, getRelationEmoji } from '@/lib/utils/format';

export default function ReviewExtractionsScreen() {
  const { data: pending, isLoading } = usePendingExtractions();
  const approveMutation = useApprovePendingExtraction();
  const rejectMutation = useRejectPendingExtraction();
  const editMutation = useEditAndApprovePendingExtraction();

  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<any>(null);
  const [editedLabel, setEditedLabel] = useState('');
  const [editedIntensity, setEditedIntensity] = useState('medium');

  const handleApprove = async (extraction: any) => {
    try {
      await approveMutation.mutateAsync(extraction.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to approve extraction');
      console.error('Approve error:', error);
    }
  };

  const handleReject = (extraction: any) => {
    Alert.alert(
      'Reject Extraction',
      `Are you sure you want to reject this relation?\n\n${extraction.subjectName} ${formatRelationType(extraction.relationType).toLowerCase()} "${extraction.objectLabel}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectMutation.mutateAsync({ extractionId: extraction.id });
            } catch (error) {
              Alert.alert('Error', 'Failed to reject extraction');
              console.error('Reject error:', error);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (extraction: any) => {
    setCurrentEdit(extraction);
    setEditedLabel(extraction.objectLabel);
    setEditedIntensity(extraction.intensity || 'medium');
    setEditDialogVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!currentEdit) return;

    try {
      await editMutation.mutateAsync({
        extractionId: currentEdit.id,
        updates: {
          objectLabel: editedLabel.trim(),
          intensity: editedIntensity,
        },
      });
      setEditDialogVisible(false);
      setCurrentEdit(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save edit');
      console.error('Edit error:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4caf50'; // Green
    if (confidence >= 0.65) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.65) return 'Medium';
    return 'Low';
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading extractions...</Text>
      </View>
    );
  }

  if (!pending || pending.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Review Extractions',
          }}
        />
        <View style={styles.centered}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            All Caught Up! ✅
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No extractions need your review right now.
          </Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
            Go Back
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Review ${pending.length} Extraction${pending.length !== 1 ? 's' : ''}`,
        }}
      />
      <ScrollView style={styles.container}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.headerTitle}>
              ⏳ Pending AI Extractions
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              These relations had medium confidence (60-79%) and need your approval before saving.
            </Text>
          </Card.Content>
        </Card>

        {pending.map((extraction) => (
          <Card key={extraction.id} style={styles.extractionCard}>
            <Card.Content>
              <View style={styles.extractionHeader}>
                <View style={styles.extractionInfo}>
                  <Text variant="bodySmall" style={styles.personName}>
                    {extraction.subjectName}
                  </Text>
                  <View style={styles.relationRow}>
                    <Text variant="titleMedium">
                      {getRelationEmoji(extraction.relationType)}{' '}
                      {formatRelationType(extraction.relationType)}
                    </Text>
                  </View>
                  <Text variant="titleLarge" style={styles.objectLabel}>
                    "{extraction.objectLabel}"
                  </Text>
                </View>
              </View>

              <View style={styles.metadataRow}>
                {extraction.category && (
                  <Chip compact style={styles.metadataChip}>
                    {extraction.category}
                  </Chip>
                )}
                {extraction.intensity && (
                  <Chip compact style={styles.metadataChip}>
                    {extraction.intensity}
                  </Chip>
                )}
                <Chip
                  compact
                  style={[
                    styles.confidenceChip,
                    { backgroundColor: getConfidenceColor(extraction.confidence) },
                  ]}
                  textStyle={{ color: 'white' }}
                >
                  {getConfidenceLabel(extraction.confidence)} (
                  {(extraction.confidence * 100).toFixed(0)}%)
                </Chip>
              </View>

              {extraction.extractionReason && (
                <Text variant="bodySmall" style={styles.reason}>
                  {extraction.extractionReason}
                </Text>
              )}
            </Card.Content>

            <Card.Actions>
              <Button
                mode="outlined"
                onPress={() => handleReject(extraction)}
                disabled={rejectMutation.isPending}
              >
                Reject
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleEdit(extraction)}
                disabled={editMutation.isPending}
              >
                Edit
              </Button>
              <Button
                mode="contained"
                onPress={() => handleApprove(extraction)}
                loading={approveMutation.isPending}
                disabled={approveMutation.isPending}
              >
                Approve
              </Button>
            </Card.Actions>
          </Card>
        ))}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Edit Dialog */}
      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Edit Extraction</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="What they like/dislike/etc."
              value={editedLabel}
              onChangeText={setEditedLabel}
              style={styles.dialogInput}
            />

            <Text variant="titleSmall" style={styles.dialogLabel}>
              Intensity
            </Text>
            <SegmentedButtons
              value={editedIntensity}
              onValueChange={setEditedIntensity}
              buttons={[
                { value: 'weak', label: 'Weak' },
                { value: 'medium', label: 'Medium' },
                { value: 'strong', label: 'Strong' },
                { value: 'very_strong', label: 'Very Strong' },
              ]}
              style={styles.dialogSegmented}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleSaveEdit}
              loading={editMutation.isPending}
              disabled={!editedLabel.trim() || editMutation.isPending}
            >
              Save & Approve
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  backButton: {
    marginTop: 8,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerTitle: {
    marginBottom: 8,
  },
  headerSubtitle: {
    opacity: 0.7,
  },
  extractionCard: {
    margin: 16,
    marginTop: 8,
  },
  extractionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  extractionInfo: {
    flex: 1,
  },
  personName: {
    opacity: 0.6,
    marginBottom: 4,
  },
  relationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  objectLabel: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  metadataChip: {
    marginRight: 4,
  },
  confidenceChip: {
    marginRight: 4,
  },
  reason: {
    marginTop: 8,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  spacer: {
    height: 40,
  },
  dialogInput: {
    marginBottom: 16,
  },
  dialogLabel: {
    marginBottom: 8,
    marginTop: 8,
  },
  dialogSegmented: {
    marginBottom: 16,
  },
});
