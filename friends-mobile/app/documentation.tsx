import { StyleSheet, ScrollView, View, Text as RNText, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { fz, fzText } from '@/lib/design/tokens';
import { HeaderBack } from '@/components/HeaderBack';
import { Pill } from '@/components/Pill';
import { IconCircle } from '@/components/IconCircle';

/**
 * Documentation screen explaining app terminology and nomenclature
 * Accessible via /documentation route
 */
export default function DocumentationScreen() {
  const insets = useSafeAreaInsets();

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
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.appBarRow}>
          <HeaderBack onPress={() => router.back()} />
          <RNText style={fzText.screenTitle}>Documentation</RNText>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <RNText style={styles.title}>Friends App — Nomenclature Guide</RNText>
        <RNText style={styles.subtitle}>
          Understanding the terminology and symbols used in the app
        </RNText>

        {/* Relations Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>📊 Relation Types</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>
            Relations describe what people like, avoid, know, do, and more. Each relation has a type
            that defines the kind of connection — 12 in total.
          </RNText>

          <View style={styles.section}>
            <SectionTitle>Preferences</SectionTitle>
            <Row title="LIKES ❤️" description="Things a person enjoys, prefers, or has positive feelings about" />
            <Row title="DISLIKES 👎" description="Things a person dislikes or finds unpleasant — a taste, not a rule" />
            <Row title="AVOIDS 🚨" description="A hard rule: allergy, medical restriction, diet, sobriety, or ethics" />
          </View>

          <View style={styles.section}>
            <SectionTitle>Identity & Skills</SectionTitle>
            <Row title="IS 👤" description="Who someone is — profession, role, trait, belief, or identity" />
            <Row title="CAN 🎯" description="Skills, abilities, or expertise a person possesses" />
            <Row title="HAS 🎒" description="Possessions and physical traits — objects, property, appearance" />
            <Row title="LIVES_IN 📍" description="Current, past, or future residence" />
          </View>

          <View style={styles.section}>
            <SectionTitle>Behaviors & Events</SectionTitle>
            <Row title="DOES 🔄" description="A habit, routine, or regularly repeated activity" />
            <Row title="DID 📅" description="A one-off past event or experience" />
          </View>

          <View style={styles.section}>
            <SectionTitle>Other Types</SectionTitle>
            <Row title="KNOWS 🤝" description="An unquantified social connection — people, places, or groups" />
            <Row title="WANTS 🎯" description="Goals, aspirations, or future objectives" />
            <Row title="STRUGGLES_WITH 😔" description="Ongoing difficulties, health conditions, or hardship" />
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>📌 Relation Status</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>
            Each relation has a status indicating its timeframe and relevance.
          </RNText>

          <Row title="current" description="Active right now (default for most relations)" left={<Pill label="current" variant="outline" />} />
          <Row title="past" description="Was true in the past but no longer applies" left={<Pill label="past" variant="outline" />} />
          <Row title="future" description="Expected or planned for the future" left={<Pill label="future" variant="outline" />} />
          <Row title="aspiration" description="Something they hope to achieve or become" left={<Pill label="aspiration" variant="outline" />} />
        </View>

        {/* Intensity Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>📈 Intensity Levels</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>Intensity indicates how strong a relation is.</RNText>

          <Row title="Weak +" description="Mild preference or light connection" />
          <Row title="Medium ++" description="Moderate preference or notable connection" />
          <Row title="Strong +++" description="Strong, defining, or extreme preference" />
        </View>

        {/* Connections Section */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>🔗 Person Connections</RNText>
          <View style={styles.divider} />
          <RNText style={styles.description}>
            Connections represent relationships between people in your network.
          </RNText>

          <View style={styles.section}>
            <SectionTitle>Relationship Types</SectionTitle>
            <Row title="Friend 💙" description="Personal friendship" />
            <Row title="Family 🏠" description="Blood relatives or close family" />
            <Row title="Colleague 💼" description="Work or professional relationships" />
            <Row title="Partner ❤️" description="Romantic or life partner" />
            <Row title="Acquaintance 👋" description="Casual or limited connection" />
          </View>

          <View style={styles.section}>
            <SectionTitle>Connection Status</SectionTitle>
            <Row title="Active" description="Currently maintaining this relationship" left={<Pill label="active" variant="outline" />} />
            <Row title="Inactive" description="Not actively in touch but connection exists" left={<Pill label="inactive" variant="outline" />} />
            <Row title="Ended" description="Relationship has concluded" left={<Pill label="ended" variant="outline" />} />
            <Row title="Complicated" description="Complex or mixed relationship status" left={<Pill label="complicated" variant="outline" />} />
          </View>
        </View>

        {/* UI Symbols */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>🔤 UI Symbols Explained</RNText>
          <View style={styles.divider} />
          <Row title="+ Pluses" description="Represent intensity. More pluses = stronger intensity (+ to ++++)" />
          <Row title="− Minuses" description="Not currently used in the app, reserved for future features" />
          <Row title="Numbers (3/5)" description="Current count / Maximum limit (e.g., photos: 3 out of 5 allowed)" />
          <Row title="✓ Checkmark Badge" description="Indicates the profile photo on person cards" />
        </View>

        {/* Tips */}
        <View style={styles.card}>
          <RNText style={styles.cardTitle}>💡 Pro Tips</RNText>
          <View style={styles.divider} />
          <Row
            title="Quick Actions"
            description="Long press on items for quick actions and options"
            left={<IconCircle icon="more" size={32} iconSize={15} />}
          />
          <Row
            title="Photo Browser"
            description="Tap photos to view full-screen with pinch-to-zoom"
            left={<IconCircle icon="camera" size={32} iconSize={15} />}
          />
          <Row
            title="AI Extraction"
            description="Write natural stories and let AI automatically extract relations"
            left={<IconCircle icon="network" size={32} iconSize={15} />}
          />
          <Row
            title="Timeline Filters"
            description="Use filters to view specific types of relations in the timeline"
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
  appBar: { backgroundColor: fz.paper, paddingBottom: fz.s.sm },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
    paddingBottom: fz.s.sm,
  },
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