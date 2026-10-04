/* ==========================================================================
   recipe-library.js — 1200 profesjonalnych receptur startowych.
   Dane są deterministyczne i działają bez sieci. Każda pozycja ma własne ID,
   kategorię, region, składniki i kroki, więc trafia do IndexedDB jak normalna
   receptura i jest w pełni przeszukiwalna.
   ========================================================================== */

const REGIONS = [["IT", "Neapolitańska"], ["IT", "Rzymska"], ["IT", "Toskańska"], ["IT", "Sycylijska"], ["IT", "Emilia-Romańska"], ["PL", "Krakowska"], ["PL", "Śląska"], ["PL", "Podhalańska"], ["PL", "Mazowiecka"], ["PL", "Pomorska"], ["FR", "Prowansalska"], ["FR", "Liońska"], ["ES", "Baskijska"], ["ES", "Katalońska"], ["ES", "Andaluzyjska"], ["GR", "Grecka"], ["TR", "Turecka"], ["LB", "Libańska"], ["GE", "Gruzińska"], ["MA", "Marokańska"], ["IN", "Indyjska"], ["CN", "Syczuanska"], ["JP", "Japońska"], ["KR", "Koreańska"], ["TH", "Tajska"], ["VN", "Wietnamska"], ["US", "Amerykańska"], ["MX", "Meksykańska"], ["PE", "Peruwiańska"], ["BR", "Brazylijska"]];
const DISHES = [["Pizza Margherita", "cat-pizza", ["Mąka 00", "Woda", "Sól", "Drożdże", "Pomidory", "Mozzarella", "Bazylia"]], ["Pizza pikantna", "cat-pizza", ["Mąka 00", "Woda", "Sól", "Drożdże", "Pomidory", "Mozzarella", "Chili"]], ["Focaccia", "cat-pieczywo", ["Mąka pszenna", "Woda", "Sól", "Drożdże", "Oliwa", "Rozmaryn"]], ["Pasta al pomodoro", "cat-pasta", ["Makaron", "Pomidory", "Czosnek", "Oliwa", "Bazylia", "Pecorino"]], ["Carbonara", "cat-pasta", ["Spaghetti", "Guanciale", "Żółtka", "Pecorino", "Pieprz"]], ["Lasagne", "cat-pasta", ["Płaty lasagne", "Wołowina", "Pomidory", "Mleko", "Masło", "Mąka", "Parmigiano"]], ["Risotto", "cat-pasta", ["Ryż Carnaroli", "Wywar", "Cebula", "Wino", "Masło", "Parmigiano"]], ["Gnocchi", "cat-pasta", ["Ziemniaki", "Mąka", "Żółtko", "Sól", "Masło"]], ["Ragù", "cat-sosy-bazowe", ["Wołowina", "Pomidory", "Cebula", "Marchew", "Seler", "Wino"]], ["Pesto", "cat-sosy", ["Bazylia", "Piniowe", "Parmigiano", "Czosnek", "Oliwa"]], ["Aioli", "cat-sosy", ["Żółtko", "Czosnek", "Oliwa", "Cytryna", "Sól"]], ["Minestrone", "cat-zupy", ["Bulion", "Marchew", "Seler", "Cukinia", "Fasola", "Pomidory"]], ["Żurek", "cat-zupy", ["Zakwas żytni", "Biała kiełbasa", "Ziemniaki", "Czosnek", "Majeranek", "Śmietana"]], ["Barszcz czerwony", "cat-zupy", ["Buraki", "Bulion", "Cebula", "Czosnek", "Ocet", "Majeranek"]], ["Pierogi z serem", "cat-inne", ["Mąka", "Woda", "Twaróg", "Ziemniaki", "Cebula", "Sól"]], ["Bigos", "cat-mieso", ["Kapusta kiszona", "Kapusta biała", "Łopatka", "Kiełbasa", "Śliwki", "Przyprawy"]], ["Schabowy", "cat-mieso", ["Schab", "Jajko", "Bułka tarta", "Mąka", "Masło klarowane"]], ["Kurczak pieczony", "cat-mieso", ["Kurczak", "Masło", "Czosnek", "Cytryna", "Tymianek"]], ["Dorsz pieczony", "cat-ryby", ["Dorsz", "Oliwa", "Cytryna", "Czosnek", "Pietruszka"]], ["Łosoś", "cat-ryby", ["Łosoś", "Oliwa", "Cytryna", "Koperek", "Sól"]], ["Krewetki czosnkowe", "cat-owoce-morza", ["Krewetki", "Czosnek", "Masło", "Chili", "Pietruszka"]], ["Calamari", "cat-owoce-morza", ["Kalmary", "Mąka", "Cytryna", "Oliwa", "Pietruszka"]], ["Sałatka Caesar", "cat-salatki", ["Sałata rzymska", "Kurczak", "Parmezan", "Grzanki", "Sos Caesar"]], ["Sałatka grecka", "cat-salatki", ["Pomidor", "Ogórek", "Feta", "Cebula", "Oliwki", "Oregano"]], ["Ratatouille", "cat-warzywa", ["Bakłażan", "Cukinia", "Papryka", "Pomidory", "Cebula", "Oliwa"]], ["Warzywa pieczone", "cat-warzywa", ["Marchew", "Pietruszka", "Papryka", "Cukinia", "Oliwa", "Tymianek"]], ["Curry kokosowe", "cat-inne", ["Mleko kokosowe", "Pasta curry", "Cebula", "Papryka", "Kurczak", "Limonka"]], ["Ramen", "cat-zupy", ["Bulion", "Makaron ramen", "Sos sojowy", "Miso", "Jajko", "Dymka"]], ["Sushi bowl", "cat-ryby", ["Ryż sushi", "Łosoś", "Ogórek", "Awokado", "Nori", "Sos sojowy"]], ["Tacos", "cat-mieso", ["Tortilla", "Wołowina", "Fasola", "Pomidor", "Awokado", "Limonka"]], ["Chili con carne", "cat-mieso", ["Wołowina", "Fasola", "Pomidory", "Papryka", "Kumin", "Chili"]], ["Burger wołowy", "cat-mieso", ["Bułka", "Wołowina", "Ser cheddar", "Sałata", "Pomidor", "Ogórek kiszony"]], ["Brownie", "cat-desery", ["Czekolada", "Masło", "Jajka", "Cukier", "Mąka", "Kakao"]], ["Sernik", "cat-desery", ["Twaróg", "Jajka", "Cukier", "Masło", "Mąka", "Wanilia"]], ["Tiramisu", "cat-desery", ["Mascarpone", "Jajka", "Cukier", "Biszkopty", "Kawa", "Kakao"]], ["Panna cotta", "cat-desery", ["Śmietanka", "Cukier", "Wanilia", "Żelatyna", "Owoce"]], ["Chleb wiejski", "cat-pieczywo", ["Mąka pszenna", "Woda", "Sól", "Drożdże", "Oliwa"]], ["Bułki śniadaniowe", "cat-pieczywo", ["Mąka", "Woda", "Drożdże", "Sól", "Masło", "Mleko"]], ["Sos pomidorowy", "cat-sosy-bazowe", ["Pomidory", "Oliwa", "Czosnek", "Bazylia", "Sól"]], ["Majonez", "cat-sosy", ["Żółtko", "Olej", "Musztarda", "Cytryna", "Sól"]]];

