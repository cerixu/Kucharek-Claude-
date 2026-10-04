/* ==========================================================================
   recipe-library.js — duża biblioteka startowa Kucharka.
   Etap 50: 64 bazy dań × 30 profili kulinarnych = 1920 rekordów.
   Rekordy są deterministyczne, przeszukiwalne offline i mają pełny model
   składników/kroków. Profil jest oznaczony jako wariant biblioteczny.
   ========================================================================== */

const PROFILES = [
  ['Neapol','IT'],['Rzym','IT'],['Toskania','IT'],['Sycylia','IT'],['Emilia-Romania','IT'],
  ['Kraków','PL'],['Śląsk','PL'],['Podhale','PL'],['Mazowsze','PL'],['Pomorze','PL'],
  ['Prowansja','FR'],['Lyon','FR'],['Baskonia','ES'],['Katalonia','ES'],['Andaluzja','ES'],
  ['Grecja','GR'],['Turcja','TR'],['Lewant','LB'],['Gruzja','GE'],['Maroko','MA'],
  ['Indie','IN'],['Chiny','CN'],['Japonia','JP'],['Korea','KR'],['Tajlandia','TH'],
  ['Wietnam','VN'],['USA','US'],['Meksyk','MX'],['Peru','PE'],['Brazylia','BR']
];

