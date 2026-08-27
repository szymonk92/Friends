import CenteredContainer from '@/components/CenteredContainer';
import { useLocalSearchParams, Stack } from 'expo-router';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  Checkbox,
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
import { getInitials } from '@/lib/utils/format';
import { parseFlexibleDate } from '@/lib/utils/dates';
import { RELATIONSHIP_TYPES, CONNECTION_STATUSES } from '@/lib/constants/relations';
import { db } from '@/lib/db';
import { connections, type Connection } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { LineIcon } from '@/components/LineIcon';
import { FormSection, FormInput } from '@/components/FormKit';

type ConnectionFormMode = 'add' | 'edit';
type ConnectionRelationshipType = NonNullable<Connection['relationshipType']>;
type ConnectionStatus = NonNullable<Connection['status']>;

type SelectablePerson = Pick<
  PersonWithPhoto,
  'id' | 'name' | 'nickname' | 'personType' | 'relationshipType'
>;

interface ConnectionFormProps {
  mode: ConnectionFormMode;
}

export default function ConnectionForm({ mode }: ConnectionFormProps) {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const personId = mode === 'add' ? (params.personId as string) : undefined;
  const connectionId = mode === 'edit' ? (params.connectionId as string) : undefined;

  const { data: person } = usePerson(personId!);
  const { data: regularPeople = [], isLoading: loadingPeople } = usePeople();
  const { data: mePerson } = useMePerson();
  const { data: existingConnections = [] } = usePersonConnections(personId!);
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const deleteConnection = useDeleteConnection();
  const createPerson = useCreatePerson();

  // Edit mode state
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'edit');

  // Form state
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [singlePersonMode, setSinglePersonMode] = useState(false);
  const [singlePersonId, setSinglePersonId] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState<ConnectionRelationshipType>('friend');
  const [status, setStatus] = useState<ConnectionStatus>('active');
  const [qualifier, setQualifier] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPersonName, setPendingPersonName] = useState<string | null>(null);
  const [personType, setPersonType] = useState<'primary' | 'mentioned'>('primary');
  const [newEntityKind, setNewEntityKind] = useState<'person' | 'pet' | 'child'>('person');
  const [species, setSpecies] = useState('');
  const [birthdayText, setBirthdayText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ALWAYS_PRIMARY_RELATIONSHIPS: ConnectionRelationshipType[] = ['partner', 'friend', 'family'];
  const RELATIONSHIP_TYPE_VALUES = useMemo(
    () => new Set(RELATIONSHIP_TYPES.map((type) => type.value as ConnectionRelationshipType)),
    []
  );
  const CONNECTION_STATUS_VALUES = useMemo(
    () => new Set(CONNECTION_STATUSES.map((connectionStatus) => connectionStatus.value as ConnectionStatus)),
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
    const requested = typeof params.relationshipType === 'string' ? params.relationshipType : undefined;
    if (requested && RELATIONSHIP_TYPE_VALUES.has(requested as ConnectionRelationshipType)) {
      setRelationshipType(requested as ConnectionRelationshipType);
    }
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load connection data for edit mode
  useEffect(() => {
    if (mode === 'edit' && connectionId) {
      const loadConnection = async () => {
        try {
          const result = await db
            .select()
            .from(connections)
            .where(eq(connections.id, connectionId))
            .limit(1);

          if (result.length === 0) {
            Alert.alert('Error', 'Connection not found');
            router.back();
            return;
          }

          const conn = result[0];
          setConnection(conn);

          setRelationshipType(conn.relationshipType || 'friend');
          setQualifier(conn.qualifier || '');
          setStatus(conn.status || 'active');
          setNotes(conn.notes || '');
        } catch (error) {
          devLogger.error('Failed to load connection for editing', { error, connectionId });
          Alert.alert('Error', 'Failed to load connection');
          router.back();
        } finally {
          setIsLoading(false);
        }
      };

      loadConnection();
    }
  }, [mode, connectionId]);

  // Combine regular people with ME
  const allPeople = useMemo(() => {
    const combined = [...regularPeople];
    if (mePerson) {
      combined.push({
        ...mePerson,
        photoPath: null,
      } as PersonWithPhoto);
    }
    return combined;
  }, [regularPeople, mePerson]);

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
    setNewEntityKind('person');
    setSpecies('');
    setBirthdayText('');
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
          status,
        });

        router.back();
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update connection');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Add mode - create new connection
    // Single person mode
    if (singlePersonMode && (singlePersonId || pendingPersonName)) {
      let targetPersonId = singlePersonId;

      // Check if connection already exists with same relationship type (only if we have an ID)
      if (targetPersonId) {
        const duplicateConnection = existingConnections.find(
          (conn) =>
            ((conn.person1Id === personId && conn.person2Id === targetPersonId) ||
              (conn.person2Id === personId && conn.person1Id === targetPersonId)) &&
            conn.relationshipType === relationshipType
        );

        if (duplicateConnection) {
          Alert.alert(
            'Duplicate Connection',
            `A ${relationshipType} connection already exists between ${person?.name} and ${selectedSinglePerson?.name}. You can add a different relationship type or edit the existing one.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // New pet/child: reject an unparseable birthday before creating anything
      if (pendingPersonName && (newEntityKind === 'pet' || newEntityKind === 'child')) {
        const trimmedBirthday = birthdayText.trim();
        if (trimmedBirthday && !parseFlexibleDate(trimmedBirthday)) {
          Alert.alert('Invalid Date', 'Enter date as YYYY, YYYY-MM, or YYYY-MM-DD');
          return;
        }
      }

      setIsSubmitting(true);

      try {
        // If pending person, create them first
        if (!targetPersonId && pendingPersonName) {
          const newPerson = await createPerson.mutateAsync(buildNewPersonPayload(pendingPersonName));
          targetPersonId = newPerson.id;
        }

        if (!targetPersonId) throw new Error('Failed to identify person');

        await createConnection.mutateAsync({
          person1Id: personId!,
          person2Id: targetPersonId,
          relationshipType,
          status,
          qualifier: qualifier.trim() || undefined,
          notes: notes.trim() || undefined,
          strength: 0.5,
        });

        Alert.alert(
          'Success!',
          `Connection added: ${person?.name} ↔️ ${selectedSinglePerson?.name} (${relationshipType})`,
          [
            {
              text: 'Add Another',
              onPress: () => {
                backToMultiMode();
              },
            },
            {
              text: 'Add Different Type',
              onPress: () => {
                setRelationshipType('friend');
                setStatus('active');
                setQualifier('');
                setNotes('');
                setNewEntityKind('person');
                setSpecies('');
                setBirthdayText('');
              },
            },
            {
              text: 'Done',
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
        Alert.alert('Error', 'Failed to create connection. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Multi-select mode
    if (selectedPersonIds.length === 0) {
      Alert.alert('Select People', 'Please select at least one person to connect to.');
      return;
    }

    // Check for duplicates
    const duplicates: string[] = [];
    for (const selectedPersonId of selectedPersonIds) {
      const dupConn = existingConnections.find(
        (conn) =>
          ((conn.person1Id === personId && conn.person2Id === selectedPersonId) ||
            (conn.person2Id === personId && conn.person1Id === selectedPersonId)) &&
          conn.relationshipType === relationshipType
      );
      if (dupConn) {
        const selectedPerson = allPeople.find((p) => p.id === selectedPersonId);
        duplicates.push(selectedPerson?.name || 'Unknown');
      }
    }

    if (duplicates.length > 0) {
      Alert.alert(
        'Duplicate Connections',
        `${relationshipType} connection already exists with: ${duplicates.join(', ')}. They will be skipped.`,
        [{ text: 'OK' }]
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
              conn.relationshipType === relationshipType
          );
          return !isDuplicate;
        })
        .map((selectedPersonId) =>
          createConnection.mutateAsync({
            person1Id: personId!,
            person2Id: selectedPersonId,
            relationshipType,
            status,
            qualifier: qualifier.trim() || undefined,
            notes: notes.trim() || undefined,
            strength: 0.5,
          })
        );

      await Promise.all(promises);

      const selectedNames = selectedPersonIds
        .map((id) => allPeople.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      Alert.alert(
        'Success!',
        `Added ${promises.length} connection(s): ${person?.name} ↔️ ${selectedNames} (${relationshipType})`,
        [
          {
            text: 'Add More',
            onPress: () => {
              // Reset form to add more connections
              setSelectedPersonIds([]);
              setRelationshipType('friend');
              setStatus('active');
              setQualifier('');
              setNotes('');
              setNewEntityKind('person');
              setSpecies('');
              setBirthdayText('');
              setSearchQuery('');
            },
          },
          {
            text: 'Done',
            onPress: () => router.back(),
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add connection. Please try again.');
      devLogger.error('Failed to add connection', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !connection) return;

    const connectedPerson = allPeople.find(
      (p) =>
        p.id ===
        (connection.person1Id === personId
          ? connection.person2Id
          : connection.person1Id)
    );

    Alert.alert(
      'Delete Connection',
      `Are you sure you want to delete the connection with ${connectedPerson?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConnection.mutateAsync(connectionId!);
              Alert.alert('Success', 'Connection deleted successfully!');
              router.back();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete connection');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <CenteredContainer>
        <ActivityIndicator />
      </CenteredContainer>
    );
  }

  if (mode === 'edit' && !connection) {
    return (
      <CenteredContainer>
        <Text>Connection not found</Text>
      </CenteredContainer>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: mode === 'add' ? 'Add Connection' : 'Edit Connection',
          headerStyle: { backgroundColor: fz.paper },
          headerTintColor: fz.ink,
          headerTitleStyle: { fontFamily: fz.font, fontWeight: '600', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + fz.s.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={fzText.titleLg}>
            {mode === 'add' ? 'Add Connection' : 'Edit Connection'} for {person?.name}
          </Text>
          <Text style={[fzText.sub, styles.headerSub]}>
            {mode === 'add'
              ? 'Select multiple people or tap one for a detailed connection'
              : 'Update connection details'}
          </Text>

          {mode === 'add' && singlePersonMode && selectedSinglePerson ? (
            // Single person detailed mode (add only)
            <>
              <Button mode="text" icon="arrow-left" onPress={backToMultiMode} style={styles.backLink}>
                Back to Multi-Select
              </Button>

              <View style={styles.selectedCard}>
                <View style={styles.selectedPerson}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(selectedSinglePerson.name)}</Text>
                  </View>
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
                          variant={(selectedSinglePerson.personType || personType) === 'primary' ? 'solid' : 'surface'}
                          style={styles.personTypePill}
                        />
                      )}
                  </View>
                </View>
              </View>

              {pendingPersonName && (
                <FormSection title="What are you adding?">
                  <View style={styles.pillRow}>
                    {(['person', 'pet', 'child'] as const).map((kind) => (
                      <Pill
                        key={kind}
                        label={kind === 'person' ? 'Person' : kind === 'pet' ? 'Pet' : 'Child'}
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
                <FormSection title="Species">
                  <FormInput
                    label="Species (e.g. Dog, Cat, Parrot)"
                    value={species}
                    onChangeText={setSpecies}
                    placeholder="Dog"
                  />
                </FormSection>
              )}

              {pendingPersonName && (newEntityKind === 'pet' || newEntityKind === 'child') && (
                <FormSection title="Birthday (optional)">
                  <FormInput
                    label="Birthday"
                    value={birthdayText}
                    onChangeText={setBirthdayText}
                    placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
                  />
                </FormSection>
              )}

              {pendingPersonName && newEntityKind === 'person' && !ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
                <FormSection title="Person Type">
                  <View style={styles.pillRow}>
                    <Pill
                      label="Primary"
                      selected={personType === 'primary'}
                      onPress={() => setPersonType('primary')}
                    />
                    <Pill
                      label="Mentioned"
                      selected={personType === 'mentioned'}
                      onPress={() => setPersonType('mentioned')}
                    />
                  </View>
                  <Text style={[fzText.sub, styles.pillHint]}>
                    {personType === 'primary'
                      ? 'Visible in main lists and search.'
                      : 'Hidden from main lists, used for context only.'}
                  </Text>
                </FormSection>
              )}

              {newEntityKind === 'person' && (
                <FormSection title="Relationship Type">
                  <View style={styles.pillRow}>
                    {RELATIONSHIP_TYPES.map((type) => (
                      <Pill
                        key={type.value}
                        label={type.label}
                        selected={relationshipType === type.value}
                        onPress={() => {
                          setRelationshipType(type.value);
                          if (pendingPersonName) {
                            if (ALWAYS_PRIMARY_RELATIONSHIPS.includes(type.value)) {
                              setPersonType('primary');
                            } else if (type.value === 'acquaintance') {
                              setPersonType('mentioned');
                            } else {
                              setPersonType('primary');
                            }
                          }
                        }}
                      />
                    ))}
                  </View>
                  {pendingPersonName && personType === 'mentioned' && (
                    <Text style={[fzText.sub, styles.pillHint]}>
                      This person will be created as "Mentioned" (hidden).
                    </Text>
                  )}
                </FormSection>
              )}

              <FormSection title="Status">
                <View style={styles.pillRow}>
                  {['active', 'inactive', 'complicated'].map((s) => (
                    <Pill key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={status === s} onPress={() => setStatus(s as ConnectionStatus)} />
                  ))}
                </View>
              </FormSection>

              <FormSection title="Additional Details">
                <FormInput
                  label="Qualifier (e.g., best, close, ex)"
                  value={qualifier}
                  onChangeText={setQualifier}
                  placeholder="How to qualify this relationship"
                />
                <FormInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="Any additional context"
                  style={styles.lastInput}
                />
              </FormSection>
            </>
          ) : (
            // Form mode (edit) or multi-select mode (add)
            <>
              <FormSection title="Relationship Type">
                <View style={styles.pillRow}>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <Pill
                      key={type.value}
                      label={type.label}
                      selected={relationshipType === type.value}
                      onPress={() => handleRelationshipTypeChange(type.value)}
                    />
                  ))}
                </View>
              </FormSection>

              <FormSection title="Connection Status">
                <View style={styles.pillRow}>
                  {CONNECTION_STATUSES.map((s) => (
                    <Pill key={s.value} label={s.label} selected={status === s.value} onPress={() => handleStatusChange(s.value)} />
                  ))}
                </View>

                <FormInput
                  label="Qualifier (married, sibling, etc.)"
                  placeholder="e.g., childhood friend, work colleague, cousin"
                  value={qualifier}
                  onChangeText={setQualifier}
                  style={styles.qualifierInput}
                />

                <FormInput
                  label="Notes (optional)"
                  placeholder="Where they met, how they get on, past history..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={styles.lastInput}
                />
              </FormSection>

              {mode === 'edit' && (
                <View style={styles.topButtons}>
                  <Button
                    mode="outlined"
                    onPress={handleDelete}
                    style={[styles.button, styles.deleteButton]}
                    textColor="#d32f2f"
                    labelStyle={[fzText.btnOutline, styles.deleteLabel]}
                  >
                    Delete
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => router.back()}
                    style={styles.button}
                    textColor={fz.ink}
                    labelStyle={fzText.btnOutline}
                  >
                    Cancel
                  </Button>
                </View>
              )}
            </>
          )}

          {mode === 'add' && (
            <FormSection title="Select People">
              <FormInput
                placeholder="Search people..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                left={<TextInput.Icon icon="magnify" />}
              />

              {loadingPeople && (
                <CenteredContainer style={styles.centered}>
                  <ActivityIndicator color={fz.ink} />
                </CenteredContainer>
              )}

              {searchQuery.trim().length > 0 && (
                <TouchableOpacity style={styles.listRow} onPress={handleCreateAndSelectPerson} activeOpacity={0.7}>
                  <View style={[styles.listAvatar, { backgroundColor: fz.ink }]}>
                    <LineIcon name="plus" size={16} color="#fff" />
                  </View>
                  <View style={styles.listRowBody}>
                    <Text style={fzText.name}>Add "{searchQuery}"</Text>
                    <Text style={fzText.sub}>Create new person and connect</Text>
                  </View>
                </TouchableOpacity>
              )}

              {selectedPersonIds.length > 0 && (
                <View style={styles.pillRow}>
                  {selectedPersonIds.map((id) => {
                    const person = allPeople.find((p) => p.id === id);
                    return person ? (
                      <Pill key={id} label={person.name} onClose={() => togglePersonSelection(id)} />
                    ) : null;
                  })}
                </View>
              )}

              {availablePeople.length === 0 && !loadingPeople && !searchQuery && (
                <Text style={[fzText.sub, styles.emptyText]}>
                  No other people found. Add more people first.
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
                        <View style={styles.listAvatarFallback}>
                          <Text style={styles.listAvatarText}>{getInitials(p.name)}</Text>
                        </View>
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

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={
              isSubmitting ||
              (mode === 'add' && !singlePersonMode && selectedPersonIds.length === 0)
            }
            buttonColor={fz.ink}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={fzText.btn}
          >
            {mode === 'add'
              ? `Add ${singlePersonMode ? 'Connection' : `${selectedPersonIds.length} Connection(s)`}`
              : 'Update Connection'}
          </Button>

          <Button mode="text" onPress={() => router.back()} disabled={isSubmitting} textColor={fz.textMute}>
            Cancel
          </Button>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fz.paper,
  },
  content: {
    padding: fz.s.edge,
  },
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fz.font,
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
  listAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: fz.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listAvatarText: {
    color: fz.ink,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fz.font,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: fz.rButton,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: fz.s.lg,
  },
  deleteButton: {
    flex: 1,
    borderColor: '#d32f2f',
  },
  deleteLabel: {
    color: '#d32f2f',
  },
  button: {
    flex: 1,
    minWidth: 80,
    borderColor: fz.outline,
  },
});
