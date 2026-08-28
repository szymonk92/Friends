import { useState } from 'react';
import { StyleSheet, View, Alert, Text as RNText } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  usePerson,
  useUpdatePerson,
  useCreatePerson,
  usePeople,
} from '@/hooks/usePeople';
import { useCreateConnection, useUpdateConnection } from '@/hooks/useConnections';
import { useCreateRelations, useUpdateRelation, usePersonRelations } from '@/hooks/useRelations';
import { usePersonConnections } from '@/hooks/useConnections';
import { devLogger } from '@/lib/utils/devLogger';
import type { AppliedBrainDump } from '@/components/person/BrainDumpSection';
import {
  parseSocialLinksJson,
  serializeSocialLinks,
  type SocialLink,
} from '@/lib/social/socialLinks';
import { parseLanguagesJson, serializeLanguages } from '@/lib/utils/languages';
import { normalizePhone } from '@/lib/utils/pii';
import { parseFlexibleDate } from '@/lib/utils/dates';
import { fz, fzText } from '@/lib/design/tokens';
import PersonForm, { type PersonFormValues } from '@/components/person/PersonForm';

type PersonRecord = NonNullable<ReturnType<typeof usePerson>['data']>;

function mapPersonToForm(person: PersonRecord): Partial<PersonFormValues> {
  const g = person.gender || '';
  const known = g === 'male' || g === 'female';
  return {
    name: person.name,
    nickname: person.nickname || '',
    relationshipType: person.relationshipType || 'friend',
    personType: person.personType || 'primary',
    importanceToUser: person.importanceToUser || 'unknown',
    gender: !g ? '' : known ? g : 'other',
    genderOther: !g || known || g === 'other' ? '' : g,
    species: person.species || '',
    dateOfBirth: person.dateOfBirth
      ? new Date(person.dateOfBirth).toISOString().split('T')[0]
      : '',
    metDate: person.metDate ? new Date(person.metDate).toISOString().split('T')[0] : '',
    metLocation: person.metLocation || '',
    homeLocation: person.homeLocation || '',
    phone: person.phone || '',
    email: person.email || '',
    languages: parseLanguagesJson(person.languages),
    socialLinks: parseSocialLinksJson(person.socialLinks),
    notes: person.notes || '',
  };
}

export default function EditPersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { t } = useTranslation();
  const { data: person, isLoading } = usePerson(personId!);
  const updatePerson = useUpdatePerson();
  const createPerson = useCreatePerson();
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const createRelations = useCreateRelations();
  const updateRelation = useUpdateRelation();
  const { data: personRelations = [] } = usePersonRelations(personId!);
  const { data: personConnections = [] } = usePersonConnections(personId!);
  const { data: allPeople = [] } = usePeople();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={[fzText.sub, styles.loadingText]}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text style={fzText.title}>{t('person.notFound')}</Text>
        <Button
          mode="contained"
          onPress={() => router.back()}
          buttonColor={fz.ink}
          style={styles.backButton}
        >
          {t('person.goBack')}
        </Button>
      </View>
    );
  }

  // Side-effect writes that need a saved person + the AI key flow that just ran.
  // Field merges are handled inside PersonForm.
  const handleBrainDumpApply = async (applied: AppliedBrainDump) => {
    try {
      if (applied.archiveRelationIds.length) {
        const now = new Date();
        await Promise.all(
          applied.archiveRelationIds.map((id) =>
            updateRelation.mutateAsync({ id, status: 'past', validTo: now })
          )
        );
      }

      if (applied.endsPartnerConnectionId) {
        await updateConnection.mutateAsync({
          id: applied.endsPartnerConnectionId,
          status: 'ended',
          endDate: new Date(),
          endReason: 'breakup',
        });
      }

      if (applied.partnerName && personId) {
        const partner = await createPerson.mutateAsync({
          name: applied.partnerName,
          personType: 'primary',
          dataCompleteness: 'minimal',
          addedBy: 'ai_extraction',
          status: 'active',
          relationshipType: 'partner',
        });
        if (partner?.id) {
          await createConnection.mutateAsync({
            person1Id: personId,
            person2Id: partner.id,
            relationshipType: 'partner',
            status: 'active',
          });
        }
      }

      if (applied.attributes.length && personId) {
        await createRelations.mutateAsync(
          applied.attributes.map((a) => ({
            subjectId: personId,
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
    } catch (e) {
      Alert.alert(
        t('person.sideEffectsFailed'),
        e instanceof Error ? e.message : t('person.sideEffectsFailedMessage')
      );
    }
  };

  const handleSubmit = async (v: PersonFormValues) => {
    setIsSubmitting(true);
    try {
      await updatePerson.mutateAsync({
        id: personId!,
        name: v.name.trim(),
        nickname: v.nickname.trim() || null,
        relationshipType: v.relationshipType as any,
        dateOfBirth: parseFlexibleDate(v.dateOfBirth) || undefined,
        species: v.species.trim() || null,
        metDate: parseFlexibleDate(v.metDate) || null,
        metLocation: v.metLocation.trim() || null,
        homeLocation: v.homeLocation.trim() || null,
        phone: normalizePhone(v.phone) || null,
        email: v.email.trim() || null,
        languages: serializeLanguages(v.languages),
        socialLinks: serializeSocialLinks(v.socialLinks),
        notes: v.notes.trim() || null,
        personType: v.personType as any,
        importanceToUser: v.importanceToUser as any,
        gender: v.gender === 'other' ? v.genderOther.trim() || 'other' : v.gender || null,
      });
      router.back();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already exists')) {
        Alert.alert(t('person.duplicateName'), errorMessage, [{ text: t('common.ok') }]);
      } else {
        Alert.alert(t('common.error'), t('person.errorUpdating'));
      }
      devLogger.error('Failed to update person', { error, personId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initial = mapPersonToForm(person);
  const isPet = person.entityType === 'pet';

  return (
    <>
      <PersonForm
        mode="edit"
        isPet={isPet}
        initial={initial}
        subtitle={t('person.editSubtitle', { name: person.name })}
        headerTitle={
          <RNText style={styles.headerTitle} numberOfLines={1}>
            {t('person.editHeader')}{' '}
            <RNText style={styles.headerTitleName}>{person.name}</RNText>
          </RNText>
        }
        headerBackTitle={t('common.cancel')}
        submitting={isSubmitting}
        submitLabel={t('person.saveButton')}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        brainDumpPersonName={person.name}
        brainDumpContext={{
          personId: personId!,
          personRelations,
          personConnections,
          allPeople,
        }}
        onBrainDumpApply={handleBrainDumpApply}
        footer={
          isPet ? null : (
          <>
            <Button
              mode="outlined"
              onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
              style={styles.secondaryButton}
              contentStyle={styles.secondaryButtonContent}
              labelStyle={fzText.btnOutline}
              disabled={isSubmitting}
            >
              {t('person.addRelationButton')}
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
              style={styles.secondaryButton}
              contentStyle={styles.secondaryButtonContent}
              labelStyle={fzText.btnOutline}
              disabled={isSubmitting}
            >
              {t('person.addConnectionButton')}
            </Button>
          </>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontFamily: fz.font,
    fontWeight: '500',
    fontSize: 18,
    color: fz.ink,
  },
  headerTitleName: {
    fontFamily: fz.font,
    fontWeight: '700',
    fontSize: 18,
    color: fz.ink,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: fz.paper,
  },
  loadingText: {
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
  },
  secondaryButton: {
    marginBottom: 8,
    borderColor: fz.outline,
    borderRadius: fz.rButton,
  },
  secondaryButtonContent: {
    paddingVertical: 8,
  },
});