const DISHES = [
  ['Pizza Margherita','cat-pizza','IT',['Mąka 00','Woda','Sól','Drożdże','Pomidory','Mozzarella','Bazylia']],
  ['Pizza Diavola','cat-pizza','IT',['Mąka 00','Woda','Sól','Drożdże','Pomidory','Mozzarella','Salami piccante','Chili']],
  ['Pizza Quattro formaggi','cat-pizza','IT',['Mąka 00','Woda','Sól','Drożdże','Mozzarella','Gorgonzola','Fontina','Parmigiano']],
  ['Pizza Marinara','cat-pizza','IT',['Mąka 00','Woda','Sól','Drożdże','Pomidory','Czosnek','Oregano','Oliwa']],
  ['Pizza Prosciutto e funghi','cat-pizza','IT',['Mąka 00','Woda','Sól','Drożdże','Pomidory','Mozzarella','Prosciutto','Pieczarki']],
  ['Focaccia genovese','cat-pieczywo','IT',['Mąka pszenna','Woda','Sól','Drożdże','Oliwa','Rozmaryn']],
  ['Ciabatta','cat-pieczywo','IT',['Mąka pszenna','Woda','Sól','Drożdże','Oliwa']],
  ['Carbonara','cat-pasta','IT',['Spaghetti','Guanciale','Żółtka','Pecorino Romano','Pieprz']],
  ['Cacio e pepe','cat-pasta','IT',['Spaghetti','Pecorino Romano','Pieprz','Woda']],
  ['Amatriciana','cat-pasta','IT',['Bucatini','Guanciale','Pomidory','Pecorino Romano','Chili']],
  ['Pasta al pomodoro','cat-pasta','IT',['Spaghetti','Pomidory','Czosnek','Oliwa','Bazylia','Parmigiano']],
  ['Arrabbiata','cat-pasta','IT',['Penne','Pomidory','Czosnek','Chili','Oliwa','Pietruszka']],
  ['Puttanesca','cat-pasta','IT',['Spaghetti','Pomidory','Anchois','Kapary','Oliwki','Czosnek']],
  ['Ragù alla bolognese','cat-sosy-bazowe','IT',['Wołowina','Pancetta','Cebula','Marchew','Seler naciowy','Pomidory','Wino']],
  ['Lasagne al forno','cat-pasta','IT',['Płaty lasagne','Wołowina','Pomidory','Mleko','Masło','Mąka','Parmigiano']],
  ['Gnocchi di patate','cat-pasta','IT',['Ziemniaki','Mąka','Żółtko','Sól','Masło','Szałwia']],
  ['Ravioli ricotta e spinaci','cat-pasta','IT',['Mąka','Jajka','Ricotta','Szpinak','Parmigiano','Gałka muszkatołowa']],
  ['Risotto alla Milanese','cat-pasta','IT',['Ryż Carnaroli','Wywar','Cebula','Białe wino','Szafran','Masło','Parmigiano']],
  ['Risotto ai funghi','cat-pasta','IT',['Ryż Carnaroli','Wywar','Borowiki','Cebula','Wino','Masło','Parmigiano']],
  ['Osso buco','cat-mieso','IT',['Goleń cielęca','Cebula','Marchew','Seler naciowy','Wino','Wywar','Pomidory']],
  ['Vitello tonnato','cat-mieso','IT',['Cielęcina','Tuńczyk','Anchois','Żółtko','Kapary','Cytryna','Oliwa']],
  ['Żurek','cat-zupy','PL',['Zakwas żytni','Biała kiełbasa','Ziemniaki','Czosnek','Majeranek','Śmietana','Jajka']],
  ['Barszcz czerwony','cat-zupy','PL',['Buraki','Wywar','Cebula','Czosnek','Ocet','Majeranek']],
  ['Pierogi ruskie','cat-inne','PL',['Mąka','Woda','Twaróg','Ziemniaki','Cebula','Masło']],
  ['Bigos','cat-mieso','PL',['Kapusta kiszona','Kapusta biała','Łopatka','Kiełbasa','Suszone śliwki','Grzyby']],
  ['Schabowy','cat-mieso','PL',['Schab','Jajko','Bułka tarta','Mąka','Masło klarowane','Sól']],
  ['Coq au vin','cat-mieso','FR',['Kurczak','Boczek','Cebula','Pieczarki','Czerwone wino','Bulion']],
  ['Boeuf bourguignon','cat-mieso','FR',['Wołowina','Boczek','Marchew','Cebula','Pieczarki','Czerwone wino','Bulion']],
  ['Francuska zupa cebulowa','cat-zupy','FR',['Cebula','Masło','Bulion wołowy','Bagietka','Gruyère']],
  ['Chicken tikka masala','cat-mieso','IN',['Kurczak','Jogurt','Pomidory','Śmietanka','Cebula','Imbir','Garam masala']],
  ['Butter chicken','cat-mieso','IN',['Kurczak','Jogurt','Masło','Pomidory','Śmietanka','Garam masala']],
  ['Dal tadka','cat-inne','IN',['Soczewica','Cebula','Pomidor','Czosnek','Imbir','Kurkuma','Kmin']],
  ['Teriyaki chicken','cat-mieso','JP',['Kurczak','Sos sojowy','Mirin','Cukier','Imbir','Czosnek']],
  ['Tonkatsu','cat-mieso','JP',['Schab','Mąka','Jajko','Panko','Olej','Kapusta']],
  ['Ramen shoyu','cat-zupy','JP',['Bulion','Makaron ramen','Sos sojowy','Mirin','Jajka','Chashu','Dymka','Nori']],
  ['Salmon teriyaki','cat-ryby','JP',['Łosoś','Sos sojowy','Mirin','Cukier','Imbir','Sezam']],
  ['Pad Thai','cat-inne','TH',['Makaron ryżowy','Krewetki','Jajka','Tamarind','Sos rybny','Kiełki fasoli','Orzeszki']],
  ['Green curry','cat-inne','TH',['Mleko kokosowe','Pasta curry','Kurczak','Bakłażan','Bazylia tajska','Limonka']],
  ['Tom yum','cat-zupy','TH',['Bulion','Krewetki','Trawa cytrynowa','Galangal','Limonka','Chili','Sos rybny']],
  ['Pho bo','cat-zupy','VN',['Wołowina','Makaron ryżowy','Bulion','Anyż','Cynamon','Imbir','Szczypior']],
  ['Bibimbap','cat-inne','KR',['Ryż','Wołowina','Szpinak','Marchew','Grzyby','Jajko','Gochujang']],
  ['Tacos al pastor','cat-inne','MX',['Tortille kukurydziane','Wieprzowina','Ananas','Cebula','Kolendra','Achiote','Limonka']],
  ['Chili con carne','cat-mieso','MX',['Wołowina','Fasola','Pomidory','Papryka','Kmin','Chili','Cebula']],
  ['Guacamole','cat-sosy','MX',['Awokado','Limonka','Cebula','Pomidor','Kolendra','Chili']],
  ['Cheeseburger','cat-mieso','US',['Bułka','Wołowina','Cheddar','Sałata','Pomidor','Ogórek kiszony','Cebula']],
  ['Fish & chips','cat-ryby','GB',['Dorsz','Mąka','Piwo','Ziemniaki','Olej','Ocet słodowy']],
  ['Brownie','cat-desery','US',['Czekolada','Masło','Jajka','Cukier','Mąka','Kakao']],
  ['Moussaka','cat-mieso','GR',['Bakłażan','Wołowina','Pomidory','Cebula','Mleko','Masło','Mąka']],
  ['Souvlaki','cat-mieso','GR',['Wieprzowina','Oliwa','Cytryna','Czosnek','Oregano','Pita']],
  ['Sałatka grecka','cat-salatki','GR',['Pomidor','Ogórek','Feta','Cebula','Oliwki','Oregano']],
  ['Shakshuka','cat-warzywa','IL',['Jajka','Pomidory','Papryka','Cebula','Kumin','Chili']],
  ['Hummus','cat-sosy','LB',['Ciecierzyca','Tahini','Cytryna','Czosnek','Oliwa','Kumin']],
  ['Sałatka Caesar','cat-salatki','US',['Sałata rzymska','Kurczak','Parmigiano','Grzanki','Anchois','Żółtko','Cytryna']],
  ['Caprese','cat-salatki','IT',['Pomidor','Mozzarella','Bazylia','Oliwa','Sól']],
  ['Salade niçoise','cat-salatki','FR',['Tuńczyk','Jajka','Fasolka szparagowa','Pomidor','Oliwki','Ziemniaki']],
  ['Tiramisu','cat-desery','IT',['Mascarpone','Żółtka','Cukier','Savoiardi','Espresso','Kakao']],
  ['Panna cotta','cat-desery','IT',['Śmietanka','Cukier','Wanilia','Żelatyna','Owoce']],
  ['Crème brûlée','cat-desery','FR',['Śmietanka','Żółtka','Cukier','Wanilia']],
  ['Sernik nowojorski','cat-desery','US',['Serek śmietankowy','Jajka','Cukier','Śmietana','Herbatniki','Masło']],
  ['Szarlotka','cat-desery','PL',['Jabłka','Mąka','Masło','Cukier','Cynamon','Jajka']],
  ['Pesto Genovese','cat-sosy','IT',['Bazylia','Orzeszki piniowe','Parmigiano','Pecorino','Czosnek','Oliwa']],
  ['Aioli','cat-sosy','FR',['Żółtko','Czosnek','Oliwa','Cytryna','Sól']],
  ['Aperol Spritz','cat-cocktaile','IT',['Prosecco','Aperol','Woda gazowana','Pomarańcza','Lód']],
  ['Negroni','cat-cocktaile','IT',['Gin','Campari','Wermut czerwony','Pomarańcza','Lód']],
  ['Whiskey Sour','cat-cocktaile','US',['Whiskey','Sok z cytryny','Syrop cukrowy','Białko jajka','Lód']],
  ['Margarita','cat-cocktaile','MX',['Tequila','Triple sec','Sok z limonki','Sól','Lód']]
];

