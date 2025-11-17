import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Button,
  Divider,
  List,
  IconButton,
  FAB,
  Portal,
  Dialog,
  TextInput as PaperInput,
  SegmentedButtons,
} from 'react-native-paper';
import { useState } from 'react';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePerson, useDeletePerson, usePeople, useUpdatePerson } from '@/hooks/usePeople';
import { usePersonRelations, useDeleteRelation, useCreateRelation } from '@/hooks/useRelations';
import { usePersonConnections, useDeleteConnection } from '@/hooks/useConnections';
import { useCreateContactEvent } from '@/hooks/useContactEvents';
import {
  usePersonGiftIdeas,
  useCreateGiftIdea,
  useUpdateGiftIdea,
  useDeleteGiftIdea,
} from '@/hooks/useGifts';
import { usePersonTags, useAddTagToPerson, useRemoveTagFromPerson, useAllTags } from '@/hooks/useTags';
import {
  usePersonPhotos,
  useAddPhotoToPerson,
  useTakePhoto,
  useSetProfilePhoto,
  useDeletePhoto,
} from '@/hooks/usePhotos';
import { useCreateContactReminder } from '@/hooks/useReminders';
import {
  getInitials,
  formatRelativeTime,
  formatRelationType,
  getRelationEmoji,
  formatShortDate,
} from '@/lib/utils/format';

// Priority order for relation types (higher priority = shown first)
const RELATION_TYPE_PRIORITY: Record<string, number> = {
  CARES_FOR: 100,
  DEPENDS_ON: 95,
  STRUGGLES_WITH: 90,
  FEARS: 85,
  WANTS_TO_ACHIEVE: 80,
  IS: 75,
  HAS_SKILL: 70,
  REGULARLY_DOES: 65,
  KNOWS: 60,
  BELIEVES: 55,
  LIKES: 50,
  PREFERS_OVER: 45,
  ASSOCIATED_WITH: 40,
  EXPERIENCED: 35,
  OWNS: 30,
  UNCOMFORTABLE_WITH: 25,
  SENSITIVE_TO: 20,
  DISLIKES: 10,
  USED_TO_BE: 5,
  UNKNOWN: 0,
};

