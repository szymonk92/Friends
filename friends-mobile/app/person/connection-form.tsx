import CenteredContainer from '@/components/CenteredContainer';
import { confirmDestructive } from '@/lib/utils/confirm';
import { useLocalSearchParams, Stack } from 'expo-router';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  Checkbox,
  IconButton,
  Menu,
} from 'react-native-paper';
import { devLogger } from '@/lib/utils/devLogger';
import {
  useCreateConnection,
  usePersonConnections,
  useUpdateConnection,
  useDeleteConnection,
} from '@/hooks/useConnections';
import {
  usePerson,
  usePeople,
  useMePerson,
  useCreatePerson,
  PersonWithPhoto,
} from '@/hooks/usePeople';
import { parseFlexibleDate, toDateText } from '@/lib/utils/dates';
import { RELATIONSHIP_TYPES, CONNECTION_STATUSES } from '@/lib/constants/relations';
import { connections, type Connection } from '@/lib/db/schema';
import { useEntityById } from '@/hooks/useEntityById';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { useFzAlert } from '@/components/FzDialog';
import { LineIcon } from '@/components/LineIcon';
import { FormSection, FormInput, FormScreen } from '@/components/FormKit';
import { Avatar } from '@/components/Avatar';
import { describeConnection } from '@/lib/connections/describeConnection';
import { RelationshipTypePicker } from '@/components/person/RelationshipTypePicker';

type ConnectionFormMode = 'add' | 'edit';
type ConnectionRelationshipType = NonNullable<Connection['relationshipType']>;
type ConnectionStatus = NonNullable<Connection['status']>;

type SelectablePerson = Pick<
  PersonWithPhoto,
  'id' | 'name' | 'nickname' | 'personType' | 'relationshipType' | 'photoPath'
>;

interface ConnectionFormProps {
  mode: ConnectionFormMode;
}

