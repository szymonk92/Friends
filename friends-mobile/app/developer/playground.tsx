import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, SegmentedButtons, ActivityIndicator, HelperText, useTheme, Chip } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { extractRelationsFromStorySession, ExtractionResult } from '../../lib/ai/extraction';
import { AIModel, useSettings } from '../../store/useSettings';
import { AIServiceConfig } from '../../lib/ai/ai-service';
import { useCreateStory } from '@/hooks/useStories';

// Design-corpus stories for testing the real story → extract → review flow
// (not the playground's one-shot call). Saved unprocessed via useCreateStory,
// same path as the "Add Story" screen — so duplicate detection (the two
// Johns), sequential context, and the review queue all behave for real.
const DESIGN_CORPUS_STORIES: { title: string; text: string; daysAgo: number }[] = [
  {
    title: 'Paulina',
    daysAgo: 5,
    text: `Poznalismy sie w 2010 roku, na licealnym projekcie 'Moj projekt, moje zycie'. Od razu bylismy soba zainteresowani. Spotykalismy sie przez chwile.
Paulina lubi pewnych siebie mezczyzn. Jest wegetarianka od 10 lat, nie je miesa. Ale lubi kawe, od zawsze.

Nie slucha hihpopu ani rapu. Grala kiedys na instrumencie, nie pamietam jakim, detym? Byla klnerka, teraz pracuje jako wirtuala asystenka we wlasnej firmie. Chcialaby przeprowadzic sie do Rzeszowa, chlopak? Nie wiem

Miala okres chodzenia po klubach i ubeirania sie w krutkie spodniczki.

Nosi okulary! Nie lubi deszczu, bo kreca sie jej wlosy.

W marcu byla w Australii z Salvo przez caly misiac.

Spala z hcopakami z 4-5 krajow.

....

Zerwala razeczyny z Salvadore, miszkala na Sycylii przed 4 lata, i w czerwcu wrocila do Polski. W kweitniu spedzila juz tu sporo czasu majac operacje guza na piersi.
Ma problemy z tarczyca, tak jak i ja.
...
Jej najmlodzsa siostra, Iza jest lesbijka, niedawno tez rozstala sie z partnerka, mieszkaly przez lata we Wroclawiu.`,
  },
  {
    title: 'John from Texas',
    daysAgo: 4,
    text: `Poznalem go w 2018 na targach w Dallas, przez Mike'a. Wielki chlop, ze 2 metry, broda do polowy klatki. Zawsze w kapeluszu, nawet w budynku. Ma blizne nad lewa brwia, cos z bykiem, nie chcial gadac.

Ranczo pod Amarillo, jakies 300 akrow? Moze wiecej. Hoduje bydlo. Ma 4 konie, jeden sie nazywa Dusty, stary juz, 22 lata. Pies Buck, blue heeler, jezdzi z nim wszedzie w pickupie.

Nie pije. W ogole. Byl alkoholikiem, 11 lat trzezwy, mowil o tym raz przy ognisku i wiecej nie wracal do tematu.

Umie spawac, podkuwac konie, strzela swietnie. Byl w wojsku, Irak, chyba 2004-2006?

Republikanin, ale nie taki krzykliwy. Nie lubi Kalifornii i "ludzi z miasta".

Rozwiedziony, dwie corki, Emma i chyba Sarah? Starsza studiuje w Austin. Widuje je rzadko.

Wstaje o 4:30 kazdego dnia. Kawa czarna, nic wiecej na sniadanie.

...

Nienawidzi latac samolotem. Jechal 14 godzin autem na wesele zamiast leciec.

Kiedys opowiadal jak stracil 40 sztuk bydla w burzy sniegowej w 2021, znalazl je dopiero po 3 dniach przy plocie, wszystkie zamarzniete stojac. Mowil to bez emocji ale potem dlugo milczal. To byla chyba najgorsza rzecz jaka mu sie przytrafila.

Chce kupic sasiednia dzialke.

Alergia na penicyline!`,
  },
  {
    title: 'Ann from NYC',
    daysAgo: 3,
    text: `Ann, poznalismy sie na retreacie w Portugalii w 2022. Z Brooklynu, wczesniej Manhattan ale mowi ze "Manhattan to juz nie to samo".

Weganka, 6 lat. Bezglutenowa tez ale to chyba moda a nie alergia? Nie, czekaj, mowila ze ma celiakie. Zdiagnozowana. Wiec to powazne.
Uczulona na orzechy, nosi EpiPen.

Joga codziennie, 6 rano, ashtanga. Uczy tez, ma certyfikat 500h, prowadzi zajecia w studiu na Bedford. Ale to nie jest jej glowna praca, pracuje w marketingu w jakims startupie.

Medytuje. Nie pije alkoholu, nie pije kawy (!), tylko matcha.

Ma 3 koty, wszystkie ze schroniska: Miso, Kale i trzeci... Juniper? Cos na J. Jeden jest slepy.

Wspiera jakies organizacje, PETA chyba i cos lokalnego. Nie kupuje nic ze skory. Sprawdza kazdy kosmetyk czy nie testowany na zwierzetach.

Biegala maraton NYC w 2023, 4:12.

...

Ma lek. Bierze cos na to, nie pytalem. Miala wypalenie w 2021, rzucila prace w agencji, stad ten retreat wlasciwie.

Mowi o sobie "empatka". Duzo o energii i o tym ze ludzie "biora jej energie".

Nie znosi glosnych miejsc, tlumu, metra w godzinach szczytu. Wychodzi z imprez o 21.

Chce otworzyc wlasne studio, moze poza miastem, Hudson Valley.

Jej mama miala raka, przezyla. Sa bardzo blisko, dzwonia codziennie.

Ojciec — nie rozmawiaja. Od lat.`,
  },
  {
    title: 'John from Spain',
    daysAgo: 2,
    text: `Drugi John! Ten z Barcelony, znajomy Marty. Ciagle ich myle jak pisze.

Wlasciwie Juan ale wszyscy mowia na niego John, albo Johnny, a na festiwalach "El Rubio" bo byl kiedys blondynem.

Zna WSZYSTKICH. Serio. W kazdym miescie w Europie ma kogos. Barcelona — Marta, Pau, jakas Elena. Berlin — Tobias i jego dziewczyna (Lena? Lina?). Amsterdam — dwoch braci, nie pamietam nazwisk, prowadza bar. Lizbona — Rui. Praga — jakis Michal, Polak chyba.

Nie ma mieszkania. Serio, nie ma. Spi u ludzi, czasem hostel. Mowi "moje mieszkanie to Europa". Ostatnie 3 lata tak.

Mieszkal w Barcelonie do 2021. Przedtem Madryt, urodzil sie w Sewilli.

Sound engineer, robi festiwale. Sonar, Primavera, cos w Chorwacji. Ale placa mu na czarno wiekszosc.

Mowi po hiszpansku, angielsku, katalonsku, wlosku, troche niemiecki i uczy sie portugalskiego.

Gra na gitarze i na decksach, DJ-uje.

Nie je przed 14. Mowi ze intermittent fasting ale podejrzewam ze po prostu spi.

Pali. Duzo. I trawke.

...

Byl na 40+ festiwalach chyba. W 2019 zaliczyl 11 w jedno lato.

Zlamal noge w Amsterdamie skaczac z czegos. 2022? Albo 2023.

Ma tatuaz z data, nie chce powiedziec czyja.

Mial dziewczyne, Clara, 4 lata, rozstali sie bo "ona chciala dom". Nadal sie przyjazna. Ona teraz w Walencji z kims innym.

Kiedys mowil ze chce przestac, osiasc, otworzyc studio nagraniowe. Ale to mowil pijany i nigdy potem nie wrocil do tematu. Chyba nie chce naprawde.

Zawsze spozniony. ZAWSZE. Godzina to minimum.`,
  },
  {
    title: 'Pan Zbyszek — mój landlord',
    daysAgo: 1,
    text: `Wynajmuje od niego od 2019. Wlasciwie nie wiem ile ma lat, 60? 65? Wyglada na wiecej.

Ma jakies 100 mieszkan. Sto! Moze wiecej, nie chce mowic dokladnie. Wiekszosc na Podgorzu i w centrum. Kupowal od lat 90.

Pracuje w urzedzie skarbowym. 30 lat chyba. To jest zabawne bo ma te wszystkie mieszkania i pracuje w skarbowce, i nikt nie pyta.

Zawsze w kapeluszu. ZAWSZE. Ma ich duzo, w zimie inny, latem inny. I okulary, grube, stare oprawki, chyba te same od 20 lat.

Pije. Duzo. Raz przyszedl po czynsz o 10 rano i czulem od niego. Nie wiem czy to problem czy po prostu tak ma. Nie moje sprawy.

Chodzi do kosciola co niedziela, pierwsza lawka. Mowi o Bogu, "z Bogiem" na koniec kazdej rozmowy telefonicznej.
Ale wyrzucil rodzine z dzieckiem w grudniu bo spoznili sie 2 miesiace z czynszem. Przed swietami. Wiec nie wiem.

Czynsz tylko gotowka. Nie chce przelewow. Nigdy.

Nie odpisuje na maile, chyba nie ma maila. Tylko telefon.

Nic nie naprawia. Zawsze "jutro", "w przyszlym tygodniu". Kran cieknie od roku.

...

Jezdzi starym mercedesem, W124, ale wypielegnowany, myje sam.

Zona, Halina, 40 lat malzenstwa. Nie widzialem jej nigdy. Syn w Anglii, nie chce miec z tym nic wspolnego, podobno sie poklocili.

Kiedys po pijaku opowiedzial mi ze jego ojciec mial kamienice przed wojna, komuna zabrala, dziadek umarl w biedzie. Powiedzial to raz i nigdy wiecej. Chyba dlatego kupuje te mieszkania. Nie moge tego udowodnic ale tak mysle.

Przesadny. Nie podpisze umowy w piatek 13.

Raz dal mi butelke na swieta, bez powodu. I zapytal czy mam co jesc. Wiec nie jest zly. Tylko dziwny.

Zna duzo ludzi w Dortmundzie. Waznych. Jezdzi tam 2-3 razy w roku, mowi ze "interesy", nigdy nie precyzuje jakie.

Zna prezydenta Dortmundu, osobiscie. Pokazywal zdjecie na telefonie, we dwoch, na jakims bankiecie. Nie wiem czy sie znaja naprawde czy to bylo jedno zdjecie. Ale zdjecie bylo.

Wymienia nazwiska ktorych nie znam. Jakis Krzysztof cos, radny? I jakis Niemiec, Weber chyba. Polonia go tam zna, duzo Polakow od pokolen.

Podobno ma tam tez mieszkania, ale mniej.

I mowi ze sam bedzie kiedys kandydowal na prezydenta Dortmundu. Nie zartuje. Powiedzial to trzy razy przy roznych okazjach, wiec chyba serio. Smialem sie za pierwszym razem, on nie.

Nienawidzi chodzenia po gorach. Zaproponowalem raz wyjazd w Beskidy, spojrzal na mnie jakbym go obrazil. "Po co?"`,
  },
];

