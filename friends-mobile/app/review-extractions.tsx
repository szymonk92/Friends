import CenteredContainer from '@/components/CenteredContainer';
import {
  usePendingExtractions,
  useApprovePendingExtraction,
  useRejectPendingExtraction,
  useEditAndApprovePendingExtraction,
} from '@/hooks/usePendingExtractions';
import {
  useAcceptNewConflict,
  useAcceptBothConflict,
} from '@/hooks/useAIExtraction';
import { formatRelationType } from '@/lib/utils/format';
import { confirmDestructive } from '@/lib/utils/confirm';
import { INTENSITY_OPTIONS } from '@/lib/constants/relations';
import { RelationIcon } from '@/components/RelationIcon';
import { WarningIcon, CheckCircleIcon } from 'phosphor-react-native';
import { devLogger } from '@/lib/utils/devLogger';
import { Alert, ActivityIndicator, ScrollView, View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Stack, router } from 'expo-router';
import {
  Card,
  Text,
  Button,
  Chip,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { fz } from '@/lib/design/tokens';

export default function ReviewExtractionsScreen() {
  const { data: pending, isLoading } = usePendingExtractions();
  const approveMutation = useApprovePendingExtraction();
  const rejectMutation = useRejectPendingExtraction();
  const editMutation = useEditAndApprovePendingExtraction();
  const acceptNewConflictMutation = useAcceptNewConflict();
  const acceptBothConflictMutation = useAcceptBothConflict();

  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<any>(null);
  const [editedLabel, setEditedLabel] = useState('');
  const [editedIntensity, setEditedIntensity] = useState('medium');

  const handleApprove = async (extraction: any) => {
    try {
      await approveMutation.mutateAsync(extraction.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to approve extraction');
      devLogger.error('Failed to approve extraction', { error, extractionId: extraction.id });
    }
  };

  const handleReject = (extraction: any) => {
    confirmDestructive({
      title: 'Reject Extraction',
      message: `Are you sure you want to reject this relation?\n\n${extraction.subjectName} ${formatRelationType(extraction.relationType).toLowerCase()} "${extraction.objectLabel}"`,
      confirmLabel: 'Reject',
      onConfirm: async () => {
        try {
          await rejectMutation.mutateAsync({ extractionId: extraction.id });
        } catch (error) {
          Alert.alert('Error', 'Failed to reject extraction');
          devLogger.error('Failed to reject extraction', {
            error,
            extractionId: extraction.id,
          });
        }
      },
    });
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
      devLogger.error('Failed to edit extraction', { error, extractionId: currentEdit.id });
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
      <CenteredContainer style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading extractions...</Text>
      </CenteredContainer>
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
        <CenteredContainer style={styles.centered}>
          <CheckCircleIcon size={40} color="#1B1815" weight="bold" style={styles.emptyIcon} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            All Caught Up!
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No extractions need your review right now.
          </Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
            Go Back
          </Button>
        </CenteredContainer>
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
          <Card
            key={extraction.id}
            style={[styles.extractionCard, extraction.isConflict && styles.conflictCard]}
          >
            <Card.Content>
              {extraction.isConflict ? (
                <>
                  <View style={styles.conflictTitleRow}>
                    <WarningIcon size={16} color="#e65100" weight="bold" />
                    <Text variant="titleSmall" style={styles.conflictTitle}>
                      Conflict Detected
                    </Text>
                  </View>
                  {extraction.conflictDescription && (
                    <Text variant="bodySmall" style={styles.conflictDescription}>
                      {extraction.conflictDescription}
                    </Text>
                  )}
                  <View style={styles.conflictCompare}>
                    <View style={styles.conflictSide}>
                      <Text variant="labelSmall" style={styles.conflictSideLabel}>
                        NEW INFO
                      </Text>
                      <View style={styles.relationRow}>
                        <RelationIcon type={extraction.relationType} size={14} />
                        <Text variant="bodyMedium" style={styles.objectLabel}>
                          {formatRelationType(extraction.relationType)}
                        </Text>
                      </View>
                      <Text variant="titleMedium" style={styles.conflictValue}>
                        "{extraction.objectLabel}"
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodySmall" style={styles.personName}>
                    Person: {extraction.subjectName}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.extractionHeader}>
                    <View style={styles.extractionInfo}>
                      <Text variant="bodySmall" style={styles.personName}>
                        {extraction.subjectName}
                      </Text>
                      <View style={styles.relationRow}>
                        <RelationIcon type={extraction.relationType} size={16} />
                        <Text variant="titleMedium">
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
                </>
              )}
            </Card.Content>

            <Card.Actions>
              {extraction.isConflict ? (
                <>
                  <Button
                    mode="outlined"
                    onPress={() =>
                      rejectMutation.mutate({ extractionId: extraction.id })
                    }
                    disabled={rejectMutation.isPending}
                  >
                    Keep old
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => acceptBothConflictMutation.mutate(extraction.id)}
                    loading={acceptBothConflictMutation.isPending}
                    disabled={acceptBothConflictMutation.isPending}
                  >
                    Both true
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => acceptNewConflictMutation.mutate(extraction.id)}
                    loading={acceptNewConflictMutation.isPending}
                    disabled={acceptNewConflictMutation.isPending}
                  >
                    Replace
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </Card.Actions>
          </Card>
        ))}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Edit Dialog */}
      <Portal>
        <Dialog
          visible={editDialogVisible}
          onDismiss={() => setEditDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Edit Extraction</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="What they like/dislike/etc."
              value={editedLabel}
              onChangeText={setEditedLabel}
              style={[styles.dialogInput, styles.dialogFont]}
            />

            <Text variant="titleSmall" style={[styles.dialogLabel, styles.dialogFont]}>
              Intensity
            </Text>
            <SegmentedButtons
              value={editedIntensity}
              onValueChange={setEditedIntensity}
              buttons={INTENSITY_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              style={styles.dialogSegmented}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setEditDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              labelStyle={styles.dialogFont}
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  emptyIcon: {
    marginBottom: 8,
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
  conflictCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  conflictTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  conflictTitle: {
    color: '#e65100',
    fontWeight: 'bold',
  },
  conflictDescription: {
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  conflictCompare: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  conflictSide: {
    flex: 1,
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  conflictSideLabel: {
    opacity: 0.6,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  conflictValue: {
    fontWeight: 'bold',
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
    gap: 6,
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
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
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
