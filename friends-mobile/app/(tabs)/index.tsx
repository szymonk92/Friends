import {
  StyleSheet,
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { formatRelationType, formatRelativeShort } from '@/lib/utils/format';
import { Avatar } from '@/components/Avatar';
import { usePeople } from '@/hooks/usePeople';
import { useAllTags, parseTags } from '@/hooks/useTags';
import { useTranslation } from 'react-i18next';
import { fz, fzText } from '@/lib/design/tokens';
import { ChainLogo } from '@/components/ChainLogo';
import { IconCircle } from '@/components/IconCircle';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ActionSheet, type ActionSheetAction } from '@/components/ActionSheet';
import { getDaysUntilBirthday, hasExactBirthday } from '@/lib/notifications/birthday-reminders';

export default function PeopleListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'importance'>('date');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCategoryDividers, setShowCategoryDividers] = useState(true);
  const [viewMode, setViewMode] = useState<'network' | 'all'>('network');
  // Deep link from a person's tag menu: /?tag=<tag> filters everyone with that tag.
  const { tag: tagParam, at: tagStamp } = useLocalSearchParams<{ tag?: string; at?: string }>();
  useEffect(() => {
    if (typeof tagParam === 'string' && tagParam) {
      setSelectedTags([tagParam]);
      setViewMode('all');
    }
  }, [tagParam, tagStamp]);
  const {
    data: people = [],
    isLoading,
    error,
    refetch,
  } = usePeople({ type: viewMode === 'network' ? 'primary' : 'all' });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);
  const { data: allTags = [] } = useAllTags();

  const relationshipTypes = Array.from(
    new Set(people.map((p) => p.relationshipType).filter(Boolean))
  ).sort();

  const filteredPeople = useMemo(() => {
    return people
      .filter((person) => {
        let searchScore = 0;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const name = person.name.toLowerCase();
          if (name === query) searchScore = 3;
          else if (name.startsWith(query)) searchScore = 2;
          else if (name.includes(query)) searchScore = 1;
          else return false;
        }
        (person as any)._searchScore = searchScore;
        const personTags = parseTags(person.tags);
        const matchesTags =
          selectedTags.length === 0 || selectedTags.every((tag) => personTags.includes(tag));
        const matchesRelationType =
          selectedRelationTypes.length === 0 ||
          (person.relationshipType && selectedRelationTypes.includes(person.relationshipType));
        return matchesTags && matchesRelationType;
      })
      .sort((a, b) => {
        const aScore = (a as any)._searchScore || 0;
        const bScore = (b as any)._searchScore || 0;
        if (aScore !== bScore) return bScore - aScore;
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'importance': {
            const weights: Record<string, number> = {
              partner: 5, family: 4, friend: 3, colleague: 2, acquaintance: 1,
            };
            const order = ['very_important', 'important', 'peripheral', 'unknown'];
            const aw = weights[a.relationshipType || ''] || 0;
            const bw = weights[b.relationshipType || ''] || 0;
            if (aw !== bw) return bw - aw;
            const ai = order.indexOf(a.importanceToUser || 'unknown');
            const bi = order.indexOf(b.importanceToUser || 'unknown');
            if (ai !== bi) return ai - bi;
            return a.name.localeCompare(b.name);
          }
          case 'date':
          default:
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
      });
  }, [people, searchQuery, selectedTags, selectedRelationTypes, sortBy]);

  const toggleTag = (tag: string) =>
    setSelectedTags((p) => (p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]));
  const toggleRelationType = (type: string) =>
    setSelectedRelationTypes((p) => (p.includes(type) ? p.filter((x) => x !== type) : [...p, type]));
  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedRelationTypes([]);
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={{ ...fzText.sub, marginTop: 12 }}>{t('people.loading')}</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={s.centered}>
        <Text style={{ ...fzText.sub, marginBottom: 16 }}>{t('people.error')}</Text>
        <PrimaryButton onPress={() => refetch()} label={t('common.retry')} />
      </View>
    );
  }

  const hasActiveFilters =
    searchQuery || selectedTags.length > 0 || selectedRelationTypes.length > 0;

  const menuActions: ActionSheetAction[] = [
    { label: t('common.moreOptions'), icon: 'dotsH', onPress: () => router.push('/menu') },
    { label: t('navigation.settings'), icon: 'settings', onPress: () => router.push('/settings') },
    { label: t('importContacts.menu'), icon: 'accountPlus', onPress: () => router.push('/import-contacts') },
    { label: t('dietChecklist.title'), icon: 'tag', onPress: () => router.push('/diet-checklist') },
    { label: t('people.sortByName'), icon: sortBy === 'name' ? 'check' : 'sort', divider: true, onPress: () => setSortBy('name') },
    { label: t('people.sortByRecent'), icon: sortBy === 'date' ? 'check' : 'clock', onPress: () => setSortBy('date') },
    { label: t('people.sortByImportance'), icon: sortBy === 'importance' ? 'check' : 'heart', onPress: () => setSortBy('importance') },
    {
      label: showCategoryDividers ? t('people.hideCategoryDividers') : t('people.showCategoryDividers'),
      icon: showCategoryDividers ? 'eyeOff' : 'eye',
      divider: true,
      onPress: () => setShowCategoryDividers(!showCategoryDividers),
    },
    { label: t('people.clearFilters'), icon: 'filterRemove', disabled: !hasActiveFilters, onPress: clearAllFilters },
  ];

  return (
    <View style={s.container}>
      <ActionSheet visible={menuVisible} actions={menuActions} onDismiss={() => setMenuVisible(false)} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      {/* App bar */}
      <View style={[s.appBar, { paddingTop: insets.top + 8 }]}>
        {!searchVisible ? (
          <View style={s.appBarRow}>
            <View style={s.brand}>
              <ChainLogo size={30} strokeWidth={8} />
              <Text style={fzText.title}>{t('people.title')}</Text>
            </View>
            <View style={s.appBarActions}>
              <IconCircle icon="search" onPress={() => setSearchVisible(true)} />
              <IconCircle icon="plus" onPress={() => router.push('/modal')} />
              <IconCircle icon="more" fill="transparent" onPress={() => setMenuVisible(true)} />
            </View>
          </View>
        ) : (
          <View style={s.searchRow}>
            <IconCircle
              icon="back"
              onPress={() => { setSearchVisible(false); setSearchQuery(''); }}
            />
            <View style={s.searchInput}>
              <TextInput
                placeholder={t('people.searchPlaceholder')}
                placeholderTextColor={fz.textMute}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                style={s.searchText}
              />
            </View>
          </View>
        )}

        {/* meta */}
        <Text style={[fzText.meta, { paddingHorizontal: fz.s.edge, paddingBottom: fz.s.md }]}>
          {t('people.keepClose', { count: people.length })}
        </Text>

        {/* pill filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsRow}
          contentContainerStyle={s.chipsContent}
        >
          <Pill
            label={t('people.myNetwork')}
            selected={viewMode === 'network'}
            onPress={() => setViewMode('network')}
          />
          <Pill
            label={t('timeline.allPeople')}
            selected={viewMode === 'all'}
            onPress={() => setViewMode('all')}
          />
          {relationshipTypes.map((type) => (
            <Pill
              key={type}
              label={formatRelationType(type)}
              selected={selectedRelationTypes.includes(type)}
              onPress={() => toggleRelationType(type)}
            />
          ))}
          {allTags.map((tag) => (
            <Pill
              key={tag}
              label={tag}
              icon="tag"
              selected={selectedTags.includes(tag)}
              onPress={() => toggleTag(tag)}
            />
          ))}
          {hasActiveFilters && (
            <Pill label={t('importContacts.clear')} icon="filterRemove" variant="surface" onPress={clearAllFilters} />
          )}
        </ScrollView>
      </View>

      {/* empty states */}
      {filteredPeople.length === 0 && !searchQuery && (
        <View style={s.empty}>
          <Text style={fzText.title}>{t('people.noPeople')}</Text>
          <Text style={[fzText.sub, { marginTop: 8, marginBottom: 24 }]}>
            {t('people.noPeopleDesc')}
          </Text>
          <PrimaryButton label={t('people.addPerson')} onPress={() => router.push('/modal')} />
          <PrimaryButton label={t('importContacts.menu')} onPress={() => router.push('/import-contacts')} variant="outline" style={{ marginTop: 12 }} />
        </View>
      )}
      {filteredPeople.length === 0 && searchQuery && (
        <View style={s.empty}>
          <Text style={fzText.sub}>{t('people.noResults', { query: searchQuery })}</Text>
        </View>
      )}

      {/* list */}
      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[fz.ink]} />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item, index }) => {
          const currentCategory = item.relationshipType || 'Other';
          const previousCategory =
            index > 0 ? filteredPeople[index - 1].relationshipType || 'Other' : null;
          const showCategoryHeader =
            showCategoryDividers && (index === 0 || currentCategory !== previousCategory);

          return (
            <View>
              {showCategoryHeader && (
                <View style={s.categoryHeader}>
                  <Text style={fzText.label}>
                    {currentCategory === 'Other' ? t('common.other') : formatRelationType(currentCategory)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={s.row}
                onPress={() => router.push(`/person/${item.id}`)}
                activeOpacity={0.7}
              >
                <Avatar name={item.name} photoPath={item.photoPath} size={52} />
                <View style={s.rowBody}>
                  <View style={s.nameRow}>
                    <Text style={fzText.name} numberOfLines={1}>{item.name}</Text>
                    {(() => {
                      const days =
                        item.dateOfBirth && hasExactBirthday(item) ? getDaysUntilBirthday(item.dateOfBirth) : null;
                      if (days === null || days > 7) return null;
                      return (
                        <View style={s.bday}>
                          <Text style={s.bdayText}>🎂 {days === 0 ? t('people.bdayToday') : t('people.bdayInDays', { count: days })}</Text>
                        </View>
                      );
                    })()}
                  </View>
                  <Text
                    style={fzText.sub}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.relationshipType
                      ? `${formatRelationType(item.relationshipType)}${item.nickname ? ` · "${item.nickname}"` : ''}`
                      : item.nickname
                        ? `"${item.nickname}"`
                        : ''}
                  </Text>
                </View>
                <Text style={fzText.time}>{formatRelativeShort(new Date(item.updatedAt))}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: fz.paper },
  appBar: { backgroundColor: fz.paper },
  appBarRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: fz.s.edge, paddingRight: fz.s.md, paddingBottom: 2,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appBarActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: fz.s.edge, paddingBottom: 6 },
  searchInput: {
    flex: 1, height: 42, borderRadius: fz.rPill, backgroundColor: fz.surface,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchText: { fontFamily: fz.font, fontSize: 15, color: fz.ink, padding: 0 },
  chipsRow: { paddingHorizontal: fz.s.edge, paddingBottom: fz.s.md },
  chipsContent: { gap: 8, paddingRight: fz.s.edge },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  categoryHeader: { paddingHorizontal: fz.s.edge, paddingTop: 18, paddingBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 11, paddingHorizontal: fz.s.edge,
  },
  rowBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  bday: { backgroundColor: fz.warnBg, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  bdayText: { fontSize: 11, fontWeight: '600', color: fz.warn, fontFamily: fz.font },
});