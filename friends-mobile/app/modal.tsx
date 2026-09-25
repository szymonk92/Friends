import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreatePerson } from '@/hooks/usePeople';
import { useCreateConnection } from '@/hooks/useConnections';
import { useCreateRelations } from '@/hooks/useRelations';
import { devLogger } from '@/lib/utils/devLogger';
import { serializeSocialLinks } from '@/lib/social/socialLinks';
import { serializeLanguages } from '@/lib/utils/languages';
import { normalizePhone } from '@/lib/utils/pii';
import { parseFlexibleDate } from '@/lib/utils/dates';
import type { AppliedBrainDump } from '@/components/person/BrainDumpSection';
import type { BrainDumpAttribute } from '@/lib/ai/brain-dump';
import PersonForm, { type PersonFormValues } from '@/components/person/PersonForm';

export default function AddPersonModal() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPartnerName, setPendingPartnerName] = useState<string | null>(null);
  const [pendingAttributes, setPendingAttributes] = useState<BrainDumpAttribute[]>([]);

  const createPerson = useCreatePerson();
  const createConnection = useCreateConnection();
  const createRelations = useCreateRelations();

  // PersonForm merges brain-dump results into the fields; the parent only owns
  // the side-effects that need the new person's id (deferred to after create).
  const handleBrainDumpApply = (applied: AppliedBrainDump) => {
    if (applied.partnerName) setPendingPartnerName(applied.partnerName);
    if (applied.attributes.length) {
      setPendingAttributes((prev) => [...prev, ...applied.attributes]);
    }
  };

  const handleSubmit = async (v: PersonFormValues) => {
    setIsSubmitting(true);
    try {
      const created = await createPerson.mutateAsync({
        name: v.name.trim(),
        nickname: v.nickname.trim() || undefined,
        relationshipType: v.relationshipType as any,
        dateOfBirth: parseFlexibleDate(v.dateOfBirth) || undefined,
        metDate: parseFlexibleDate(v.metDate) || undefined,
        metLocation: v.metLocation.trim() || undefined,
        homeLocation: v.homeLocation.trim() || undefined,
        phone: normalizePhone(v.phone) || undefined,
        email: v.email.trim() || undefined,
        languages: serializeLanguages(v.languages) || undefined,
        socialLinks: serializeSocialLinks(v.socialLinks) || undefined,
        notes: v.notes.trim() || undefined,
        personType: v.personType as any,
        dataCompleteness: 'partial',
        addedBy: 'user',
        status: 'active',
      });

      if (created?.id) {
        try {
          if (pendingPartnerName) {
            const partner = await createPerson.mutateAsync({
              name: pendingPartnerName,
              personType: 'primary',
              dataCompleteness: 'minimal',
              addedBy: 'ai_extraction',
              status: 'active',
              relationshipType: 'partner',
            });
            if (partner?.id) {
              await createConnection.mutateAsync({
                person1Id: created.id,
                person2Id: partner.id,
                relationshipType: 'partner',
                status: 'active',
              });
            }
          }
          if (pendingAttributes.length) {
            await createRelations.mutateAsync(
              pendingAttributes.map((a) => ({
                subjectId: created.id,
                subjectType: 'person',
                relationType: a.relationType,
                objectLabel: a.objectLabel,
                confidence: a.confidence,
                source: 'ai_extraction',
                status: a.assertion === 'aspiration' ? 'aspiration' : 'current',
                assertion: a.assertion,
              }))
            );
          }
        } catch (sideEffectError) {
          devLogger.error('Brain-dump side-effects failed', { sideEffectError });
        }
      }

      Alert.alert(t('common.success'), t('person.successAdded', { name: v.name }), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already exists')) {
        Alert.alert(t('person.duplicateName'), errorMessage, [{ text: t('common.ok') }]);
      } else {
        Alert.alert(t('common.error'), t('person.errorAdding'));
      }
      devLogger.error('Failed to create person', { error, personData: { name: v.name } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PersonForm
      mode="add"
      subtitle={t('person.addSubtitle')}
      submitting={isSubmitting}
      submitLabel={t('person.addButton')}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      onBrainDumpApply={handleBrainDumpApply}
    />
  );
}