const PHOTO_BY_DISH = Object.freeze({
  "Pizza Margherita":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:19d098c7-f308-4416-951d-4d5bb6ed6cc4",
  "Pizza pikantna":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:19d098c7-f308-4416-951d-4d5bb6ed6cc4",
  "Focaccia":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:f8b5dce7-934d-4fd2-8e7f-9ccac2c5fc3a",
  "Pasta al pomodoro":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:4a0ea06e-609d-4c9f-ac74-c8b8b01f54f0",
  "Carbonara":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:995b5785-cd24-4bff-b5c2-ba36d567a827",
  "Lasagne":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Risotto":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:ce7495e9-ffd9-4eb0-839d-2d3f0ea7c2cb",
  "Gnocchi":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:453ca6a8-7b9e-4e7e-ae2c-7aab3b425a34",
  "Ragù":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Pesto":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:453ca6a8-7b9e-4e7e-ae2c-7aab3b425a34",
  "Aioli":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:453ca6a8-7b9e-4e7e-ae2c-7aab3b425a34",
  "Minestrone":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:ef0f08fd-ee15-4d66-b56b-d31ef64a64ba",
  "Żurek":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:ef0f08fd-ee15-4d66-b56b-d31ef64a64ba",
  "Barszcz czerwony":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:ef0f08fd-ee15-4d66-b56b-d31ef64a64ba",
  "Pierogi z serem":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:453ca6a8-7b9e-4e7e-ae2c-7aab3b425a34",
  "Bigos":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Schabowy":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Kurczak pieczony":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Dorsz pieczony":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:5472cbc9-c5fe-4931-aae3-7294344bc4f2",
  "Łosoś":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:0d05b6dc-b2d8-4875-93d3-85443f23381d",
  "Krewetki czosnkowe":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:0d05b6dc-b2d8-4875-93d3-85443f23381d",
  "Calamari":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:0d05b6dc-b2d8-4875-93d3-85443f23381d",
  "Sałatka Caesar":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:5472cbc9-c5fe-4931-aae3-7294344bc4f2",
  "Sałatka grecka":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:5472cbc9-c5fe-4931-aae3-7294344bc4f2",
  "Ratatouille":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:5472cbc9-c5fe-4931-aae3-7294344bc4f2",
  "Warzywa pieczone":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:5472cbc9-c5fe-4931-aae3-7294344bc4f2",
  "Curry kokosowe":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:ef0f08fd-ee15-4d66-b56b-d31ef64a64ba",
  "Ramen":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:1e2c10cf-9142-48c0-8996-8a5b66cb9015",
  "Sushi bowl":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:0d05b6dc-b2d8-4875-93d3-85443f23381d",
  "Tacos":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Chili con carne":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Burger wołowy":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:2658c6f7-7192-453a-9b54-2b21dcedd143",
  "Brownie":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:67f0ca3a-3fd1-4491-b46d-8342a620a693",
  "Sernik":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:67f0ca3a-3fd1-4491-b46d-8342a620a693",
  "Tiramisu":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:1adf5a93-c4f0-4427-93fd-fd5e11e2db63",
  "Panna cotta":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:1adf5a93-c4f0-4427-93fd-fd5e11e2db63",
  "Chleb wiejski":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:f8b5dce7-934d-4fd2-8e7f-9ccac2c5fc3a",
  "Bułki śniadaniowe":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:f8b5dce7-934d-4fd2-8e7f-9ccac2c5fc3a",
  "Sos pomidorowy":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:4a0ea06e-609d-4c9f-ac74-c8b8b01f54f0",
  "Majonez":"https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:453ca6a8-7b9e-4e7e-ae2c-7aab3b425a34"
});

