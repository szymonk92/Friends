import {
  StyleSheet,
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator, Button, Menu, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { getInitials, formatRelationType, formatRelativeShort } from '@/lib/utils/format';
import { usePeople } from '@/hooks/usePeople';
import { useAllTags, parseTags } from '@/hooks/useTags';
import { useTranslation } from 'react-i18next';
import { fz, fzText } from '@/lib/design/tokens';
import { ChainLogo } from '@/components/ChainLogo';
import { IconCircle } from '@/components/IconCircle';
import { Pill } from '@/components/Pill';

function getDaysUntilBirthday(dateOfBirth: Date | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (nextBirthday < todayStart) nextBirthday.setFullYear(today.getFullYear() + 1);
  return Math.round((nextBirthday.getTime() - todayStart.getTime()) / 86400000);
}

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
  const [menuKey, setMenuKey] = useState(0);
  const [showCategoryDividers, setShowCategoryDividers] = useState(true);
  const [viewMode, setViewMode] = useState<'network' | 'all'>('network');
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
        <Button mode="contained" onPress={() => refetch()}>{t('common.retry')}</Button>
      </View>
    );
  }

  const hasActiveFilters =
    searchQuery || selectedTags.length > 0 || selectedRelationTypes.length > 0;

  return (
    <View style={s.container}>
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
              <Menu
                key={menuKey}
                visible={menuVisible}
                onDismiss={() => {
                  setMenuVisible(false);
                  setMenuKey((p) => p + 1);
                }}
                anchor={
                  <IconCircle
                    icon="more"
                    fill="transparent"
                    onPress={() => {
                      setMenuVisible(!menuVisible);
                      if (!menuVisible) setMenuKey((p) => p + 1);
                    }}
                  />
                }
              >
                <Menu.Item
                  onPress={() => { setMenuVisible(false); router.push('/menu'); }}
                  title={t('common.moreOptions') || 'More Options'}
                  leadingIcon="dots-horizontal"
                />
                <Menu.Item
                  onPress={() => { setMenuVisible(false); router.push('/settings'); }}
                  title={t('navigation.settings')}
                  leadingIcon="cog"
                />
                <Menu.Item
                  onPress={() => { setMenuVisible(false); router.push('/import-contacts'); }}
                  title="Import from contacts"
                  leadingIcon="contacts"
                />
                <Divider />
                <Menu.Item
                  onPress={() => { setSortBy('name'); setMenuVisible(false); }}
                  title={t('people.sortByName')}
                  leadingIcon={sortBy === 'name' ? 'check' : 'sort-alphabetical-ascending'}
                />
                <Menu.Item
                  onPress={() => { setSortBy('date'); setMenuVisible(false); }}
                  title={t('people.sortByRecent')}
                  leadingIcon={sortBy === 'date' ? 'check' : 'clock-outline'}
                />
                <Menu.Item
                  onPress={() => { setSortBy('importance'); setMenuVisible(false); }}
                  title={t('people.sortByImportance')}
                  leadingIcon={sortBy === 'importance' ? 'check' : 'star'}
                />
                <Divider />
                <Menu.Item
                  onPress={() => { setShowCategoryDividers(!showCategoryDividers); setMenuVisible(false); }}
                  title={showCategoryDividers ? t('people.hideCategoryDividers') : t('people.showCategoryDividers')}
                  leadingIcon={showCategoryDividers ? 'eye-off' : 'eye'}
                />
                <Menu.Item
                  onPress={() => { setMenuVisible(false); clearAllFilters(); }}
                  title={t('people.clearFilters')}
                  leadingIcon="filter-remove"
                  disabled={!hasActiveFilters}
                />
              </Menu>
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
          {people.length} {people.length === 1 ? 'person' : 'people'} you keep close
        </Text>

        {/* pill filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsRow}
          contentContainerStyle={s.chipsContent}
        >
          <Pill
            label="My Network"
            selected={viewMode === 'network'}
            onPress={() => setViewMode('network')}
          />
          <Pill
            label="All People"
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
            <Pill label="Clear" icon="filterRemove" variant="surface" onPress={clearAllFilters} />
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
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/modal')}
            activeOpacity={0.8}
          >
            <Text style={{ ...fzText.chipOn, fontSize: 15, fontWeight: '600' }}>
              {t('people.addPerson')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.push('/import-contacts')}
            activeOpacity={0.8}
          >
            <Text style={fzText.btnOutline}>Import from contacts</Text>
          </TouchableOpacity>
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
                  <Text style={fzText.label}>{formatRelationType(currentCategory)}</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.row}
                onPress={() => router.push(`/person/${item.id}`)}
                activeOpacity={0.7}
              >
                {item.photoPath ? (
                  <View style={s.avatarWrap}>
                    <Image source={{ uri: item.photoPath }} style={s.avatar} />
                    <View style={[s.avatarDot, { backgroundColor: fz.ink }]} />
                  </View>
                ) : (
                  <View style={[s.avatar, { backgroundColor: fz.surface }]}>
                    <Text style={[s.avatarText, { color: fz.ink }]}>{getInitials(item.name)}</Text>
                  </View>
                )}
                <View style={s.rowBody}>
                  <View style={s.nameRow}>
                    <Text style={fzText.name} numberOfLines={1}>{item.name}</Text>
                    {(() => {
                      const days = getDaysUntilBirthday(item.dateOfBirth);
                      if (days === null || days > 7) return null;
                      return (
                        <View style={s.bday}>
                          <Text style={s.bdayText}>🎂 {days === 0 ? 'Today!' : `${days}d`}</Text>
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
  primaryBtn: {
    backgroundColor: fz.ink, height: 50, borderRadius: fz.rButton,
    paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtn: {
    height: 50, borderRadius: fz.rButton, paddingHorizontal: 28,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
    borderWidth: 1.5, borderColor: fz.ink,
  },
  categoryHeader: { paddingHorizontal: fz.s.edge, paddingTop: 18, paddingBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 11, paddingHorizontal: fz.s.edge,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarDot: {
    position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
    borderRadius: 6, borderWidth: 2, borderColor: fz.paper,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600', fontFamily: fz.font },
  rowBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  bday: { backgroundColor: '#FFF3E0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  bdayText: { fontSize: 11, fontWeight: '600', color: '#E65100', fontFamily: fz.font },
});