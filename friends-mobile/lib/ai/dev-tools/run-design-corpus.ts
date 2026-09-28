/**
 * Runs the 5-story design corpus through the real extractor.
 *
 *   ANTHROPIC_API_KEY=sk-... npx tsx <this file>
 *   GEMINI_API_KEY=...      npx tsx <this file>
 *
 * Stories run SEQUENTIALLY with accumulated people, mirroring real app usage —
 * so the two-Johns duplicate case is actually exercised.
 *
 * The point of the run is the aggregate at the end: which of the 21 relation
 * types actually fire on dense real-world input, and which never do.
 */

import { extractRelationsFromStorySession } from '../extraction';
import type { AIServiceConfig } from '../ai-service';

const ALL_TYPES = [
  'KNOWS', 'LIKES', 'DISLIKES', 'UNKNOWN', 'ASSOCIATED_WITH', 'EXPERIENCED',
  'HAS_SKILL', 'OWNS', 'HAS_IMPORTANT_DATE', 'IS', 'BELIEVES', 'FEARS',
  'WANTS_TO_ACHIEVE', 'STRUGGLES_WITH', 'CARES_FOR', 'DEPENDS_ON',
  'REGULARLY_DOES', 'PREFERS_OVER', 'USED_TO_BE', 'SENSITIVE_TO',
  'UNCOMFORTABLE_WITH',
];

const STORIES: { name: string; text: string }[] = [
  {
    name: 'Paulina',
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
    name: 'John (Teksas)',
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
    name: 'Ann (NY)',
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

Ojciec - nie rozmawiaja. Od lat.`,
  },
  {
    name: 'John (Hiszpania)',
    text: `Drugi John! Ten z Barcelony, znajomy Marty. Ciagle ich myle jak pisze.

Wlasciwie Juan ale wszyscy mowia na niego John, albo Johnny, a na festiwalach "El Rubio" bo byl kiedys blondynem.

Zna WSZYSTKICH. Serio. W kazdym miescie w Europie ma kogos. Barcelona - Marta, Pau, jakas Elena. Berlin - Tobias i jego dziewczyna (Lena? Lina?). Amsterdam - dwoch braci, nie pamietam nazwisk, prowadza bar. Lizbona - Rui. Praga - jakis Michal, Polak chyba.

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
    name: 'Pan Zbyszek (landlord)',
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

async function main() {
  const anth = process.env.ANTHROPIC_API_KEY || '';
  const gem = process.env.GEMINI_API_KEY || '';
  if (!anth && !gem) {
    console.error('No key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.');
    process.exit(1);
  }
  const config: AIServiceConfig = {
    model: anth ? 'anthropic' : 'gemini',
    apiKey: anth || gem,
  };
  console.log(`model: ${config.model}\n`);

  // Accumulates across stories so dedupe / two-Johns is actually tested.
  const known: { id: string; name: string }[] = [];
  const typeCount = new Map<string, number>();
  const unmapped: string[] = [];

  for (const story of STORIES) {
    console.log('='.repeat(64));
    console.log(`STORY: ${story.name}   (known people so far: ${known.length})`);
    console.log('='.repeat(64));

    const t0 = Date.now();
    const res = await extractRelationsFromStorySession(story.text, known, config);
    const ms = Date.now() - t0;

    console.log(`\n-- people (${res.people.length}) --`);
    for (const p of res.people) {
      console.log(`   ${p.isNew ? 'NEW ' : 'MATCH'} ${p.name}  [${p.personType}] conf=${p.confidence}`);
      if (p.isNew) known.push({ id: p.id, name: p.name });
    }

    console.log(`\n-- relations (${res.relations.length}) --`);
    const byType = new Map<string, typeof res.relations>();
    for (const r of res.relations) {
      if (!byType.has(r.relationType)) byType.set(r.relationType, []);
      byType.get(r.relationType)!.push(r);
      typeCount.set(r.relationType, (typeCount.get(r.relationType) || 0) + 1);
      if (!ALL_TYPES.includes(r.relationType)) unmapped.push(`${story.name}: ${r.relationType}`);
    }
    for (const [type, rels] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`   ${type} (${rels.length})`);
      for (const r of rels) {
        const bits = [
          r.intensity && `int=${r.intensity}`,
          r.status && r.status !== 'current' && `status=${r.status}`,
          r.category && `cat=${r.category}`,
        ].filter(Boolean).join(' ');
        console.log(`      ${r.subjectName} → "${r.objectLabel}"  conf=${r.confidence} ${bits}`);
      }
    }

    if (res.conflicts?.length) {
      console.log(`\n-- conflicts (${res.conflicts.length}) --`);
      res.conflicts.forEach((c) => console.log(`   [${c.type}] ${c.description}`));
    }
    if (res.ambiguousMatches?.length) {
      console.log(`\n-- ambiguous (${res.ambiguousMatches.length}) --`);
      res.ambiguousMatches.forEach((a) =>
        console.log(`   "${a.nameInStory}" → ${a.possibleMatches.map((m) => m.name).join(', ')}`)
      );
    }
    console.log(`\n(${ms}ms, ${res.tokensUsed ?? '?'} tokens)\n`);
  }

  // ---- the actual point of the exercise ----
  console.log('='.repeat(64));
  console.log('TYPE USAGE ACROSS ALL 5 STORIES');
  console.log('='.repeat(64));
  const used = [...typeCount].sort((a, b) => b[1] - a[1]);
  const total = used.reduce((s, [, n]) => s + n, 0);
  for (const [type, n] of used) {
    console.log(`  ${String(n).padStart(3)}  ${'█'.repeat(Math.min(n, 40))} ${type}`);
  }
  const never = ALL_TYPES.filter((t) => !typeCount.has(t));
  console.log(`\n  total relations: ${total}`);
  console.log(`  types used:      ${used.length}/${ALL_TYPES.length}`);
  console.log(`  NEVER USED:      ${never.join(', ') || '(none)'}`);
  if (unmapped.length) {
    console.log(`\n  !! types the AI invented that are not in the enum:`);
    [...new Set(unmapped)].forEach((u) => console.log(`     ${u}`));
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