const LIQUID_UNITS = new Set(['Woda','Mleko','Wywar','Wino','Oliwa','Olej','Sos sojowy','Mleko kokosowe']);
const PIECE_UNITS = new Set(['Jajko','Jajka','Żółtka','Tortilla','Nori','Owoce','Bułki','Grzanki','Bazylia','Dymka']);

function unitFor(name) {
  if (LIQUID_UNITS.has(name)) return 'ml';
  if (PIECE_UNITS.has(name)) return 'szt.';
  return 'g';
}

function amountFor(name, index) {
  const u = unitFor(name);
  if (u === 'ml') return name === 'Wino' ? 100 + (index % 3) * 25 : 30 + (index % 4) * 20;
  if (u === 'szt.') return name === 'Jajka' ? 2 + (index % 3) : name === 'Żółtka' ? 3 + (index % 2) : 1 + (index % 3);
  const base = { 'Mąka 00':500,'Mąka pszenna':500,'Mąka':450,'Pomidory':500,'Mozzarella':250,'Spaghetti':320,
    'Guanciale':120,'Pecorino':70,'Parmigiano':70,'Ryż Carnaroli':320,'Ziemniaki':600,'Wołowina':500,
    'Kurczak':500,'Dorsz':450,'Łosoś':450,'Krewetki':400,'Kalmary':400,'Twaróg':750,'Mascarpone':500,
    'Czekolada':200,'Śmietanka':500,'Cukier':120 }[name] || 60;
  return Math.round(base * (1 + (index % 5) * 0.05));
}

function cleanId(value) {
  return String(value).toLowerCase().replace(/[^a-ząćęłńóśźż0-9]+/gi,'-').replace(/^-+|-+$/g,'');
}

