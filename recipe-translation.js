/* Offline Polish translation layer for archive recipe text. */
const P = [
["Polish Hunter's Stew","polski gulasz myśliwski"],["Meat Pierogi","pierogi z mięsem"],["Belarusian Beet Soup","barszcz białoruski"],["Frog Legs","żabie udka"],
["English Apple Charlotte","angielska szarlotka z jabłek"],["English Muffins","muffiny angielskie"],["Noodle Squares with Cabbage","łazanki z kapustą"],
["Tomato Soup","zupa pomidorowa"],["Chicken Soup","rosół z kurczaka"],["Beef Stew","gulasz wołowy"],["Apple Pie","szarlotka"],["Chocolate Cake","ciasto czekoladowe"],
["Cheese Cake","sernik"],["Carrot Cake","ciasto marchewkowe"],["Potato Pancakes","placki ziemniaczane"],["Stuffed Cabbage","gołąbki"],
["Mashed Potatoes","puree ziemniaczane"],["Potato Salad","sałatka ziemniaczana"],["Cucumber Salad","mizeria"],
["bring to a boil","doprowadź do wrzenia"],["remove from heat","zdejmij z ognia"],["set aside","odstaw na bok"],["let cool","ostudź"],
["until golden brown","na złoty kolor"],["until tender","do miękkości"],["to taste","do smaku"],["if desired","według uznania"],
["at room temperature","w temperaturze pokojowej"],["over low heat","na małym ogniu"],["over medium heat","na średnim ogniu"],
["in a pan","na patelni"],["in the oven","w piekarniku"],["in the refrigerator","w lodówce"],["in the fridge","w lodówce"],
["cover and cook","przykryj i gotuj"],["cover and simmer","przykryj i duś"],["stir frequently","często mieszaj"],["stir occasionally","mieszaj od czasu do czasu"],
["mix well","dokładnie wymieszaj"],["mix thoroughly","dokładnie wymieszaj"],["season with","dopraw"],["serve with","podawaj z"],
["serve hot","podawaj na gorąco"],["serve cold","podawaj na zimno"],["brush with","posmaruj"],["sprinkle with","posyp"],
["drizzle with","skrop"],["pour over","polej"],["pour into","wlej do"],["cut into cubes","pokrój w kostkę"],["cut into slices","pokrój w plastry"],
["finely chopped","drobno posiekany"],["finely minced","drobno posiekany"],["finely grated","drobno starty"],["thinly sliced","pokrojony w cienkie plastry"],
["peeled and chopped","obrany i posiekany"],["melted butter","roztopione masło"],["beaten egg","roztrzepane jajko"],["grated cheese","starty ser"],
["bread crumbs","bułka tarta"],["breadcrumbs","bułka tarta"],["a small amount of","niewielka ilość"],["a little","odrobina"],["a pinch of","szczypta"],
["a few","kilka"],["several","kilka"],["for half an hour","przez pół godziny"],["for an hour","przez godzinę"],["for two hours","przez 2 godziny"],
["for three hours","przez 3 godziny"],["overnight","przez noc"],
["tablespoons","łyżki"],["tablespoon","łyżka"],["teaspoons","łyżeczki"],["teaspoon","łyżeczka"],["cups","szklanki"],["cup","szklanka"],
["pounds","funty"],["pound","funt"],["ounces","uncje"],["ounce","uncja"],["minutes","minut"],["hours","godzin"],["hour","godzinę"],
["water","woda"],["butter","masło"],["olive oil","oliwa z oliwek"],["oil","olej"],["flour","mąka"],["sugar","cukier"],["salt","sól"],["pepper","pieprz"],
["onions","cebula"],["onion","cebula"],["garlic","czosnek"],["cabbage","kapusta"],["sauerkraut","kapusta kiszona"],["carrots","marchew"],["carrot","marchew"],
["celery stalks","łodygi selera"],["celery stalk","łodyga selera"],["celery","seler"],["apples","jabłka"],["apple","jabłko"],["lemon zest","skórka z cytryny"],["lemon","cytryna"],
["tomatoes","pomidory"],["tomato","pomidor"],["potatoes","ziemniaki"],["potato","ziemniak"],["mushrooms","grzyby"],["mushroom","grzyb"],["cream","śmietanka"],
["sour cream","śmietana"],["milk","mleko"],["yogurt","jogurt"],["cheese","ser"],["parmesan","parmezan"],["mozzarella","mozzarella"],["egg yolks","żółtka"],["egg yolk","żółtko"],["eggs","jajka"],["egg","jajko"],
["bread","chleb"],["stock","wywar"],["broth","bulion"],["bouillon","bulion"],["bacon","boczek"],["ham","szynka"],["sausage","kiełbasa"],
["beef bones","kości wołowe"],["beef","wołowina"],["pork","wieprzowina"],["chicken breast","pierś z kurczaka"],["chicken thighs","uda z kurczaka"],["chicken","kurczak"],
["duck","kaczka"],["turkey","indyk"],["lamb","jagnięcina"],["veal","cielęcina"],["fish","ryba"],["salmon","łosoś"],["cod","dorsz"],["tuna","tuńczyk"],
["shrimp","krewetka"],["prawns","krewetki"],["mussels","omułki"],["squid","kałamarnica"],["octopus","ośmiornica"],["anchovy","anchois"],
["rice","ryż"],["noodles","makaron"],["noodle","makaron"],["pasta","makaron"],["beans","fasola"],["bean","fasola"],["peas","groszek"],["pea","groszek"],
["chickpeas","ciecierzyca"],["chickpea","ciecierzyca"],["lentils","soczewica"],["lentil","soczewica"],["spinach","szpinak"],["lettuce","sałata"],["cucumbers","ogórki"],["cucumber","ogórek"],
["zucchini","cukinia"],["eggplant","bakłażan"],["aubergine","bakłażan"],["pumpkin","dynia"],["beets","buraki"],["beetroot","burak"],["beet","burak"],
["asparagus","szparagi"],["artichoke","karczoch"],["fennel","koper włoski"],["leek","por"],["parsley","natka pietruszki"],["dill","koperek"],["basil","bazylia"],
["oregano","oregano"],["thyme","tymianek"],["rosemary","rozmaryn"],["sage","szałwia"],["mint","mięta"],["coriander","kolendra"],["cilantro","kolendra"],
["cumin","kmin rzymski"],["paprika","papryka"],["chili","chili"],["cinnamon","cynamon"],["nutmeg","gałka muszkatołowa"],["clove","goździk"],["cardamom","kardamon"],
["vanilla","wanilia"],["cocoa","kakao"],["chocolate","czekolada"],["honey","miód"],["mustard","musztarda"],["soy sauce","sos sojowy"],["sesame","sezam"],["coconut","kokos"],
["pineapple","ananas"],["strawberry","truskawka"],["raspberry","malina"],["peach","brzoskwinia"],["plum","śliwka"],["pear","gruszka"],["orange","pomarańcza"],["banana","banan"],
["lard","smalec"],["fat","tłuszcz"],["wine","wino"],["vinegar","ocet"],["bay leaves","liście laurowe"],["bay leaf","liść laurowy"],["peppercorns","ziarna pieprzu"],
["chopped","posiekany"],["chop","posiekaj"],["sliced","pokrojony w plastry"],["slice","pokrój w plastry"],["diced","pokrojony w kostkę"],["dice","pokrój w kostkę"],
["grated","starty"],["grate","zetrzyj"],["peeled","obrany"],["peel","obierz"],["beaten","roztrzepany"],["beat","ubij"],["melted","roztopiony"],["melt","roztop"],
["fresh","świeży"],["dried","suszony"],["ground","mielony"],["whole","cały"],["raw","surowy"],["cooked","ugotowany"],
["cook","gotuj"],["bake","piecz"],["baked","pieczony"],["roast","piecz"],["roasted","pieczony"],["fry","smaż"],["fried","smażony"],["braise","duś"],["braised","duszony"],
["simmer","duś"],["steamed","gotowany na parze"],["steam","gotuj na parze"],["stir","mieszaj"],["mix","wymieszaj"],["add","dodaj"],["added","dodany"],
["place","umieść"],["put","włóż"],["pour","wlej"],["cover","przykryj"],["remove","usuń"],["season","dopraw"],["serve","podawaj"],["roll out","rozwałkuj"],
["knead","wyrób"],["fold","złóż"],["brush","posmaruj"],["sprinkle","posyp"],["blend","zmiksuj"],["strain","przecedź"],["drain","odcedź"],["rinse","opłucz"],
["soak","namocz"],["marinate","marynuj"],["refrigerate","schłodź w lodówce"],["chill","schłodź"],["cool","ostudź"],["dissolve","rozpuść"],["reduce","odparuj"],["thicken","zagęść"],
["before","przed"],["after","po"],["then","następnie"],["next","następnie"],["when","gdy"],["until","aż"],["always","zawsze"],["often","często"],["frequently","często"],
["occasionally","od czasu do czasu"],["carefully","ostrożnie"],["slowly","powoli"],["quickly","szybko"],["gently","delikatnie"],["thoroughly","dokładnie"],["small","mały"],["large","duży"],["medium","średni"],
["warm","ciepły"],["hot","gorący"],["cold","zimny"],["soft","miękki"],["tender","delikatny"],["crispy","chrupiący"],["smooth","gładki"],["thick","gęsty"],["thin","cienki"],
["some","trochę"],["enough","wystarczająco"],["more","więcej"],["less","mniej"],["another","kolejny"],["other","pozostały"],["everything","wszystko"],["without","bez"],["into","do"],["from","z"],["under","pod"],["through","przez"],["between","między"],["and","i"],["or","lub"],
];
const OTHER = [
["cipolla","cebula"],["cipolle","cebula"],["aglio","czosnek"],["olio","olej"],["burro","masło"],["farina","mąka"],["zucchero","cukier"],["sale","sól"],["pepe","pieprz"],["pomodoro","pomidor"],["pomodori","pomidory"],["panna","śmietanka"],["latte","mleko"],["uovo","jajko"],["uova","jajka"],["formaggio","ser"],["carne","mięso"],["manzo","wołowina"],["maiale","wieprzowina"],["pollo","kurczak"],["pesce","ryba"],["acqua","woda"],["vino","wino"],["limone","cytryna"],["prezzemolo","natka pietruszki"],["basilico","bazylia"],["rosmarino","rozmaryn"],["zucchina","cukinia"],["patata","ziemniak"],["patate","ziemniaki"],["funghi","grzyby"],["riso","ryż"],["aggiungere","dodać"],["aggiungi","dodaj"],["mescolare","mieszać"],["mescola","wymieszaj"],["cuocere","gotować"],["cuoci","gotuj"],["friggere","smażyć"],["infornare","piecz"],["bollire","gotować"],["servire","podawać"],["tagliare","pokroić"],["tritare","posiekać"],
["cebolla","cebula"],["ajo","czosnek"],["aceite","olej"],["mantequilla","masło"],["harina","mąka"],["azúcar","cukier"],["sal","sól"],["pimienta","pieprz"],["tomate","pomidor"],["nata","śmietanka"],["queso","ser"],["pollo","kurczak"],["ternera","wołowina"],["cerdo","wieprzowina"],["pescado","ryba"],["agua","woda"],["vino","wino"],["limón","cytryna"],["perejil","natka pietruszki"],["albahaca","bazylia"],["romero","rozmaryn"],["orégano","oregano"],["berenjena","bakłażan"],["calabacín","cukinia"],["patata","ziemniak"],["patatas","ziemniaki"],["arroz","ryż"],["añadir","dodać"],["añade","dodaj"],["mezclar","mieszać"],["mezcla","wymieszaj"],["cocinar","gotować"],["cocina","gotuj"],["freír","smażyć"],["hornear","piecz"],["hervir","gotować"],["servir","podawać"],
["oignon","cebula"],["oignons","cebula"],["ail","czosnek"],["huile","olej"],["beurre","masło"],["farine","mąka"],["sucre","cukier"],["sel","sól"],["poivre","pieprz"],["tomate","pomidor"],["crème","śmietanka"],["lait","mleko"],["œuf","jajko"],["œufs","jajka"],["fromage","ser"],["boeuf","wołowina"],["bœuf","wołowina"],["porc","wieprzowina"],["poulet","kurczak"],["poisson","ryba"],["eau","woda"],["vin","wino"],["citron","cytryna"],["persil","natka pietruszki"],["basilic","bazylia"],["romarin","rozmaryn"],["thym","tymianek"],["aubergine","bakłażan"],["courgette","cukinia"],["riz","ryż"],["pâtes","makaron"],["ajouter","dodać"],["ajoutez","dodaj"],["mélanger","mieszać"],["mélangez","wymieszaj"],["cuire","gotować"],["frire","smażyć"],["rôtir","piecz"],["bouillir","gotować"],["servir","podawać"],["couper","pokroić"],["hacher","posiekać"],
["zwiebel","cebula"],["zwiebeln","cebula"],["knoblauch","czosnek"],["öl","olej"],["olivenöl","oliwa z oliwek"],["butter","masło"],["mehl","mąka"],["zucker","cukier"],["salz","sól"],["pfeffer","pieprz"],["tomate","pomidor"],["sahne","śmietanka"],["milch","mleko"],["eier","jajka"],["ei","jajko"],["käse","ser"],["rindfleisch","wołowina"],["schweinefleisch","wieprzowina"],["hähnchen","kurczak"],["huhn","kurczak"],["fisch","ryba"],["wasser","woda"],["wein","wino"],["zitrone","cytryna"],["petersilie","natka pietruszki"],["basilikum","bazylia"],["rosmarin","rozmaryn"],["kartoffel","ziemniak"],["kartoffeln","ziemniaki"],["pilze","grzyby"],["reis","ryż"],["nudeln","makaron"],["mischen","mieszać"],["kochen","gotować"],["braten","smażyć"],["backen","piec"],["servieren","podawać"],["schneiden","pokroić"],["gehackt","posiekany"],["gerieben","starty"],["geschält","obrany"],
["cibule","cebula"],["česnek","czosnek"],["máslo","masło"],["mouka","mąka"],["cukr","cukier"],["sůl","sól"],["pepř","pieprz"],["rajče","pomidor"],["rajčata","pomidory"],["smetana","śmietanka"],["mléko","mleko"],["vejce","jajko"],["sýr","ser"],["hovězí","wołowina"],["vepřové","wieprzowina"],["kuře","kurczak"],["ryba","ryba"],["voda","woda"],["víno","wino"],["citron","cytryna"],["petržel","natka pietruszki"],["bazalka","bazylia"],["brambory","ziemniaki"],["houby","grzyby"],["rýže","ryż"],["těstoviny","makaron"],["vařit","gotować"],["míchat","mieszać"],["smažit","smażyć"],["péct","piec"],["přidat","dodać"],["podávat","podawać"],
];
const C = {"Kuchnia Polska":"Kuchnia polska","Cucina Italiana":"Kuchnia włoska","Cocina Española":"Kuchnia hiszpańska","Cuisine Française":"Kuchnia francuska","Japanese Kitchen":"Kuchnia japońska","Chinese Kitchen":"Kuchnia chińska","Indian Kitchen":"Kuchnia indyjska","German Kitchen":"Kuchnia niemiecka","Česká kuchyně":"Kuchnia czeska"};
const rx = s => new RegExp("(?<!\\p{L})"+String(s).replace(/[.*+?^$(){}|[\\]\\\\]/g,"\\\\$&")+"(?!\\p{L})","giu");
const apply = (text, list) => {
  let out=String(text??"");
  for(const [a,b] of [...list].sort((x,y)=>y[0].length-x[0].length)) out=out.replace(rx(a),b);
  return out.replace(/\\s{2,}/g," ").replace(/\\s+([,.;:!?])/g,"$1").trim();
};
export function translateRecipe(recipe){
  const original=recipe.originalName||recipe.name||"";
  const sections=Array.isArray(recipe.sections)?recipe.sections.map(s=>({...s,ingredients:Array.isArray(s.ingredients)?s.ingredients.map(i=>({...i,name:apply(i.name,[...P,...OTHER])})):s.ingredients})):recipe.sections;
  const steps=Array.isArray(recipe.steps)?recipe.steps.map(s=>({...s,text:apply(s.text,[...P,...OTHER])})):recipe.steps;
  let name=String(recipe.name||original);
  for(const [a,b] of P) name=name.replace(new RegExp(String(a).replace(/[.*+?^$(){}|[\\]\\\\]/g,"\\\\$&"),"giu"),b);
  return {...recipe,originalName:original,name:apply(name,OTHER),description:apply(recipe.description||"",[...P,...OTHER]),sections,steps,archiveCollectionName:C[recipe.archiveCollectionName]||recipe.archiveCollectionName,translationLanguage:"pl",translationVersion:1};
}