const LIQUID = new Set(['Woda','Mleko','Wywar','Wino','Białe wino','Czerwone wino','Oliwa','Olej','Sos sojowy','Mirin','Mleko kokosowe','Piwo','Ocet słodowy','Sok z cytryny','Sok z limonki','Aperol','Prosecco','Wermut czerwony','Gin','Campari','Whiskey','Syrop cukrowy','Triple sec']);
const PIECE = new Set(['Jajka','Jajko','Żółtka','Tortilla','Tortille','Pita','Bułka','Pomarańcza','Awokado','Pomidor','Cebula','Czosnek','Cytryna','Limonka','Nori','Lód']);

function unitFor(name){ if(LIQUID.has(name))return 'ml'; if(PIECE.has(name))return 'szt.'; return 'g'; }
function amountFor(name,index){
  const u=unitFor(name);
  if(u==='ml')return name==='Woda'||name==='Wywar'?700+(index%5)*120:30+(index%5)*20;
  if(u==='szt.')return 1+(index%3);
  const base={'Mąka 00':500,'Mąka pszenna':500,'Mąka':400,'Pomidory':500,'Mozzarella':250,'Spaghetti':320,'Guanciale':140,'Parmigiano':60,'Pecorino Romano':60,'Ryż Carnaroli':320,'Wołowina':500,'Kurczak':500,'Łosoś':450,'Twaróg':500,'Serek śmietankowy':900,'Czekolada':200,'Mascarpone':500,'Śmietanka':500,'Ziemniaki':600}[name]||70;
  return Math.round(base*(1+(index%5)*0.05));
}
function cleanId(v){ return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function stepsFor(category,name){
  if(category==='cat-pizza')return [
    `Przygotuj mise en place do ${name}. Odważ składniki i przygotuj blat.`,
    'Połącz składniki, wyrób do uzyskania gładkiej, sprężystej struktury i kontroluj temperaturę ciasta.',
    'Odstaw pod przykryciem do fermentacji, następnie podziel na porcje i uformuj.',
    'Rozciągnij ręcznie, dodaj sos i dodatki. Wypiekaj w mocno nagrzanym piecu do intensywnego zrumienienia.'
  ];
  if(category==='cat-pieczywo')return [
    `Zważ składniki do ${name} i połącz je w jednolite ciasto.`,
    'Wyrabiaj do rozwinięcia glutenu, wykonując składania zależnie od siły mąki.',
    'Prowadź fermentację do wyraźnego napuszenia, następnie uformuj bochenek lub porcje.',
    'Wypiekaj z początkową parą lub wysoką temperaturą i studź na kratce.'
  ];
  if(category==='cat-pasta')return [
    `Przygotuj składniki i stanowisko do ${name}.`,
    'Ugotuj bazę lub przygotuj nadzienie. Makaron gotuj do al dente i zachowaj wodę z gotowania.',
    'Zbuduj sos na patelni, połącz z makaronem i emulguj niewielką ilością wody.',
    'Dopraw, wykończ serem lub ziołami i wydaj od razu.'
  ];
  if(category==='cat-sosy'||category==='cat-sosy-bazowe')return [
    `Przygotuj aromatyczną bazę sosu ${name}.`,
    'Dodawaj płyny etapami i prowadź redukcję do właściwego stężenia.',
    'Zmiksuj, przetrzyj albo zemulguj zależnie od tekstury docelowej.',
    'Dopraw na końcu, schłodź szybko albo utrzymuj w bezpiecznej temperaturze serwisu.'
  ];
  if(category==='cat-zupy')return [
    `Przygotuj mise en place do zupy ${name}.`,
    'Zeszklij aromaty, dodaj składniki wymagające najdłuższej obróbki i zalej płynem.',
    'Gotuj do uzyskania właściwej miękkości, klarowności lub kremowości.',
    'Dopraw na końcu i wykończ świeżym ziołem, olejem lub dodatkiem charakterystycznym dla dania.'
  ];
  if(category==='cat-desery')return [
    `Odważ składniki do ${name} i przygotuj formy.`,
    'Połącz składniki stopniowo, kontrolując temperaturę oraz napowietrzenie masy.',
    'Wypiecz, ugotuj lub schłodź zależnie od technologii, aż struktura będzie stabilna.',
    'Porcjuj po właściwym schłodzeniu i wykończ przed wydaniem.'
  ];
  if(category==='cat-cocktaile')return [
    `Schłodź szkło i przygotuj mise en place do ${name}.`,
    'Odmierz składniki. W zależności od receptury wymieszaj w szklanicy barmańskiej lub w shakerze.',
    'Przelej do odpowiedniego szkła z lodem lub bez, zachowując właściwe rozcieńczenie.',
    'Wykończ garnish i podawaj od razu.'
  ];
  return [
    `Przygotuj mise en place do ${name} i odważ składniki.`,
    'Rozpocznij obróbkę od elementów wymagających najwięcej czasu.',
    'Połącz składniki, doprowadź do właściwej tekstury i temperatury.',
    'Dopraw, odpocznij lub zredukuj zgodnie z charakterem dania, następnie porcjuj i wydaj.'
  ];
}
function tasteFor(category){
  if(category==='cat-desery')return 'słodki · kremowy';
  if(category==='cat-cocktaile')return 'świeży · zbalansowany';
  if(category==='cat-zupy')return 'aromatyczny · głęboki';
  if(category==='cat-salatki')return 'świeży · wyrazisty';
  if(category==='cat-pizza'||category==='cat-pieczywo')return 'chrupiący · aromatyczny';
  return 'umami · wyrazisty';
}

export function recipeLibrary(now=Date.now()){
  const out=[];let n=0;
  for(const [profile,profileCode] of PROFILES)for(const [name,category,origin,ingredientNames] of DISHES){
    n++;
    const slug=cleanId(name)+'-'+cleanId(profile)+'-'+String(n).padStart(4,'0');
    const ingredients=ingredientNames.map((ing,i)=>({id:`lib50_ing_${String(n).padStart(4,'0')}_${i+1}_${cleanId(ing)}`,name:ing,amount:amountFor(ing,n+i),unit:unitFor(ing),percent:null,flour:/mąk/i.test(ing)}));
    const isPizza=category==='cat-pizza',isBread=category==='cat-pieczywo',isCocktail=category==='cat-cocktaile';
    out.push({
      id:`rcp_lib50_${slug}`,schema:1,name:`${name} • ${profile}`,category,
      description:`Wariant biblioteczny ${name} z profilem ${profile}. Baza do dostrojenia pod własny serwis i food cost.`,
      photo:'',thumb:'',servings:isCocktail?1:4,yieldAmount:null,yieldUnit:'g',
      prepTime:isCocktail?5:10+(n%5)*5,cookTime:isCocktail?0:category==='cat-zupy'?35:category==='cat-pieczywo'?25:15+(n%7)*5,
      fermentTime:isPizza||isBread?1440:0,temperature:isPizza?'450–485 °C':isBread?'220–240 °C':category==='cat-desery'?'160–180 °C':'',bakers:isPizza||isBread,
      sections:[{id:`lib50_sec_${n}`,name:'RECEPTURA',ingredients}],steps:stepsFor(category,name).map((text,i)=>({id:`lib50_stp_${n}_${i+1}`,text})),
      notes:'Biblioteka startowa Etapu 50. Wariant biblioteczny oznacza profil inspiracyjny, nie deklarację regionalnej autentyczności.',
      tags:[cleanId(name),'biblioteka','etap-50',profile,profileCode,origin],favorite:false,favoritedAt:0,
      source:'Kucharek — biblioteka wariantów',sourceUrl:'',traditional:false,origin,salePrice:null,
      createdAt:now,updatedAt:now,lastOpenedAt:0,openCount:0,rating:4.4+((n*7)%6)/10,calories:180+((n*137)%520),tasteNote:tasteFor(category)
    });
  }
  return out;
}