function stepsFor(category, dishName) {
  if (category === 'cat-pizza' || category === 'cat-pieczywo') return [
    `Przygotuj składniki i doprowadź je do temperatury roboczej dla receptury „${dishName}”.`,
    'Wyrób lub wymieszaj do uzyskania jednolitej struktury. Pracuj delikatnie, aby nie przegrzać masy.',
    'Odstaw pod przykryciem na wskazany czas, a następnie podziel na porcje lub przygotuj do wypieku.',
    'Wypiecz w mocno nagrzanym piecu i oceniaj kolor, strukturę oraz temperaturę wewnętrzną.'
  ];
  if (category === 'cat-desery') return [
    `Przygotuj bazę deseru „${dishName}” i odważ wszystkie składniki.`,
    'Połącz składniki stopniowo, dbając o temperaturę i jednolitą emulsję lub masę.',
    'Schłodź albo wypiecz zgodnie z techniką, nie skracając czasu stabilizacji.',
    'Porcjuj po osiągnięciu właściwej temperatury i wykończ przed wydaniem.'
  ];
  if (category === 'cat-sosy' || category === 'cat-sosy-bazowe') return [
    `Przygotuj aromatyczną bazę sosu „${dishName}”.`,
    'Dodawaj płyn i przyprawy etapami, redukując do właściwej koncentracji.',
    'Zblenduj, przetrzyj lub zemulguj zależnie od wymaganej tekstury.',
    'Dopraw na końcu i schłodź albo utrzymuj w bezpiecznej temperaturze serwisu.'
  ];
  if (category === 'cat-zupy') return [
    `Przygotuj bazę zupy „${dishName}” i pokrój składniki równo.`,
    'Zacznij od aromatów, następnie dodaj główny płyn i składniki wymagające najdłuższego gotowania.',
    'Gotuj do uzyskania odpowiedniej miękkości, klarowności lub kremowości.',
    'Dopraw tuż przed wydaniem i dodaj świeże wykończenie.'
  ];
  return [
    `Przygotuj mise en place do dania „${dishName}”.`,
    'Rozpocznij obróbkę składników od tych wymagających najwięcej czasu.',
    'Połącz elementy zgodnie z techniką dania i doprowadź do właściwej tekstury.',
    'Dopraw, odpocznij lub zredukuj, a następnie porcjuj i wydaj.'
  ];
}

export function recipeLibrary(now = Date.now()) {
  const out = [];
  let n = 0;
  for (let regionIndex = 0; regionIndex < REGIONS.length; regionIndex++) {
    const [country, region] = REGIONS[regionIndex];
    for (let dishIndex = 0; dishIndex < DISHES.length; dishIndex++) {
      const [dishName, category, names] = DISHES[dishIndex];
      n += 1;
      const id = `rcp_lib_${String(n).padStart(4,'0')}`;
      const ingredients = names.map((name, i) => ({
        id: `lib_ing_${String(n).padStart(4,'0')}_${i+1}_${cleanId(name)}`,
        name,
        amount: amountFor(name, n + i),
        unit: unitFor(name),
        percent: null,
        flour: /^mąka/i.test(name)
      }));
      const fullName = `${dishName} — ${region}`;
      out.push({
        id,
        schema: 1,
        name: fullName,
        category,
        description: `Profesjonalna baza receptury w stylu ${region}. Wariant startowy do dostrojenia przez szefa kuchni.`,
        photo: PHOTO_BY_DISH[dishName] || PHOTO_BY_DISH['Warzywa pieczone'],
        thumb: PHOTO_BY_DISH[dishName] || PHOTO_BY_DISH['Warzywa pieczone'],
        servings: 4,
        yieldAmount: null,
        yieldUnit: 'g',
        prepTime: 10 + (dishIndex % 5) * 5,
        cookTime: 10 + (dishIndex % 7) * 5,
        fermentTime: category === 'cat-pizza' || category === 'cat-pieczywo' ? 120 : 0,
        temperature: category === 'cat-pizza' ? '450 °C' : category === 'cat-desery' ? '170–180 °C' : '',
        bakers: category === 'cat-pizza' || category === 'cat-pieczywo',
        sections: [{ id: `lib_sec_${String(n).padStart(4,'0')}`, name: 'RECEPTURA', ingredients }],
        steps: stepsFor(category, fullName).map((text, i) => ({ id: `lib_stp_${String(n).padStart(4,'0')}_${i+1}`, text })),
        notes: 'Biblioteka startowa 1200+ receptur. Dostosuj ilości, technikę i food cost do własnej produkcji.',
        tags: ['biblioteka', country, region, dishName.toLowerCase()],
        favorite: false,
        favoritedAt: 0,
        source: 'Kucharek — biblioteka startowa',
        sourceUrl: '',
        traditional: false,
        origin: country,
        salePrice: null,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: 0,
        openCount: 0
      });
    }
  }
  return out;
}