export default function ConnectionForm({ mode }: ConnectionFormProps) {
  const { t } = useTranslation();
  const { alert, dialog } = useFzAlert();
  const params = useLocalSearchParams();
  const personId = mode === 'add' ? (params.personId as string) : undefined;
  const connectionId = mode === 'edit' ? (params.connectionId as string) : undefined;

  const fromPersonId =
    mode === 'edit' && typeof params.fromPersonId === 'string' ? params.fromPersonId : undefined;

  const { data: person } = usePerson(personId!);
  // 'all' so pets and mentioned people are also connectable / findable in the list.
  const { data: everyone = [], isLoading: loadingPeople } = usePeople({ entityType: 'all' });
  const { data: mePerson } = useMePerson();
  const { data: existingConnections = [] } = usePersonConnections(personId!);
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const deleteConnection = useDeleteConnection();
  const createPerson = useCreatePerson();

  // Edit mode: load the connection being edited
  const {
    data: connection,
    isLoading,
    notFound,
  } = useEntityById<Connection>(connections, connectionId);

  // A pet's connections are always 'pet' links — no human relationship type
  // applies, whichever side of the link you're adding from.
  const subjectIsPet =
    mode === 'add' ? person?.entityType === 'pet' : connection?.relationshipType === 'pet';

  // Form state
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [singlePersonMode, setSinglePersonMode] = useState(false);
  const [singlePersonId, setSinglePersonId] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState<ConnectionRelationshipType>('friend');
  const [status, setStatus] = useState<ConnectionStatus>('active');
  const [qualifier, setQualifier] = useState('');
  const [notes, setNotes] = useState('');
  const [sinceText, setSinceText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPersonName, setPendingPersonName] = useState<string | null>(null);
  const [personType, setPersonType] = useState<'primary' | 'mentioned'>('primary');
  const [newEntityKind, setNewEntityKind] = useState<'person' | 'pet' | 'child'>('person');
  const [species, setSpecies] = useState('');
  const [birthdayText, setBirthdayText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  // Optional co-parent / co-owner to link a freshly-created child or pet to.
  const [secondParentId, setSecondParentId] = useState<string | null>(null);
  const [parentMenuVisible, setParentMenuVisible] = useState(false);

  const ALWAYS_PRIMARY_RELATIONSHIPS: ConnectionRelationshipType[] = [
    'partner',
    'ex-partner',
    'friend',
    'family',
  ];
  const RELATIONSHIP_TYPE_VALUES = useMemo(
    () => new Set(RELATIONSHIP_TYPES.map((type) => type.value as ConnectionRelationshipType)),
    []
  );
  const CONNECTION_STATUS_VALUES = useMemo(
    () =>
      new Set(
        CONNECTION_STATUSES.map((connectionStatus) => connectionStatus.value as ConnectionStatus)
      ),
    []
  );

  const handleRelationshipTypeChange = (value: string) => {
    if (RELATIONSHIP_TYPE_VALUES.has(value as ConnectionRelationshipType)) {
      setRelationshipType(value as ConnectionRelationshipType);
    }
  };

  const handleStatusChange = (value: string) => {
    if (CONNECTION_STATUS_VALUES.has(value as ConnectionStatus)) {
      setStatus(value as ConnectionStatus);
    }
  };

  // Pre-select relationship type from query (e.g. PartnerBadge deep-link)
  useEffect(() => {
    if (mode !== 'add') return;
    const requested =
      typeof params.relationshipType === 'string' ? params.relationshipType : undefined;
    if (requested && RELATIONSHIP_TYPE_VALUES.has(requested as ConnectionRelationshipType)) {
      setRelationshipType(requested as ConnectionRelationshipType);
    }
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate form state once the connection loads (edit mode).
  useEffect(() => {
    if (!connection) return;
    setRelationshipType(connection.relationshipType || 'friend');
    setQualifier(connection.qualifier || '');
    setStatus(connection.status || 'active');
    setNotes(connection.notes || '');
    setSinceText(connection.startDate ? toDateText(new Date(connection.startDate)) : '');
  }, [connection]);

  // Combine regular people with ME
  const allPeople = useMemo(() => {
    const combined = [...everyone];
    if (mePerson) {
      combined.push({
        ...mePerson,
        photoPath: null,
      } as PersonWithPhoto);
    }
    return combined;
  }, [everyone, mePerson]);

  const petIds = useMemo(
    () => new Set(allPeople.filter((p) => p.entityType === 'pet').map((p) => p.id)),
    [allPeople]
  );

  // A connection where the other endpoint is a pet is an owner link, not a
  // human relationship type — so hide the relationship-type picker.
  const otherSideIsPet =
    newEntityKind === 'pet' ||
    (singlePersonId != null && petIds.has(singlePersonId)) ||
    (mode === 'edit' && connection?.relationshipType === 'pet') ||
    (selectedPersonIds.length > 0 && selectedPersonIds.every((id) => petIds.has(id)));
  const hideRelationshipType = subjectIsPet || otherSideIsPet;

  // Edit mode: the person on the other side of this connection, for the header card
  const editConnectedPerson = useMemo(() => {
    if (mode !== 'edit' || !connection) return null;
    const otherId =
      fromPersonId && connection.person2Id === fromPersonId
        ? connection.person1Id
        : connection.person2Id;
    return everyone.find((p) => p.id === otherId) ?? null;
  }, [mode, connection, fromPersonId, everyone]);

  // Filter out the current person and filter by search with ranking
  const availablePeople = allPeople
    .filter((p) => p.id !== personId)
    .filter((p) => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const name = p.name.toLowerCase();
      const nickname = p.nickname?.toLowerCase() || '';

      if (name === query || nickname === query) return true; // Exact match
      if (name.startsWith(query) || nickname.startsWith(query)) return true; // Starts with
      if (name.includes(query) || nickname.includes(query)) return true; // Contains

      return false;
    })
    .sort((a, b) => {
      if (!searchQuery) return 0;

      const query = searchQuery.toLowerCase();

      const getScore = (p: typeof a) => {
        const name = p.name.toLowerCase();
        const nickname = p.nickname?.toLowerCase() || '';

        if (name === query || nickname === query) return 3; // Exact match
        if (name.startsWith(query) || nickname.startsWith(query)) return 2; // Starts with
        if (name.includes(query) || nickname.includes(query)) return 1; // Contains
        return 0;
      };

      const aScore = getScore(a);
      const bScore = getScore(b);

      if (aScore !== bScore) {
        return bScore - aScore; // Higher score first
      }

      // If scores are equal, sort by name
      return a.name.localeCompare(b.name);
    });

  const togglePersonSelection = (personId: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const selectSinglePerson = (personId: string) => {
    setSinglePersonId(personId);
    setSinglePersonMode(true);
    setSelectedPersonIds([]);
  };
  const backToMultiMode = () => {
    setSinglePersonMode(false);
    setSinglePersonId(null);
    setPendingPersonName(null);
    setRelationshipType('friend');
    setPersonType('primary');
    setStatus('active');
    setQualifier('');
    setNotes('');
    setSinceText('');
    setNewEntityKind('person');
    setSpecies('');
    setBirthdayText('');
    setSecondParentId(null);
  };

  const handleCreateAndSelectPerson = () => {
    if (!searchQuery.trim()) return;
    setPendingPersonName(searchQuery.trim());
    setSinglePersonMode(true);
    setPersonType('primary'); // Default to primary, user can change
    setSearchQuery('');
  };

  const selectedSinglePerson = useMemo<SelectablePerson | null>(() => {
    if (singlePersonId) {
      return allPeople.find((p) => p.id === singlePersonId) ?? null;
    }
    if (pendingPersonName) {
      return {
        id: 'pending',
        name: pendingPersonName,
        nickname: null,
        personType: personType,
        relationshipType: 'friend',
        photoPath: null,
      };
    }
    return null;
  }, [singlePersonId, pendingPersonName, allPeople, personType]);

  const buildNewPersonPayload = (name: string) => {
    const t = birthdayText.trim();
    const dob = t ? parseFlexibleDate(t) : null;
    if (newEntityKind === 'pet') {
      return {
        name,
        personType: 'mentioned' as const,
        entityType: 'pet' as const,
        species: species.trim() || null,
        dateOfBirth: dob ?? undefined,
      };
    }
    if (newEntityKind === 'child') {
      return {
        name,
        personType: 'mentioned' as const,
        entityType: 'person' as const,
        dateOfBirth: dob ?? undefined,
      };
    }
    return {
      name,
      personType,
      relationshipType: 'friend' as const,
    };
  };

  const handleSubmit = async () => {
    const sinceDate = sinceText.trim() ? parseFlexibleDate(sinceText) : null;
    if (sinceText.trim() && !sinceDate) {
      alert(t('connectionForm.invalidDate'), t('connectionForm.invalidSince'));
      return;
    }
    if (mode === 'edit') {
      // Edit mode - update existing connection
      if (!connection) return;

      setIsSubmitting(true);
      try {
        await updateConnection.mutateAsync({
          id: connectionId!,
          relationshipType,
          qualifier: qualifier.trim() || null,
          notes: notes.trim() || null,
          startDate: sinceDate,
          status,
        });

        router.back();
      } catch (error) {
        alert(t('common.error'), error instanceof Error ? error.message : t('connectionForm.updateFailed'));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Add mode - create new connection
    // A connection touching a pet — on either side — is always a 'pet' link,
    // whatever relationship pill happens to be shown.
    const relTypeFor = (id: string | null | undefined) =>
      subjectIsPet || allPeople.find((p) => p.id === id)?.entityType === 'pet'
        ? 'pet'
        : relationshipType;

    // Single person mode
    if (singlePersonMode && (singlePersonId || pendingPersonName)) {
      let targetPersonId = singlePersonId;

      // Check if connection already exists with same relationship type (only if we have an ID)
      if (targetPersonId) {
        const dupRelType = relTypeFor(targetPersonId);
        const duplicateConnection = existingConnections.find(
          (conn) =>
            ((conn.person1Id === personId && conn.person2Id === targetPersonId) ||
              (conn.person2Id === personId && conn.person1Id === targetPersonId)) &&
            conn.relationshipType === dupRelType
        );

        if (duplicateConnection) {
          alert(
            t('connectionForm.duplicateTitle'),
            t('connectionForm.duplicateMessage', {
              type: dupRelType,
              a: person?.name,
              b: selectedSinglePerson?.name,
            }),
            [{ text: t('common.ok') }]
          );
          return;
        }
      }

      // New pet/child: reject an unparseable birthday before creating anything
      if (pendingPersonName && (newEntityKind === 'pet' || newEntityKind === 'child')) {
        const trimmedBirthday = birthdayText.trim();
        if (trimmedBirthday && !parseFlexibleDate(trimmedBirthday)) {
          alert(t('connectionForm.invalidDate'), t('connectionForm.invalidDateMessage'));
          return;
        }
      }

      setIsSubmitting(true);

      try {
        // If pending person, reuse an existing entity of the same name or create one.
        if (!targetPersonId && pendingPersonName) {
          const existing = everyone.find(
            (p) => p.name.trim().toLowerCase() === pendingPersonName.trim().toLowerCase()
          );
          if (existing) {
            targetPersonId = existing.id;
          } else {
            const newPerson = await createPerson.mutateAsync(
              buildNewPersonPayload(pendingPersonName)
            );
            targetPersonId = newPerson.id;
          }
        }

        if (!targetPersonId) throw new Error('Failed to identify person');

        const effectiveRelType = relTypeFor(targetPersonId);

        await createConnection.mutateAsync({
          person1Id: personId!,
          person2Id: targetPersonId,
          relationshipType: effectiveRelType,
          status,
          qualifier: qualifier.trim() || undefined,
          notes: notes.trim() || undefined,
          startDate: sinceDate ?? undefined,
          strength: 0.5,
        });

        // Link the freshly-created child/pet to an optional co-parent / co-owner.
        if (
          secondParentId &&
          pendingPersonName &&
          (newEntityKind === 'child' || newEntityKind === 'pet')
        ) {
          await createConnection.mutateAsync({
            person1Id: secondParentId,
            person2Id: targetPersonId,
            relationshipType: newEntityKind === 'pet' ? 'pet' : 'child',
            status,
            strength: 0.5,
          });
        }

        alert(
          t('connectionForm.successTitle'),
          t('connectionForm.addedOne', {
            a: person?.name,
            b: selectedSinglePerson?.name,
            type: effectiveRelType,
          }),
          [
            {
              text: t('connectionForm.addAnother'),
              onPress: () => {
                backToMultiMode();
              },
            },
            {
              text: t('connectionForm.addDifferentType'),
              onPress: () => {
                setRelationshipType('friend');
                setStatus('active');
                setQualifier('');
                setNotes('');
                setSinceText('');
                setNewEntityKind('person');
                setSpecies('');
                setBirthdayText('');
                setSecondParentId(null);
              },
            },
            {
              text: t('connectionForm.done'),
              onPress: () => router.back(),
            },
          ]
        );
      } catch (error) {
        devLogger.error('Failed to create connection', {
          error,
          fromPersonId: personId,
          toPersonId: singlePersonId,
        });
        alert(
          t('common.error'),
          error instanceof Error ? error.message : t('connectionForm.createFailed')
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Multi-select mode
    if (selectedPersonIds.length === 0) {
      alert(t('connectionForm.selectPeopleTitle'), t('connectionForm.selectPeopleMessage'));
      return;
    }

    // Check for duplicates
    const duplicates: string[] = [];
    for (const selectedPersonId of selectedPersonIds) {
      const dupConn = existingConnections.find(
        (conn) =>
          ((conn.person1Id === personId && conn.person2Id === selectedPersonId) ||
            (conn.person2Id === personId && conn.person1Id === selectedPersonId)) &&
          conn.relationshipType === relTypeFor(selectedPersonId)
      );
      if (dupConn) {
        const selectedPerson = allPeople.find((p) => p.id === selectedPersonId);
        duplicates.push(selectedPerson?.name || t('connectionForm.unknown'));
      }
    }

    if (duplicates.length > 0) {
      alert(
        t('connectionForm.duplicatesTitle'),
        t('connectionForm.duplicatesMessage', {
          type: relationshipType,
          names: duplicates.join(', '),
        }),
        [{ text: t('common.ok') }]
      );
    }

    setIsSubmitting(true);

    try {
      // Create connections for all selected people (skip duplicates)
      const promises = selectedPersonIds
        .filter((selectedPersonId) => {
          const isDuplicate = existingConnections.find(
            (conn) =>
              ((conn.person1Id === personId && conn.person2Id === selectedPersonId) ||
                (conn.person2Id === personId && conn.person1Id === selectedPersonId)) &&
              conn.relationshipType === relTypeFor(selectedPersonId)
          );
          return !isDuplicate;
        })
        .map((selectedPersonId) =>
          createConnection.mutateAsync({
            person1Id: personId!,
            person2Id: selectedPersonId,
            relationshipType: relTypeFor(selectedPersonId),
            status,
            qualifier: qualifier.trim() || undefined,
            notes: notes.trim() || undefined,
            startDate: sinceDate ?? undefined,
            strength: 0.5,
          })
        );

      await Promise.all(promises);

      const selectedNames = selectedPersonIds
        .map((id) => allPeople.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      alert(
        t('connectionForm.successTitle'),
        t('connectionForm.addedMany', {
          count: promises.length,
          a: person?.name,
          names: selectedNames,
          type: relationshipType,
        }),
        [
          {
            text: t('connectionForm.addMore'),
            onPress: () => {
              // Reset form to add more connections
              setSelectedPersonIds([]);
              setRelationshipType('friend');
              setStatus('active');
              setQualifier('');
              setNotes('');
              setSinceText('');
              setNewEntityKind('person');
              setSpecies('');
              setBirthdayText('');
              setSecondParentId(null);
              setSearchQuery('');
            },
          },
          {
            text: t('connectionForm.done'),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      alert(t('common.error'), t('connectionForm.addFailed'));
      devLogger.error('Failed to add connection', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !connection) return;

    const connectedPerson = allPeople.find(
      (p) =>
        p.id === (connection.person1Id === personId ? connection.person2Id : connection.person1Id)
    );

    confirmDestructive({
      title: t('connectionForm.deleteTitle'),
      message: t('connectionForm.deleteMessage', { name: connectedPerson?.name }),
      onConfirm: async () => {
        try {
          await deleteConnection.mutateAsync(connectionId!);
          alert(t('common.success'), t('connectionForm.deleted'));
          router.back();
        } catch (error) {
          alert(t('common.error'), error instanceof Error ? error.message : t('connectionForm.deleteFailed'));
        }
      },
    });
  };

  // "Since" — a year is usually all anyone remembers, so quick-picks fill in the year.
  const thisYear = new Date().getFullYear();
  const sinceFields = (
    <>
      <FormInput
        label={t('connectionForm.knownSince')}
        value={sinceText}
        onChangeText={setSinceText}
        placeholder={t('connectionForm.datePlaceholder')}
        keyboardType="numbers-and-punctuation"
      />
      <View style={styles.pillRow}>
        {[
          [t('connectionForm.thisYear'), 0],
          [t('connectionForm.yearsAgo', { count: 5 }), 5],
          [t('connectionForm.yearsAgo', { count: 10 }), 10],
          [t('connectionForm.yearsAgo', { count: 20 }), 20],
        ].map(([label, ago]) => (
          <Pill
            key={ago}
            label={label as string}
            selected={sinceText === String(thisYear - (ago as number))}
            onPress={() => setSinceText(String(thisYear - (ago as number)))}
          />
        ))}
      </View>
    </>
  );

  return (
    <FormScreen
      title={mode === 'add' ? t('connectionForm.addTitle') : t('connectionForm.editTitle')}
      loading={isLoading}
      notFound={notFound}
      notFoundLabel={t('connectionForm.notFound')}
    >
      {mode === 'edit' && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    onPress={() => setMenuVisible(true)}
                    iconColor={fz.ink}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    handleDelete();
                  }}
                  title={t('connectionForm.deleteMenu')}
                  leadingIcon="delete"
                  titleStyle={styles.deleteMenuLabel}
                />
              </Menu>
            ),
          }}
        />
      )}

      <Text style={fzText.titleLg}>
        {(person?.name ?? editConnectedPerson?.name)
          ? t(mode === 'add' ? 'connectionForm.addFor' : 'connectionForm.editFor', {
              name: person?.name ?? editConnectedPerson?.name,
            })
          : mode === 'add'
            ? t('connectionForm.addTitle')
            : t('connectionForm.editTitle')}
      </Text>
      <Text style={[fzText.sub, styles.headerSub]}>
        {mode === 'add'
          ? t('connectionForm.addSubtitle')
          : t('connectionForm.editSubtitle')}
      </Text>

      {mode === 'add' && singlePersonMode && selectedSinglePerson ? (
        // Single person detailed mode (add only)
        <>
          <Button mode="text" icon="arrow-left" onPress={backToMultiMode} style={styles.backLink}>
            {t('connectionForm.backToMulti')}
          </Button>

          <View style={styles.selectedCard}>
            <View style={styles.selectedPerson}>
              <Avatar
                name={selectedSinglePerson.name}
                photoPath={selectedSinglePerson.photoPath}
                size={48}
                variant="ink"
                style={styles.cardAvatar}
              />
              <View style={styles.personInfo}>
                <Text style={fzText.name}>{selectedSinglePerson.name}</Text>
                {selectedSinglePerson.nickname && (
                  <Text style={[fzText.sub, styles.nicknameText]}>
                    "{selectedSinglePerson.nickname}"
                  </Text>
                )}
                {(selectedSinglePerson.personType || (pendingPersonName && personType)) &&
                  !ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
                    <Pill
                      label={(selectedSinglePerson.personType || personType).toUpperCase()}
                      variant={
                        (selectedSinglePerson.personType || personType) === 'primary'
                          ? 'solid'
                          : 'surface'
                      }
                      style={styles.personTypePill}
                    />
                  )}
              </View>
            </View>
          </View>

          {pendingPersonName && (
            <FormSection title={t('connectionForm.whatAdding')}>
              <View style={styles.pillRow}>
                {(subjectIsPet
                  ? (['person', 'pet'] as const)
                  : (['person', 'child', 'pet'] as const)
                ).map((kind) => (
                  <Pill
                    key={kind}
                    label={t(`connectionForm.kind.${kind}`)}
                    selected={newEntityKind === kind}
                    onPress={() => {
                      setNewEntityKind(kind);
                      if (kind === 'pet') {
                        setRelationshipType('pet');
                        setPersonType('mentioned');
                      } else if (kind === 'child') {
                        setRelationshipType('child');
                        setPersonType('mentioned');
                      } else {
                        setRelationshipType('friend');
                        setPersonType('primary');
                      }
                    }}
                  />
                ))}
              </View>
            </FormSection>
          )}

          {pendingPersonName && newEntityKind === 'pet' && (
            <FormSection title={t('connectionForm.species')}>
              <FormInput
                label={t('connectionForm.speciesLabel')}
                value={species}
                onChangeText={setSpecies}
                placeholder={t('connectionForm.speciesPlaceholder')}
              />
            </FormSection>
          )}

          {pendingPersonName && (newEntityKind === 'pet' || newEntityKind === 'child') && (
            <FormSection title={t('connectionForm.birthdayOptional')}>
              <FormInput
                label={t('connectionForm.birthday')}
                value={birthdayText}
                onChangeText={setBirthdayText}
                placeholder={t('connectionForm.datePlaceholder')}
              />
            </FormSection>
          )}

          {pendingPersonName && (newEntityKind === 'pet' || newEntityKind === 'child') && (
            <FormSection
              title={newEntityKind === 'pet' ? t('connectionForm.otherOwner') : t('connectionForm.otherParent')}
            >
              {/* ponytail: plain Menu list; swap for a search field if the people list grows large. */}
              <Menu
                visible={parentMenuVisible}
                onDismiss={() => setParentMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="account-plus"
                    textColor={fz.ink}
                    onPress={() => setParentMenuVisible(true)}
                  >
                    {secondParentId
                      ? (allPeople.find((p) => p.id === secondParentId)?.name ?? t('connectionForm.selected'))
                      : newEntityKind === 'pet'
                        ? t('connectionForm.linkOwner')
                        : t('connectionForm.linkParent')}
                  </Button>
                }
              >
                {secondParentId && (
                  <Menu.Item
                    leadingIcon="close"
                    title={t('connectionForm.none')}
                    onPress={() => {
                      setSecondParentId(null);
                      setParentMenuVisible(false);
                    }}
                  />
                )}
                {availablePeople
                  .filter((p) => p.entityType !== 'pet')
                  .map((p) => (
                    <Menu.Item
                      key={p.id}
                      title={p.name}
                      onPress={() => {
                        setSecondParentId(p.id);
                        setParentMenuVisible(false);
                      }}
                    />
                  ))}
              </Menu>
            </FormSection>
          )}

          {pendingPersonName &&
            newEntityKind === 'person' &&
            !ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
              <FormSection title={t('connectionForm.personType')}>
                <View style={styles.pillRow}>
                  <Pill
                    label={t('connectionForm.primary')}
                    selected={personType === 'primary'}
                    onPress={() => setPersonType('primary')}
                  />
                  <Pill
                    label={t('connectionForm.mentioned')}
                    selected={personType === 'mentioned'}
                    onPress={() => setPersonType('mentioned')}
                  />
                </View>
                <Text style={[fzText.sub, styles.pillHint]}>
                  {personType === 'primary'
                    ? t('connectionForm.primaryHint')
                    : t('connectionForm.mentionedHint')}
                </Text>
              </FormSection>
            )}

          {newEntityKind === 'person' && !hideRelationshipType && (
            <FormSection title={t('connectionForm.relationshipType')}>
              <RelationshipTypePicker
                value={relationshipType}
                onChange={(v) => {
                  const next = v as ConnectionRelationshipType;
                  setRelationshipType(next);
                  if (pendingPersonName) {
                    if (ALWAYS_PRIMARY_RELATIONSHIPS.includes(next)) {
                      setPersonType('primary');
                    } else if (next === 'acquaintance') {
                      setPersonType('mentioned');
                    } else {
                      setPersonType('primary');
                    }
                  }
                }}
              />
              {pendingPersonName && personType === 'mentioned' && (
                <Text style={[fzText.sub, styles.pillHint]}>
                  {t('connectionForm.createdMentioned')}
                </Text>
              )}
            </FormSection>
          )}

          <FormSection title={t('connectionForm.status')}>
            <View style={styles.pillRow}>
              {(['active', 'inactive', 'complicated'] as const).map((s) => (
                <Pill
                  key={s}
                  label={t(`connectionForm.statuses.${s}`)}
                  selected={status === s}
                  onPress={() => setStatus(s as ConnectionStatus)}
                />
              ))}
            </View>
          </FormSection>

          <FormSection title={t('connectionForm.additional')}>
            <FormInput
              label={t('connectionForm.qualifierShort')}
              value={qualifier}
              onChangeText={setQualifier}
              placeholder={t('connectionForm.qualifierShortPlaceholder')}
            />
            {sinceFields}
            <FormInput
              label={t('person.connectionNotes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder={t('connectionForm.notesExample')}
              style={styles.lastInput}
            />
          </FormSection>
        </>
      ) : (
        // Form mode (edit) or multi-select mode (add)
        <>
          {mode === 'edit' && editConnectedPerson && (
            <TouchableOpacity
              style={styles.selectedCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/person/${editConnectedPerson.id}`)}
            >
              <View style={styles.selectedPerson}>
                <Avatar
                  name={editConnectedPerson.name}
                  photoPath={editConnectedPerson.photoPath}
                  size={48}
                  variant="ink"
                  style={styles.cardAvatar}
                />
                <View style={styles.personInfo}>
                  <Text style={fzText.name}>{editConnectedPerson.name}</Text>
                  <Text style={[fzText.sub, styles.nicknameText]}>
                    {connection
                      ? describeConnection(
                          connection,
                          editConnectedPerson,
                          fromPersonId ?? connection.person1Id
                        )
                      : `${relationshipType}${qualifier ? ` • ${qualifier}` : ''}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Add mode: pick the people first, then define the relationship below. */}
          {mode === 'add' && !singlePersonMode && (
            <FormSection title={t('connectionForm.selectPeople')}>
              <FormInput
                placeholder={t('connectionForm.searchPlaceholder')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                left={<TextInput.Icon icon="magnify" />}
              />

              {searchQuery.trim().length === 0 && (
                <Text style={[fzText.sub, styles.searchHint]}>
                  {t('connectionForm.searchHint')}
                </Text>
              )}

              {loadingPeople && (
                <CenteredContainer style={styles.centered}>
                  <ActivityIndicator color={fz.ink} />
                </CenteredContainer>
              )}

              {searchQuery.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={handleCreateAndSelectPerson}
                  activeOpacity={0.7}
                >
                  <View style={[styles.listAvatar, { backgroundColor: fz.ink }]}>
                    <LineIcon name="plus" size={16} color="#fff" />
                  </View>
                  <View style={styles.listRowBody}>
                    <Text style={fzText.name}>{t('connectionForm.addNamed', { name: searchQuery })}</Text>
                    <Text style={fzText.sub}>{t('connectionForm.newPersonOrPet')}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {selectedPersonIds.length > 0 && (
                <View style={styles.pillRow}>
                  {selectedPersonIds.map((id) => {
                    const person = allPeople.find((p) => p.id === id);
                    return person ? (
                      <Pill
                        key={id}
                        label={person.name}
                        onClose={() => togglePersonSelection(id)}
                      />
                    ) : null;
                  })}
                </View>
              )}

              {availablePeople.length === 0 && !loadingPeople && !searchQuery && (
                <Text style={[fzText.sub, styles.emptyText]}>
                  {t('connectionForm.noOthers')}
                </Text>
              )}

              {availablePeople.length > 0 && (
                <ScrollView style={styles.peopleList} nestedScrollEnabled>
                  {availablePeople.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.listRow}
                      activeOpacity={0.7}
                      onPress={() => togglePersonSelection(p.id)}
                    >
                      <TouchableOpacity onPress={() => selectSinglePerson(p.id)}>
                        <Avatar name={p.name} photoPath={p.photoPath} />
                      </TouchableOpacity>
                      <View style={styles.listRowBody}>
                        <Text style={fzText.name}>{p.name}</Text>
                        <Text style={fzText.sub}>{p.nickname || p.relationshipType}</Text>
                      </View>
                      <Checkbox
                        status={selectedPersonIds.includes(p.id) ? 'checked' : 'unchecked'}
                        color={fz.ink}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </FormSection>
          )}

          {/* Relationship + status: always in edit; in add only once people are picked. */}
          {(mode === 'edit' || selectedPersonIds.length > 0) && (
            <>
              {/* Pet connections aren't human relationship types — no pill picker */}
              {RELATIONSHIP_TYPE_VALUES.has(relationshipType) && !hideRelationshipType && (
                <FormSection title={t('connectionForm.relationshipType')}>
                  <RelationshipTypePicker
                    value={relationshipType}
                    onChange={handleRelationshipTypeChange}
                  />
                </FormSection>
              )}

              <FormSection title={t('connectionForm.connectionStatus')}>
                <View style={styles.pillRow}>
                  {CONNECTION_STATUSES.map((s) => (
                    <Pill
                      key={s.value}
                      label={t(`connectionForm.statuses.${s.value}`, { defaultValue: s.label })}
                      selected={status === s.value}
                      onPress={() => handleStatusChange(s.value)}
                    />
                  ))}
                </View>

                <FormInput
                  label={t('connectionForm.qualifierLong')}
                  placeholder={t('connectionForm.qualifierLongPlaceholder')}
                  value={qualifier}
                  onChangeText={setQualifier}
                  style={styles.qualifierInput}
                />

                {sinceFields}
                <FormInput
                  label={t('person.connectionNotes')}
                  placeholder={t('connectionForm.notesPlaceholder')}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={styles.lastInput}
                />
              </FormSection>
            </>
          )}
        </>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={
          isSubmitting || (mode === 'add' && !singlePersonMode && selectedPersonIds.length === 0)
        }
        buttonColor={fz.ink}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        labelStyle={fzText.btn}
      >
        {mode === 'add'
          ? singlePersonMode
            ? t('connectionForm.submitOne')
            : t('connectionForm.submitMany', { count: selectedPersonIds.length })
          : t('connectionForm.update')}
      </Button>

      <Button
        mode="text"
        onPress={() => router.back()}
        disabled={isSubmitting}
        textColor={fz.textMute}
      >
        {t('common.cancel')}
      </Button>
      {dialog}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  headerSub: {
    marginTop: 6,
    marginBottom: fz.s.lg,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    marginLeft: -8,
  },
  centered: {
    padding: 20,
  },
  selectedCard: {
    backgroundColor: fz.card,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    borderRadius: fz.rCard,
    padding: fz.s.xl,
    marginBottom: fz.s.lg,
  },
  selectedPerson: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    marginRight: 12,
  },
  personInfo: {
    flex: 1,
  },
  nicknameText: {
    fontStyle: 'italic',
    marginTop: 2,
  },
  personTypePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pillHint: {
    marginTop: 10,
  },
  qualifierInput: {
    marginTop: fz.s.md,
  },
  lastInput: {
    marginBottom: 0,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
  },
  searchHint: {
    marginTop: 8,
    marginBottom: 4,
  },
  peopleList: {
    maxHeight: 320,
    marginTop: fz.s.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  listRowBody: {
    flex: 1,
    minWidth: 0,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: fz.rButton,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  deleteMenuLabel: {
    color: '#d32f2f',
  },
});