const PRESET_STORIES: { label: string; emoji: string; text: string }[] = [
  {
    label: 'Baby expected',
    emoji: '🍼',
    text: `Caught up with Anna and Mark yesterday — they're absolutely glowing. Anna is 6 months pregnant, due in September. It's a girl! They've already painted the nursery yellow. Mark is nervous but over the moon. Anna said she can't eat sushi anymore, which is killing her. They're thinking of naming her Zosia after Mark's grandmother. Anna is still working but plans to take maternity leave in August.`,
  },
  {
    label: 'Engagement + Turkey',
    emoji: '💍',
    text: `Had dinner with Tom and Kasia last night. Tom finally proposed on the beach in Sopot last weekend — Kasia said yes obviously. She showed me the ring, it's gorgeous. They're thinking of getting married next summer, probably outdoors somewhere in the mountains. Before the wedding, they're planning a big trip to Turkey in October — Istanbul, Cappadocia, the whole thing. Tom's been learning basic Turkish on Duolingo. Kasia is already obsessing over dress designers.`,
  },
  {
    label: 'Work burnout',
    emoji: '😔',
    text: `Piotr called me this evening, didn't sound great. He's been at the same company for 7 years and he says he just can't do it anymore. His manager takes credit for everything, the pay hasn't moved in two years, and he's been working nights and weekends for months. He said he's been thinking about quitting and maybe travelling for a few months to reset. What worries me is he also mentioned not sleeping well and losing interest in things he used to love — football, cooking, even his dog. He cried a bit. I think he might be going through depression, not just burnout.`,
  },
];