export default function PersonProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: person, isLoading: personLoading } = usePerson(id!);
  const { data: personRelations, isLoading: relationsLoading } = usePersonRelations(id!);
  const { data: personConnections, isLoading: connectionsLoading } = usePersonConnections(id!);
  const { data: allPeople = [] } = usePeople();
  const deletePerson = useDeletePerson();
  const updatePerson = useUpdatePerson();
  const deleteRelation = useDeleteRelation();
  const deleteConnection = useDeleteConnection();
  const createContactEvent = useCreateContactEvent();
  const createRelation = useCreateRelation();
  const { data: giftIdeas = [] } = usePersonGiftIdeas(id!);
  const createGiftIdea = useCreateGiftIdea();
  const updateGiftIdea = useUpdateGiftIdea();
  const deleteGiftIdea = useDeleteGiftIdea();
  const { data: personTags = [] } = usePersonTags(id!);
  const { data: allTags = [] } = useAllTags();
  const addTagToPerson = useAddTagToPerson();
  const removeTagFromPerson = useRemoveTagFromPerson();
  const { data: personPhotos = [] } = usePersonPhotos(id!);
  const addPhotoToPerson = useAddPhotoToPerson();
  const takePhoto = useTakePhoto();
  const setProfilePhoto = useSetProfilePhoto();
  const deletePhoto = useDeletePhoto();
  const createContactReminder = useCreateContactReminder();

  const [addDateDialogVisible, setAddDateDialogVisible] = useState(false);
  const [dateName, setDateName] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [isAddingDate, setIsAddingDate] = useState(false);

  // Tag dialog state
  const [addTagDialogVisible, setAddTagDialogVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Gift dialog state
  const [addGiftDialogVisible, setAddGiftDialogVisible] = useState(false);
  const [giftItem, setGiftItem] = useState('');
  const [giftNotes, setGiftNotes] = useState('');
  const [giftPriority, setGiftPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [giftOccasion, setGiftOccasion] = useState('');
  const [isAddingGift, setIsAddingGift] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete ${person?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePerson.mutateAsync(id!);
            router.back();
          },
        },
      ]
    );
  };

  const handleDeleteRelation = (relationId: string, objectLabel: string) => {
    Alert.alert('Delete Relation', `Are you sure you want to delete "${objectLabel}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRelation.mutateAsync(relationId);
        },
      },
    ]);
  };

  const handleDeleteConnection = (connectionId: string, personName: string) => {
    Alert.alert(
      'Delete Connection',
      `Are you sure you want to remove the connection with ${personName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteConnection.mutateAsync(connectionId);
          },
        },
      ]
    );
  };

  const getConnectedPerson = (connection: any) => {
    const connectedId =
      connection.person1Id === id ? connection.person2Id : connection.person1Id;
    return allPeople.find((p) => p.id === connectedId);
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Profile Photo',
      'Choose how to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const result = await takePhoto.mutateAsync({ personId: id! });
              await setProfilePhoto.mutateAsync({ personId: id!, photoId: result.id });
              Alert.alert('Success', 'Profile photo updated!');
            } catch (error: any) {
              if (!error.message.includes('cancelled')) {
                Alert.alert('Error', error.message || 'Failed to take photo');
              }
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            try {
              const result = await addPhotoToPerson.mutateAsync({ personId: id! });
              await setProfilePhoto.mutateAsync({ personId: id!, photoId: result.id });
              Alert.alert('Success', 'Profile photo updated!');
            } catch (error: any) {
              if (!error.message.includes('cancelled')) {
                Alert.alert('Error', error.message || 'Failed to add photo');
              }
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Get the profile photo path
  const profilePhoto = person?.photoId
    ? personPhotos.find((p) => p.id === person.photoId)
    : null;

  const handleQuickAction = async (eventType: string, label: string) => {
    try {
      await createContactEvent.mutateAsync({
        personId: id!,
        eventType: eventType as any,
        eventDate: new Date(),
        notes: `Quick logged: ${label}`,
      });
      Alert.alert('Logged!', `${label} with ${person?.name} recorded.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to log event');
    }
  };

  const parseFlexibleDate = (input: string): Date | null => {
    const trimmed = input.trim();
    const parts = trimmed.split('-').map((p) => parseInt(p, 10));

    if (parts.length === 1 && parts[0] >= 1900 && parts[0] <= 2100) {
      return new Date(parts[0], 0, 1);
    } else if (parts.length === 2 && parts[0] >= 1900 && parts[1] >= 1 && parts[1] <= 12) {
      return new Date(parts[0], parts[1] - 1, 1);
    } else if (parts.length === 3 && parts[0] >= 1900 && parts[1] >= 1 && parts[2] >= 1) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  };

  const handleAddImportantDate = async () => {
    if (!dateName.trim()) {
      Alert.alert('Error', 'Please enter a name for this date');
      return;
    }
    const parsedDate = parseFlexibleDate(dateValue);
    if (!parsedDate) {
      Alert.alert('Invalid Date', 'Enter date as YYYY, YYYY-MM, or YYYY-MM-DD');
      return;
    }

    // Check if this is a birthday
    const birthdayKeywords = ['birthday', 'b-day', 'bday', 'birth day', 'birth-day', 'dob', 'date of birth'];
    const isBirthday = birthdayKeywords.some((keyword) =>
      dateName.trim().toLowerCase().includes(keyword)
    );

    // Check if this is an anniversary
    const anniversaryKeywords = ['anniversary', 'wedding', 'married'];
    const isAnniversary = anniversaryKeywords.some((keyword) =>
      dateName.trim().toLowerCase().includes(keyword)
    );

    setIsAddingDate(true);
    try {
      if (isBirthday) {
        // Update the person's dateOfBirth field
        await updatePerson.mutateAsync({
          id: id!,
          dateOfBirth: parsedDate,
        });
        setAddDateDialogVisible(false);
        setDateName('');
        setDateValue('');
        Alert.alert('Success', `Birthday set to ${formatShortDate(parsedDate)}!`);
      } else {
        // Add as regular important date (with special handling for anniversaries)
        await createRelation.mutateAsync({
          subjectId: id!,
          relationType: 'HAS_IMPORTANT_DATE',
          objectLabel: isAnniversary ? `Anniversary: ${dateName.trim()}` : dateName.trim(),
          validFrom: parsedDate,
          category: 'important_date',
          source: 'manual',
          intensity: 'strong',
          confidence: 1.0,
        });
        setAddDateDialogVisible(false);
        setDateName('');
        setDateValue('');
        Alert.alert('Success', `${dateName} added to important dates!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add important date');
    } finally {
      setIsAddingDate(false);
    }
  };

  // Get important dates from relations
  const importantDates = personRelations?.filter((r) => r.relationType === 'HAS_IMPORTANT_DATE') || [];

  const handleAddGiftIdea = async () => {
    if (!giftItem.trim()) {
      Alert.alert('Error', 'Please enter a gift idea');
      return;
    }

    setIsAddingGift(true);
    try {
      await createGiftIdea.mutateAsync({
        personId: id!,
        item: giftItem.trim(),
        notes: giftNotes.trim() || undefined,
        priority: giftPriority,
        occasion: giftOccasion.trim() || undefined,
      });
      setAddGiftDialogVisible(false);
      setGiftItem('');
      setGiftNotes('');
      setGiftPriority('medium');
      setGiftOccasion('');
      Alert.alert('Success', 'Gift idea added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add gift idea');
    } finally {
      setIsAddingGift(false);
    }
  };

  const handleMarkGiftGiven = (giftId: string, item: string) => {
    Alert.alert('Mark as Given', `Mark "${item}" as given?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Given',
        onPress: () => updateGiftIdea.mutateAsync({ id: giftId, given: true }),
      },
    ]);
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    setIsAddingTag(true);
    try {
      await addTagToPerson.mutateAsync({ personId: id!, tag: newTagName.trim() });
      setAddTagDialogVisible(false);
      setNewTagName('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add tag');
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tag: string) => {
    Alert.alert('Remove Tag', `Remove "${tag}" from ${person?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeTagFromPerson.mutateAsync({ personId: id!, tag }),
      },
    ]);
  };

  // Filter out tags that are already assigned to this person
  const availableTags = allTags.filter((tag) => !personTags.includes(tag));

  const handleSetReminder = () => {
    Alert.alert(
      'Set Reminder',
      `Remind me to contact ${person?.name} in:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '1 Day',
          onPress: () =>
            createContactReminder
              .mutateAsync({ personId: id!, personName: person!.name, daysFromNow: 1 })
              .then(() => Alert.alert('Reminder Set', 'You will be reminded tomorrow at 10 AM')),
        },
        {
          text: '1 Week',
          onPress: () =>
            createContactReminder
              .mutateAsync({ personId: id!, personName: person!.name, daysFromNow: 7 })
              .then(() => Alert.alert('Reminder Set', 'You will be reminded in 1 week')),
        },
        {
          text: '1 Month',
          onPress: () =>
            createContactReminder
              .mutateAsync({ personId: id!, personName: person!.name, daysFromNow: 30 })
              .then(() => Alert.alert('Reminder Set', 'You will be reminded in 1 month')),
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#d32f2f';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  if (personLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text variant="headlineSmall">Person not found</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  // Group relations by type and sort by priority
  const relationsByType = personRelations?.reduce(
    (acc, relation) => {
      const type = relation.relationType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(relation);
      return acc;
    },
    {} as Record<string, typeof personRelations>
  );

  // Sort relation types by priority (higher priority first)
  const sortedRelationTypes = relationsByType
    ? Object.keys(relationsByType).sort(
        (a, b) => (RELATION_TYPE_PRIORITY[b] || 0) - (RELATION_TYPE_PRIORITY[a] || 0)
      )
    : [];

  return (
    <>
      <Stack.Screen
        options={{
          title: person.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon="pencil"
                onPress={() => router.push(`/person/edit?personId=${id}`)}
                iconColor="#6200ee"
              />
              <IconButton icon="delete" onPress={handleDelete} iconColor="#d32f2f" />
            </View>
          ),
        }}
      />
      <View style={styles.wrapper}>
        <ScrollView style={styles.container}>
          {/* Profile Header */}
          <Card style={styles.headerCard}>
            <Card.Content>
              <View style={styles.header}>
                <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer}>
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto.filePath }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
                    </View>
                  )}
                  <View style={styles.avatarBadge}>
                    <IconButton
                      icon="camera"
                      size={16}
                      iconColor="#fff"
                      style={styles.cameraIcon}
                    />
                  </View>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                  <Text variant="headlineSmall" style={styles.name}>
                    {person.name}
                  </Text>
                  {person.nickname && (
                    <Text variant="bodyLarge" style={styles.nickname}>
                      "{person.nickname}"
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.chips}>
                {person.relationshipType && (
                  <Chip icon="heart" style={styles.chip}>
                    {person.relationshipType.charAt(0).toUpperCase() + person.relationshipType.slice(1)}
                  </Chip>
                )}
                {person.personType && (
                  <Chip icon="account" style={styles.chip}>
                    {person.personType.charAt(0).toUpperCase() + person.personType.slice(1)}
                  </Chip>
                )}
                {person.importanceToUser && person.importanceToUser !== 'unknown' && (
                  <Chip icon="star" style={styles.chip}>
                    {person.importanceToUser.replace('_', ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Chip>
                )}
              </View>

              {person.metDate && (
                <Text variant="bodySmall" style={styles.metDate}>
                  Met on {formatShortDate(new Date(person.metDate))}
                </Text>
              )}

              {person.notes && (
                <Text variant="bodyMedium" style={styles.notes}>
                  {person.notes}
                </Text>
              )}

              <Text variant="bodySmall" style={styles.meta}>
                Last updated {formatRelativeTime(new Date(person.updatedAt))}
              </Text>
            </Card.Content>
          </Card>

          {/* Tags */}
          <Card style={styles.tagsCard}>
            <Card.Content>
              <View style={styles.tagsHeader}>
                <Text variant="titleMedium" style={styles.tagsTitle}>
                  Tags
                </Text>
                <Button
                  mode="outlined"
                  compact
                  icon="tag-plus"
                  onPress={() => setAddTagDialogVisible(true)}
                >
                  Add
                </Button>
              </View>

              {personTags.length === 0 ? (
                <Text variant="bodySmall" style={styles.noTagsText}>
                  No tags yet. Add tags to organize and filter contacts.
                </Text>
              ) : (
                <View style={styles.tagsContainer}>
                  {personTags.map((tag) => (
                    <Chip
                      key={tag}
                      icon="tag"
                      onClose={() => handleRemoveTag(tag)}
                      style={styles.tagChip}
                      mode="outlined"
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Quick Actions */}
          <Card style={styles.quickActionsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.quickActionsTitle}>
                Quick Actions
              </Text>
              <Text variant="bodySmall" style={styles.quickActionsSubtitle}>
                One-tap logging for today
              </Text>
              <View style={styles.quickActionsRow}>
                <Chip
                  icon="account-check"
                  onPress={() => handleQuickAction('met', 'Met')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Met
                </Chip>
                <Chip
                  icon="phone"
                  onPress={() => handleQuickAction('called', 'Called')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Called
                </Chip>
                <Chip
                  icon="message"
                  onPress={() => handleQuickAction('messaged', 'Messaged')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Messaged
                </Chip>
              </View>
              <View style={styles.quickActionsRow}>
                <Chip
                  icon="coffee"
                  onPress={() => handleQuickAction('hung_out', 'Hung out')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Hung Out
                </Chip>
                <Chip
                  icon="star"
                  onPress={() => handleQuickAction('special', 'Special event')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Special
                </Chip>
                <Chip
                  icon="bell"
                  onPress={handleSetReminder}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Remind
                </Chip>
              </View>
            </Card.Content>
          </Card>

          {/* Important Dates */}
          <Card style={styles.importantDatesCard}>
            <Card.Content>
              <View style={styles.importantDatesHeader}>
                <Text variant="titleMedium" style={styles.importantDatesTitle}>
                  Important Dates
                </Text>
                <Button
                  mode="outlined"
                  compact
                  icon="plus"
                  onPress={() => setAddDateDialogVisible(true)}
                >
                  Add
                </Button>
              </View>

              {person.dateOfBirth && (
                <View style={styles.importantDateItem}>
                  <Chip icon="cake-variant" compact style={styles.dateChip}>
                    Birthday
                  </Chip>
                  <Text variant="bodyMedium">
                    {formatShortDate(new Date(person.dateOfBirth))}
                  </Text>
                </View>
              )}

              {importantDates.map((date) => (
                <View key={date.id} style={styles.importantDateItem}>
                  <Chip icon="calendar-star" compact style={styles.dateChip}>
                    {date.objectLabel}
                  </Chip>
                  <Text variant="bodyMedium">
                    {date.validFrom ? formatShortDate(new Date(date.validFrom)) : 'No date'}
                  </Text>
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    onPress={() => deleteRelation.mutateAsync(date.id)}
                  />
                </View>
              ))}

              {!person.dateOfBirth && importantDates.length === 0 && (
                <Text variant="bodySmall" style={styles.noDateText}>
                  No important dates added yet
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* Photos */}
          {personPhotos.length > 0 && (
            <Card style={styles.photosCard}>
              <Card.Content>
                <View style={styles.photosHeader}>
                  <Text variant="titleMedium" style={styles.photosTitle}>
                    Photos ({personPhotos.length})
                  </Text>
                  <Button
                    mode="outlined"
                    compact
                    icon="image-plus"
                    onPress={() => {
                      Alert.alert(
                        'Add Photo',
                        'Choose how to add a photo',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Take Photo',
                            onPress: () => takePhoto.mutateAsync({ personId: id! }),
                          },
                          {
                            text: 'Choose from Library',
                            onPress: () => addPhotoToPerson.mutateAsync({ personId: id! }),
                          },
                        ]
                      );
                    }}
                  >
                    Add
                  </Button>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {personPhotos.map((photo) => (
                    <TouchableOpacity
                      key={photo.id}
                      onLongPress={() => {
                        Alert.alert(
                          'Photo Options',
                          'What would you like to do?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Set as Profile',
                              onPress: () =>
                                setProfilePhoto.mutateAsync({ personId: id!, photoId: photo.id }),
                            },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deletePhoto.mutateAsync(photo.id),
                            },
                          ]
                        );
                      }}
                      style={styles.photoThumbnailContainer}
                    >
                      <Image source={{ uri: photo.filePath }} style={styles.photoThumbnail} />
                      {person?.photoId === photo.id && (
                        <View style={styles.profileBadge}>
                          <IconButton icon="account-check" size={12} iconColor="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text variant="labelSmall" style={styles.photoHint}>
                  Long press on a photo for options
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Gift Ideas */}
          <Card style={styles.giftIdeasCard}>
            <Card.Content>
              <View style={styles.giftIdeasHeader}>
                <Text variant="titleMedium" style={styles.giftIdeasTitle}>
                  Gift Ideas
                </Text>
                <Button
                  mode="outlined"
                  compact
                  icon="gift"
                  onPress={() => setAddGiftDialogVisible(true)}
                >
                  Add
                </Button>
              </View>

              {giftIdeas.length === 0 ? (
                <Text variant="bodySmall" style={styles.noGiftText}>
                  No gift ideas yet. Add ideas for {person.name}!
                </Text>
              ) : (
                giftIdeas.map((gift) => (
                  <View key={gift.id} style={styles.giftItem}>
                    <View style={styles.giftInfo}>
                      <View style={styles.giftHeader}>
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.giftItemText,
                            gift.status === 'given' && styles.giftGiven,
                          ]}
                        >
                          {gift.item}
                        </Text>
                        <Chip
                          compact
                          style={[
                            styles.priorityChip,
                            { backgroundColor: getPriorityColor(gift.priority) + '20' },
                          ]}
                          textStyle={{ color: getPriorityColor(gift.priority), fontSize: 10 }}
                        >
                          {gift.priority}
                        </Chip>
                      </View>
                      {gift.occasion && (
                        <Text variant="labelSmall" style={styles.giftOccasion}>
                          For: {gift.occasion}
                        </Text>
                      )}
                      {gift.notes && (
                        <Text variant="labelSmall" style={styles.giftNotes}>
                          {gift.notes}
                        </Text>
                      )}
                      {gift.status === 'given' && gift.givenDate && (
                        <Text variant="labelSmall" style={styles.giftGivenDate}>
                          Given on {formatShortDate(gift.givenDate)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.giftActions}>
                      {gift.status !== 'given' && (
                        <IconButton
                          icon="check-circle-outline"
                          size={20}
                          iconColor="#4caf50"
                          onPress={() => handleMarkGiftGiven(gift.id, gift.item)}
                        />
                      )}
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        onPress={() => deleteGiftIdea.mutateAsync(gift.id)}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>

          {/* Relations */}
          <Card style={styles.relationsCard}>
            <Card.Content>
              <View style={styles.relationsTitleRow}>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Relations ({personRelations?.length || 0})
                </Text>
                {personRelations && personRelations.length > 0 && (
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    onPress={() => router.push(`/person/manage-relations?personId=${id}`)}
                  />
                )}
              </View>
              <Divider style={styles.divider} />

              {relationsLoading && (
                <View style={styles.centered}>
                  <ActivityIndicator />
                </View>
              )}

              {!relationsLoading && personRelations && personRelations.length === 0 && (
                <View style={styles.emptyRelations}>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No relations yet. Add preferences, facts, or information about {person.name}.
                  </Text>
                  <Button
                    mode="outlined"
                    icon="plus"
                    onPress={() => router.push(`/person/add-relation?personId=${id}`)}
                  >
                    Add Relation
                  </Button>
                </View>
              )}

              {!relationsLoading && personRelations && personRelations.length > 0 && (
                <Button
                  mode="text"
                  icon="plus"
                  onPress={() => router.push(`/person/add-relation?personId=${id}`)}
                  style={styles.addRelationButton}
                  compact
                >
                  Add Relation
                </Button>
              )}

              {/* Compact relations list sorted by priority */}
              {sortedRelationTypes.map((type) => {
                const rels = relationsByType![type];
                return (
                  <View key={type} style={styles.relationTypeSection}>
                    <Text variant="labelLarge" style={styles.relationTypeLabel}>
                      {getRelationEmoji(type)} {formatRelationType(type)}
                    </Text>
                    <View style={styles.relationChipsContainer}>
                      {rels.map((relation) => (
                        <Chip
                          key={relation.id}
                          compact
                          style={styles.relationChip}
                          textStyle={styles.relationChipText}
                        >
                          {relation.objectLabel}
                          {relation.intensity && relation.intensity !== 'medium' && (
                            <Text style={styles.intensityIndicator}>
                              {' '}
                              {relation.intensity === 'very_strong'
                                ? '💪'
                                : relation.intensity === 'strong'
                                  ? '+'
                                  : relation.intensity === 'weak'
                                    ? '-'
                                    : ''}
                            </Text>
                          )}
                        </Chip>
                      ))}
                    </View>
                  </View>
                );
              })}
            </Card.Content>
          </Card>

          {/* Connections (Person-to-Person) */}
          <Card style={styles.relationsCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Connections ({personConnections?.length || 0})
              </Text>
              <Divider style={styles.divider} />

              {connectionsLoading && (
                <View style={styles.centered}>
                  <ActivityIndicator />
                </View>
              )}

              {!connectionsLoading && personConnections && personConnections.length === 0 && (
                <View style={styles.emptyRelations}>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No connections yet. Add connections to show how {person.name} relates to other
                    people.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => router.push(`/person/add-connection?personId=${id}`)}
                  >
                    Add Connection
                  </Button>
                </View>
              )}

              {personConnections &&
                personConnections.map((connection) => {
                  const connectedPerson = getConnectedPerson(connection);
                  if (!connectedPerson) return null;

                  return (
                    <List.Item
                      key={connection.id}
                      title={connectedPerson.name}
                      description={`${connection.relationshipType}${connection.qualifier ? ` • ${connection.qualifier}` : ''}${connection.status !== 'active' ? ` • ${connection.status}` : ''}`}
                      left={() => (
                        <View style={styles.connectionAvatar}>
                          <Text style={styles.connectionAvatarText}>
                            {getInitials(connectedPerson.name)}
                          </Text>
                        </View>
                      )}
                      right={() => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Chip compact style={{ marginRight: 4 }}>
                            {connection.status}
                          </Chip>
                          <IconButton
                            icon="open-in-new"
                            size={20}
                            onPress={() => router.push(`/person/${connectedPerson.id}`)}
                          />
                          <IconButton
                            icon="delete-outline"
                            size={20}
                            onPress={() =>
                              handleDeleteConnection(connection.id, connectedPerson.name)
                            }
                          />
                        </View>
                      )}
                      onPress={() => router.push(`/person/${connectedPerson.id}`)}
                      style={styles.relationItem}
                    />
                  );
                })}
            </Card.Content>
          </Card>

          <View style={styles.spacer} />
        </ScrollView>

        <FAB
          icon="plus"
          label="Add Relation"
          style={styles.fab}
          onPress={() => router.push(`/person/add-relation?personId=${id}`)}
        />
      </View>

      {/* Add Important Date Dialog */}
      <Portal>
        <Dialog visible={addDateDialogVisible} onDismiss={() => setAddDateDialogVisible(false)}>
          <Dialog.Title>Add Important Date</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label="Date Name"
              placeholder="e.g., Wedding Anniversary, First Met"
              value={dateName}
              onChangeText={setDateName}
              style={{ marginBottom: 16 }}
            />
            <PaperInput
              mode="outlined"
              label="Date"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              value={dateValue}
              onChangeText={setDateValue}
            />
            <Text variant="labelSmall" style={{ opacity: 0.6, marginTop: 4 }}>
              Enter year only (2020), year-month (2020-06), or full date (2020-06-15)
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDateDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddImportantDate} loading={isAddingDate} disabled={isAddingDate}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Add Gift Idea Dialog */}
      <Portal>
        <Dialog visible={addGiftDialogVisible} onDismiss={() => setAddGiftDialogVisible(false)}>
          <Dialog.Title>Add Gift Idea</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label="Gift Item *"
              placeholder="e.g., Hiking boots, Coffee machine"
              value={giftItem}
              onChangeText={setGiftItem}
              style={{ marginBottom: 12 }}
            />

            <Text variant="labelMedium" style={{ marginBottom: 8 }}>
              Priority
            </Text>
            <SegmentedButtons
              value={giftPriority}
              onValueChange={(v) => setGiftPriority(v as any)}
              buttons={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
              style={{ marginBottom: 12 }}
            />

            <PaperInput
              mode="outlined"
              label="Occasion (optional)"
              placeholder="e.g., Birthday, Christmas"
              value={giftOccasion}
              onChangeText={setGiftOccasion}
              style={{ marginBottom: 12 }}
            />

            <PaperInput
              mode="outlined"
              label="Notes (optional)"
              placeholder="Size, color, where to buy, etc."
              value={giftNotes}
              onChangeText={setGiftNotes}
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddGiftDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddGiftIdea} loading={isAddingGift} disabled={isAddingGift}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Add Tag Dialog */}
      <Portal>
        <Dialog visible={addTagDialogVisible} onDismiss={() => setAddTagDialogVisible(false)}>
          <Dialog.Title>Add Tag</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label="Tag Name"
              placeholder="e.g., college, work, family"
              value={newTagName}
              onChangeText={setNewTagName}
              style={{ marginBottom: 12 }}
              autoCapitalize="none"
            />

            {availableTags.length > 0 && (
              <>
                <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                  Existing Tags
                </Text>
                <View style={styles.existingTagsContainer}>
                  {availableTags.slice(0, 10).map((tag) => (
                    <Chip
                      key={tag}
                      onPress={() => setNewTagName(tag)}
                      style={styles.existingTagChip}
                      mode="outlined"
                      compact
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddTagDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddTag} loading={isAddingTag} disabled={isAddingTag}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
  backButton: {
    marginTop: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  tagsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagsTitle: {
    fontWeight: 'bold',
  },
  noTagsText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    marginBottom: 4,
  },
  existingTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  existingTagChip: {
    marginBottom: 4,
  },
  photosCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photosTitle: {
    fontWeight: 'bold',
  },
  photoThumbnailContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  profileBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#4caf50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: {
    opacity: 0.6,
    marginTop: 8,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#03dac6',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: {
    margin: 0,
    padding: 0,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  nickname: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    marginRight: 4,
  },
  metDate: {
    marginTop: 8,
    opacity: 0.7,
  },
  notes: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  meta: {
    marginTop: 12,
    opacity: 0.6,
  },
  quickActionsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  quickActionsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickActionsSubtitle: {
    opacity: 0.7,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickActionChip: {
    marginRight: 4,
  },
  importantDatesCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  importantDatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  importantDatesTitle: {
    fontWeight: 'bold',
  },
  importantDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateChip: {
    marginRight: 8,
  },
  noDateText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  giftIdeasCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  giftIdeasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  giftIdeasTitle: {
    fontWeight: 'bold',
  },
  noGiftText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  giftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  giftInfo: {
    flex: 1,
  },
  giftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  giftItemText: {
    fontWeight: '500',
  },
  giftGiven: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priorityChip: {
    height: 24,
  },
  giftOccasion: {
    opacity: 0.7,
    marginBottom: 2,
  },
  giftNotes: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  giftGivenDate: {
    color: '#4caf50',
    marginTop: 4,
  },
  giftActions: {
    flexDirection: 'row',
  },
  relationsCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  emptyRelations: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  addRelationButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  relationItem: {
    paddingVertical: 8,
  },
  relationsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relationTypeSection: {
    marginBottom: 12,
  },
  relationTypeLabel: {
    marginBottom: 6,
    opacity: 0.8,
  },
  relationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  relationChip: {
    marginBottom: 2,
  },
  relationChipText: {
    fontSize: 12,
  },
  intensityIndicator: {
    fontSize: 10,
    opacity: 0.8,
  },
  connectionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#03dac6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  connectionAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
