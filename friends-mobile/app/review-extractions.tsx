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
import { intensityLabel } from '@/lib/i18n/labels';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { INTENSITY_OPTIONS } from '@/lib/constants/relations';
import { RelationIcon } from '@/components/RelationIcon';
import { WarningIcon, CheckCircleIcon } from 'phosphor-react-native';
import { devLogger } from '@/lib/utils/devLogger';
import { ActivityIndicator, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { Button, Portal } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { fz, fzText } from '@/lib/design/tokens';
import { FormInput, FormSection } from '@/components/FormKit';
import { Pill } from '@/components/Pill';
import { PillGroup } from '@/components/PillGroup';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from 'react-i18next';

export default function ReviewExtractionsScreen() {
  const { t } = useTranslation();
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
      fzAlert(t('common.error'), t('reviewExtractions.approveFailed'));
      devLogger.error('Failed to approve extraction', { error, extractionId: extraction.id });
    }
  };

  const handleReject = (extraction: any) => {
    confirmDestructive({
      title: t('reviewExtractions.rejectTitle'),
      message: t('reviewExtractions.rejectMessage', {
        subject: extraction.subjectName,
        type: formatRelationType(extraction.relationType).toLowerCase(),
        object: extraction.objectLabel,
      }),
      confirmLabel: t('storyDetail.reject'),
      onConfirm: async () => {
        try {
          await rejectMutation.mutateAsync({ extractionId: extraction.id });
        } catch (error) {
          fzAlert(t('common.error'), t('reviewExtractions.rejectFailed'));
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
      fzAlert(t('common.error'), t('reviewExtractions.editFailed'));
      devLogger.error('Failed to edit extraction', { error, extractionId: currentEdit.id });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return fz.success; // Green
    if (confidence >= 0.65) return fz.warn; // Orange
    return fz.danger; // Red
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return t('reviewExtractions.high');
    if (confidence >= 0.65) return t('reviewExtractions.medium');
    return t('reviewExtractions.low');
  };

  if (isLoading) {
    return (
      <CenteredContainer style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={[fzText.sub, styles.loadingText]}>{t('reviewExtractions.loading')}</Text>
      </CenteredContainer>
    );
  }

  if (!pending || pending.length === 0) {
    return (
      <>
        <AppBar title={t('reviewExtractions.title')} />
        <CenteredContainer style={styles.centered}>
          <CheckCircleIcon size={40} color={fz.ink} weight="bold" style={styles.emptyIcon} />
          <Text style={[fzText.title, styles.emptyTitle]}>{t('reviewExtractions.caughtUp')}</Text>
          <Text style={[fzText.sub, styles.emptyText]}>{t('reviewExtractions.noneMessage')}</Text>
          <PrimaryButton label={t('person.goBack')} onPress={() => router.back()} />
        </CenteredContainer>
      </>
    );
  }

  return (
    <>
      <AppBar title={t('reviewExtractions.titleCount', { count: pending.length })} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <FormSection title={t('reviewExtractions.pending')} hint={t('reviewExtractions.pendingMessage')} plain>
          <View />
        </FormSection>

        {pending.map((extraction) => (
          <FormSection key={extraction.id} style={extraction.isConflict ? styles.conflictCard : undefined}>
            {extraction.isConflict ? (
              <>
                <View style={styles.rowGap}>
                  <WarningIcon size={16} color={fz.warn} weight="bold" />
                  <Text style={[fzText.label, { color: fz.warn }]}>{t('reviewExtractions.conflict')}</Text>
                </View>
                {extraction.conflictDescription && (
                  <Text style={[fzText.sub, styles.gap]}>{extraction.conflictDescription}</Text>
                )}
                <Text style={[fzText.meta, styles.gap]}>{t('reviewExtractions.newInfo')}</Text>
                <View style={styles.rowGap}>
                  <RelationIcon type={extraction.relationType} size={14} />
                  <Text style={fzText.body}>{formatRelationType(extraction.relationType)}</Text>
                </View>
                <Text style={fzText.title}>"{extraction.objectLabel}"</Text>
                <Text style={[fzText.sub, styles.gap]}>
                  {t('reviewExtractions.person', { name: extraction.subjectName })}
                </Text>
              </>
            ) : (
              <>
                <Text style={fzText.meta}>{extraction.subjectName}</Text>
                <View style={[styles.rowGap, styles.gap]}>
                  <RelationIcon type={extraction.relationType} size={16} />
                  <Text style={fzText.name}>{formatRelationType(extraction.relationType)}</Text>
                </View>
                <Text style={fzText.title}>"{extraction.objectLabel}"</Text>

                <View style={styles.metadataRow}>
                  {extraction.category && <Pill label={extraction.category} />}
                  {extraction.intensity && (
                    <Pill label={intensityLabel(extraction.intensity, extraction.intensity)} />
                  )}
                  <Pill
                    variant="outline"
                    label={`${getConfidenceLabel(extraction.confidence)} (${(extraction.confidence * 100).toFixed(0)}%)`}
                    style={{ borderColor: getConfidenceColor(extraction.confidence) }}
                  />
                </View>

                {extraction.extractionReason && (
                  <Text style={[fzText.sub, styles.gap]}>{extraction.extractionReason}</Text>
                )}
              </>
            )}

            <View style={styles.actions}>
              {extraction.isConflict ? (
                <>
                  <PrimaryButton
                    variant="outline"
                    label={t('reviewExtractions.keepOld')}
                    onPress={() => rejectMutation.mutate({ extractionId: extraction.id })}
                    disabled={rejectMutation.isPending}
                    style={styles.action}
                  />
                  <PrimaryButton
                    variant="outline"
                    label={t('reviewExtractions.bothTrue')}
                    onPress={() => acceptBothConflictMutation.mutate(extraction.id)}
                    disabled={acceptBothConflictMutation.isPending}
                    style={styles.action}
                  />
                  <PrimaryButton
                    label={t('reviewExtractions.replace')}
                    onPress={() => acceptNewConflictMutation.mutate(extraction.id)}
                    disabled={acceptNewConflictMutation.isPending}
                    style={styles.action}
                  />
                </>
              ) : (
                <>
                  <PrimaryButton
                    variant="outline"
                    label={t('storyDetail.reject')}
                    onPress={() => handleReject(extraction)}
                    disabled={rejectMutation.isPending}
                    style={styles.action}
                  />
                  <PrimaryButton
                    variant="outline"
                    label={t('common.edit')}
                    onPress={() => handleEdit(extraction)}
                    disabled={editMutation.isPending}
                    style={styles.action}
                  />
                  <PrimaryButton
                    label={t('storyDetail.approve')}
                    onPress={() => handleApprove(extraction)}
                    disabled={approveMutation.isPending}
                    style={styles.action}
                  />
                </>
              )}
            </View>
          </FormSection>
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
          <Dialog.Title style={styles.dialogTitle}>{t('reviewExtractions.editTitle')}</Dialog.Title>
          <Dialog.Content>
            <FormInput
              label={t('reviewExtractions.whatLabel')}
              value={editedLabel}
              onChangeText={setEditedLabel}
              style={styles.dialogInput}
            />

            <Text style={[fzText.label, styles.dialogLabel]}>{t('relationForm.intensity')}</Text>
            <PillGroup
              value={editedIntensity}
              onChange={setEditedIntensity}
              options={INTENSITY_OPTIONS.map((option) => ({
                value: option.value,
                label: intensityLabel(option.value, option.label),
              }))}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button
              onPress={handleSaveEdit}
              loading={editMutation.isPending}
              disabled={!editedLabel.trim() || editMutation.isPending}
            >
              {t('reviewExtractions.saveApprove')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  content: { padding: fz.s.edge },
  centered: { padding: 20 },
  loadingText: { marginTop: 12 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { marginBottom: 8, textAlign: 'center' },
  emptyText: { marginBottom: 24, textAlign: 'center' },
  conflictCard: { borderColor: fz.warn, backgroundColor: fz.warnBg },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gap: { marginTop: fz.s.sm },
  metadataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: fz.s.sm, marginTop: fz.s.md },
  actions: { flexDirection: 'row', gap: fz.s.sm, marginTop: fz.s.lg },
  action: { flex: 1, paddingHorizontal: 4 },
  spacer: { height: fz.s.xxl },
  dialog: { borderRadius: fz.rCard, backgroundColor: fz.card },
  dialogTitle: { fontFamily: fz.font },
  dialogInput: { marginBottom: fz.s.lg },
  dialogLabel: { marginBottom: fz.s.sm },
});