export default function PlaygroundScreen() {
    const theme = useTheme();
    const { apiKey, geminiApiKey, ollamaApiKey, hasActiveApiKey } = useSettings();
    const createStory = useCreateStory();

    const [story, setStory] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedModel, setSelectedModel] = useState<AIModel>('gemini');
    const [variant, setVariant] = useState<'default' | 'strict' | 'creative'>('default');

    const [seeding, setSeeding] = useState(false);
    const [seedError, setSeedError] = useState<string | null>(null);
    const [seededCount, setSeededCount] = useState(0);

    const handleSeedDesignCorpus = async () => {
        setSeeding(true);
        setSeedError(null);
        setSeededCount(0);
        try {
            for (const s of DESIGN_CORPUS_STORIES) {
                await createStory.mutateAsync({
                    title: s.title,
                    content: s.text,
                    storyDate: new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000),
                });
                setSeededCount((n) => n + 1);
            }
        } catch (err) {
            setSeedError((err as Error).message);
        } finally {
            setSeeding(false);
        }
    };

    const handleExtract = async () => {
        if (!story.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Determine which API key to use based on selected model
            let activeApiKey = '';
            if (selectedModel === 'anthropic') {
                activeApiKey = apiKey || '';
            } else if (selectedModel === 'ollama') {
                activeApiKey = ollamaApiKey || '';
            } else {
                activeApiKey = geminiApiKey || '';
            }

            if (!activeApiKey) {
                throw new Error(`No API key set for ${selectedModel}`);
            }

            const config: AIServiceConfig = {
                model: selectedModel,
                apiKey: activeApiKey
            };

            // We need to pass the variant to the system prompt.
            // Since extractRelationsFromStorySession uses createSystemPrompt internally,
            // we might need to modify extractRelationsFromStorySession to accept session config or prompt.
            // FOR NOW: We will assume we just want to test the model output with default prompt, 
            // or we need to update extractRelations to allow overriding system prompt.
            //
            // Checking local files, we see extractRelationsFromStorySession creates a session with createSystemPrompt().
            // We should probably update extraction.ts to allow passing a system prompt or variant, but 
            // for this MVP let's stick to the available function.
            // Wait! I updated createSystemPrompt but not extraction.ts to pass it through!
            // I should update extraction.ts next.

            const extractionResult = await extractRelationsFromStorySession(
                story,
                [], // No existing people for playground
                config
                // We'll need to update extraction.ts to pass variant if we want to support it fully here
            );

            setResult(extractionResult);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <Stack.Screen options={{ title: 'AI Playground', presentation: 'modal' }} />
            <ScrollView contentContainerStyle={styles.container}>
                <Card style={styles.inputCard}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.label}>Seed Design-Corpus Stories</Text>
                        <Text variant="bodySmall" style={styles.presetsLabel}>
                            Adds 5 real stories (Paulina, John TX, Ann NYC, John Spain, Pan Zbyszek) to your
                            Stories tab, unprocessed — extract each one for real to test the 12-type taxonomy,
                            including duplicate detection on the two Johns.
                        </Text>

                        <Button
                            mode="outlined"
                            onPress={handleSeedDesignCorpus}
                            loading={seeding}
                            disabled={seeding}
                            icon="text-box-plus-outline"
                            style={{ marginTop: 8 }}
                        >
                            {seeding
                                ? `Adding story ${seededCount + 1} of ${DESIGN_CORPUS_STORIES.length}…`
                                : seededCount === DESIGN_CORPUS_STORIES.length && seededCount > 0
                                    ? 'Added — go to Stories tab'
                                    : 'Add 5 Stories to Stories Tab'}
                        </Button>

                        {seedError && (
                            <HelperText type="error" visible={!!seedError}>
                                {seedError}
                            </HelperText>
                        )}

                        {!seeding && seededCount === DESIGN_CORPUS_STORIES.length && seededCount > 0 && (
                            <Button mode="text" onPress={() => router.push('/stories')} style={{ marginTop: 4 }}>
                                Open Stories Tab
                            </Button>
                        )}
                    </Card.Content>
                </Card>

                <Card style={styles.inputCard}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.label}>Test Story Extraction</Text>

                        <Text variant="labelSmall" style={styles.presetsLabel}>Presets</Text>
                        <View style={styles.presetChips}>
                            {PRESET_STORIES.map((preset, idx) => (
                                <Chip
                                    key={idx}
                                    onPress={() => setStory(preset.text)}
                                    icon={() => <Text>{preset.emoji}</Text>}
                                    style={styles.presetChip}
                                    compact
                                >
                                    {preset.label}
                                </Chip>
                            ))}
                        </View>

                        <View style={styles.controls}>
                            <Text variant="labelSmall">Model</Text>
                            <SegmentedButtons
                                value={selectedModel}
                                onValueChange={(val) => setSelectedModel(val as AIModel)}
                                buttons={[
                                    { value: 'gemini', label: 'Gemini' },
                                    { value: 'anthropic', label: 'Claude' },
                                    { value: 'ollama', label: 'Ollama' },
                                ]}
                                style={styles.segmented}
                            />
                            {/* Sub-selection for Gemini could go here if needed, or just rely on global settings? 
                     Actually the UI above just toggles anthropic/gemini family. To keep it simple, 
                     we might want a dropdown for specific models. For now let's stick to family or 
                     update UI to show specific gemini versions.
                     Let's add specific versions to SegmentedButtons if space allows, or use a picker.
                     Given space constraints, let's just stick to 'gemini' (which defaults to 2.0-flash-lite)
                     and maybe add 'Flash' button.
                  */}
                        </View>

                        <TextInput
                            mode="outlined"
                            multiline
                            numberOfLines={6}
                            placeholder="Enter a story about a friend..."
                            value={story}
                            onChangeText={setStory}
                            style={styles.input}
                        />

                        <Button
                            mode="contained"
                            onPress={handleExtract}
                            loading={loading}
                            disabled={loading || !story.trim()}
                            icon="creation"
                        >
                            Extract Information
                        </Button>

                        {error && (
                            <HelperText type="error" visible={!!error}>
                                {error}
                            </HelperText>
                        )}
                    </Card.Content>
                </Card>

                {result && (
                    <View style={styles.results}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Extraction Results</Text>

                        <Card style={styles.resultCard}>
                            <Card.Title title="People Found" />
                            <Card.Content>
                                {result.people.length === 0 ? (
                                    <Text variant="bodyMedium" style={{ opacity: 0.6 }}>No people found.</Text>
                                ) : (
                                    result.people.map((p, i) => (
                                        <View key={i} style={styles.item}>
                                            <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{p.name}</Text>
                                            <Text variant="bodySmall">{p.isNew ? 'New' : 'Existing'} • {p.personType} • {(p.confidence * 100).toFixed(0)}%</Text>
                                        </View>
                                    ))
                                )}
                            </Card.Content>
                        </Card>

                        <Card style={styles.resultCard}>
                            <Card.Title title="Relations" />
                            <Card.Content>
                                {result.relations.length === 0 ? (
                                    <Text variant="bodyMedium" style={{ opacity: 0.6 }}>No relations found.</Text>
                                ) : (
                                    result.relations.map((r, i) => (
                                        <View key={i} style={styles.item}>
                                            <Text variant="bodyMedium">
                                                <Text style={{ fontWeight: 'bold' }}>{r.subjectName}</Text> {r.relationType} <Text style={{ fontWeight: 'bold' }}>{r.objectLabel}</Text>
                                            </Text>
                                            <Text variant="bodySmall" style={{ opacity: 0.7 }}>Intensity: {r.intensity}</Text>
                                        </View>
                                    ))
                                )}
                            </Card.Content>
                        </Card>

                        <Card style={styles.resultCard}>
                            <Card.Title title={`⚠️ Conflicts (${result.conflicts.length})`} />
                            <Card.Content>
                                {result.conflicts.length === 0 ? (
                                    <Text variant="bodyMedium" style={{ opacity: 0.6 }}>No conflicts detected.</Text>
                                ) : (
                                    result.conflicts.map((c, i) => (
                                        <View key={i} style={styles.item}>
                                            <Text variant="bodySmall" style={{ fontWeight: 'bold', color: '#e65100' }}>{c.type}</Text>
                                            <Text variant="bodySmall">{c.description}</Text>
                                            <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                                                New: {c.newRelation.relationType} → {c.newRelation.objectLabel}
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </Card.Content>
                        </Card>

                        <Card style={styles.resultCard}>
                            <Card.Title title="Raw JSON" />
                            <Card.Content>
                                <Text variant="bodySmall" style={{ fontFamily: 'System' }}>
                                    {JSON.stringify(result, null, 2)}
                                </Text>
                            </Card.Content>
                        </Card>                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 40,
    },
    inputCard: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 12,
    },
    presetsLabel: {
        marginBottom: 6,
        opacity: 0.6,
    },
    presetChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    presetChip: {
        marginRight: 0,
    },
    controls: {
        marginBottom: 16,
    },
    segmented: {
        marginTop: 4,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    results: {
        gap: 16,
    },
    sectionTitle: {
        marginLeft: 4,
        marginBottom: 8,
    },
    resultCard: {
        marginBottom: 8,
    },
    item: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    }
});
