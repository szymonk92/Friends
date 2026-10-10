import { StyleSheet, ScrollView, View, Text as RNText, StatusBar } from 'react-native';
import { fz, fzText } from '@/lib/design/tokens';
import { AppBar } from '@/components/AppBar';
import { Pill } from '@/components/Pill';
import { IconCircle } from '@/components/IconCircle';
import { useTranslation } from 'react-i18next';

/**
 * Documentation screen explaining app terminology and nomenclature
 * Accessible via /documentation route
 */
export default function DocumentationScreen() {
  const { t } = useTranslation();

  const Row = ({
    title,
    description,
    left,
  }: {
    title: string;
    description: string;
    left?: React.ReactNode;
  }) => (
    <View style={styles.row}>
      {left ? <View style={styles.rowLeft}>{left}</View> : null}
      <View style={styles.rowBody}>
        <RNText style={styles.rowTitle}>{title}</RNText>
        <RNText style={styles.rowDesc}>{description}</RNText>
      </View>
    </View>
  );

  const SectionTitle = ({ children }: { children: string }) => (
    <RNText style={styles.sectionTitle}>{children}</RNText>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      <AppBar title={t('documentation.documentation')} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <RNText style={styles.title}>{t('documentation.friendsAppNomenclatureGuide')}</RNText>
        <RNText style={styles.subtitle}>
          {t('documentation.understandingTheTerminologyAndSymbols')}
        </RNText>

        {/* Relations Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>{t('documentation.relationTypes')}</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>
            {t('documentation.relationsDescribeWhatPeopleLike')}
          </RNText>

          <View style={styles.section}>
            <SectionTitle>{t('documentation.preferences')}</SectionTitle>
            <Row title="LIKES ❤️" description={t('documentation.thingsAPersonEnjoysPrefers')} />
            <Row title="DISLIKES 👎" description={t('documentation.thingsAPersonDislikesOr')} />
            <Row title="AVOIDS 🚨" description={t('documentation.aHardRuleAllergyMedical')} />
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('documentation.identitySkills')}</SectionTitle>
            <Row title="IS 👤" description={t('documentation.whoSomeoneIsProfessionRole')} />
            <Row title="CAN 🎯" description={t('documentation.skillsAbilitiesOrExpertiseA')} />
            <Row title="HAS 🎒" description={t('documentation.possessionsAndPhysicalTraitsObjects')} />
            <Row title="LIVES_IN 📍" description={t('documentation.currentPastOrFutureResidence')} />
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('documentation.behaviorsEvents')}</SectionTitle>
            <Row title="DOES 🔄" description={t('documentation.aHabitRoutineOrRegularly')} />
            <Row title="DID 📅" description={t('documentation.aOneOffPastEvent')} />
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('documentation.otherTypes')}</SectionTitle>
            <Row title="KNOWS 🤝" description={t('documentation.anUnquantifiedSocialConnectionPeople')} />
            <Row title="WANTS 🎯" description={t('documentation.goalsAspirationsOrFutureObjectives')} />
            <Row title="STRUGGLES_WITH 😔" description={t('documentation.ongoingDifficultiesHealthConditionsOr')} />
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>{t('documentation.relationStatus')}</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>
            {t('documentation.eachRelationHasAStatus')}
          </RNText>

          <Row title={t('documentation.current')} description={t('documentation.activeRightNowDefaultFor')} left={<Pill label={t('documentation.current')} variant="outline" />} />
          <Row title={t('documentation.past')} description={t('documentation.wasTrueInThePast')} left={<Pill label={t('documentation.past')} variant="outline" />} />
          <Row title={t('documentation.future')} description={t('documentation.expectedOrPlannedForThe')} left={<Pill label={t('documentation.future')} variant="outline" />} />
          <Row title={t('documentation.aspiration')} description={t('documentation.somethingTheyHopeToAchieve')} left={<Pill label={t('documentation.aspiration')} variant="outline" />} />
        </View>

        {/* Intensity Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>{t('documentation.intensityLevels')}</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>{t('documentation.intensityIndicatesHowStrongA')}</RNText>

          <Row title={t('documentation.weak')} description={t('documentation.mildPreferenceOrLightConnection')} />
          <Row title={t('documentation.medium')} description={t('documentation.moderatePreferenceOrNotableConnection')} />
          <Row title={t('documentation.strong')} description={t('documentation.strongDefiningOrExtremePreference')} />
        </View>

        {/* Connections Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>{t('documentation.personConnections')}</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>
            {t('documentation.connectionsRepresentRelationshipsBetweenPeople')}
          </RNText>

          <View style={styles.section}>
            <SectionTitle>{t('documentation.relationshipTypes')}</SectionTitle>
            <Row title={t('documentation.friend')} description={t('documentation.personalFriendship')} />
            <Row title={t('documentation.family')} description={t('documentation.bloodRelativesOrCloseFamily')} />
            <Row title={t('documentation.colleague')} description={t('documentation.workOrProfessionalRelationships')} />
            <Row title={t('documentation.partner')} description={t('documentation.romanticOrLifePartner')} />
            <Row title={t('documentation.acquaintance')} description={t('documentation.casualOrLimitedConnection')} />
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('documentation.connectionStatus')}</SectionTitle>
            <Row title={t('documentation.active')} description={t('documentation.currentlyMaintainingThisRelationship')} left={<Pill label={t('documentation.active2')} variant="outline" />} />
            <Row title={t('documentation.inactive')} description={t('documentation.notActivelyInTouchBut')} left={<Pill label={t('documentation.inactive2')} variant="outline" />} />
            <Row title={t('documentation.ended')} description={t('documentation.relationshipHasConcluded')} left={<Pill label={t('documentation.ended2')} variant="outline" />} />
            <Row title={t('documentation.complicated')} description={t('documentation.complexOrMixedRelationshipStatus')} left={<Pill label={t('documentation.complicated2')} variant="outline" />} />
          </View>
        </View>

        {/* UI Symbols */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>{t('documentation.uiSymbolsExplained')}</RNText>
          <View style={styles.divider} />
          <Row title={t('documentation.pluses')} description={t('documentation.representIntensityMorePlusesStronger')} />
          <Row title={t('documentation.minuses')} description={t('documentation.notCurrentlyUsedInThe')} />
          <Row title={t('documentation.numbers35')} description={t('documentation.currentCountMaximumLimitE')} />
          <Row title={t('documentation.checkmarkBadge')} description={t('documentation.indicatesTheProfilePhotoOn')} />
        </View>

        {/* Tips */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>{t('documentation.proTips')}</RNText>
          <View style={styles.divider} />
          <Row
            title={t('documentation.quickActions')}
            description={t('documentation.longPressOnItemsFor')}
            left={<IconCircle icon="more" size={32} iconSize={15} />}
          />
          <Row
            title={t('documentation.photoBrowser')}
            description={t('documentation.tapPhotosToViewFull')}
            left={<IconCircle icon="camera" size={32} iconSize={15} />}
          />
          <Row
            title={t('documentation.aiExtraction')}
            description={t('documentation.writeNaturalStoriesAndLet')}
            left={<IconCircle icon="network" size={32} iconSize={15} />}
          />
          <Row
            title={t('documentation.timelineFilters')}
            description={t('documentation.useFiltersToViewSpecific')}
            left={<IconCircle icon="filter" size={32} iconSize={15} />}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  scroll: { flex: 1 },
  content: { padding: fz.s.lg },
  title: { ...fzText.titleLg, marginBottom: fz.s.sm },
  subtitle: { ...fzText.sub, marginBottom: fz.s.xxl },
  card: {
    backgroundColor: fz.card,
    borderRadius: fz.rCard,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    padding: fz.s.lg,
    marginBottom: fz.s.lg,
  },
  cardTitle: { ...fzText.title, marginBottom: fz.s.sm },
  divider: { height: 1, backgroundColor: fz.hairline, marginBottom: fz.s.md },
  description: { ...fzText.body, marginBottom: fz.s.md, lineHeight: 20 },
  section: { marginBottom: fz.s.md },
  sectionTitle: { ...fzText.label, marginBottom: fz.s.sm, marginTop: fz.s.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: fz.s.sm,
  },
  rowLeft: { marginRight: fz.s.md, marginTop: 2 },
  rowBody: { flex: 1 },
  rowTitle: { ...fzText.name, marginBottom: 2 },
  rowDesc: { ...fzText.body, lineHeight: 19 },
});