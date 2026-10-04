/* Offline Polish culinary translation layer. Source fields stay intact. */
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
const EXTRA = [
["with","z"],["without","bez"],["into","do"],["from","z"],["under","pod"],["through","przez"],["between","między"],["near","w pobliżu"],
["head","główka"],["heads","główki"],["pan","patelnia"],["skillet","patelnia"],["pot","garnek"],["bowl","miska"],["plate","talerz"],["dish","naczynie"],
["oven","piekarnik"],["stove","kuchenka"],["heat","ogień"],["liquid","płyn"],["scum","szumowiny"],["meat","mięso"],["stuffing","farsz"],["filling","nadzienie"],
["sauce","sos"],["dough","ciasto"],["batter","ciasto"],["tray","blacha"],["lid","pokrywka"],["cover","przykrycie"],["surface","powierzchnia"],
["shred","poszatkuj"],["shredded","poszatkowany"],["press","wyciśnij"],["squeeze","wyciśnij"],["prepare","przygotuj"],["prepared","przygotowany"],["select","wybierz"],
["clean","oczyść"],["cleaned","oczyszczony"],["dry","osusz"],["dried","suszony"],["tie","zwiąż"],["tied","związany"],["sew","zszyj"],["sewn","zszyty"],
["fasten","przymocuj"],["layer","układaj warstwami"],["repeat","powtórz"],["repeating","powtarzając"],["prevent","zapobiegaj"],["appears","pojawia się"],["appear","pojawić się"],
["collect","zbierz"],["continue","kontynuuj"],["remaining","pozostały"],["nearly","prawie"],["separately","osobno"],["usually","zwykle"],["customary","zgodnie z tradycją"],
["available","dostępny"],["desired","pożądany"],["ready","gotowy"],["done","gotowy"],["until done","aż będzie gotowe"],
["shaking","potrząsając"],["shake","potrząśnij"],["rounds","plastry"],["round","plaster"],["whole","cały"],["part","część"],["parts","części"],
["boiling","wrzący"],["boil","gotuj"],["salted","osolony"],["firmly","mocno"],["briefly","krótko"],["immediately","natychmiast"],["constantly","stale"],
["smooth","gładki"],["mass","masa"],["amount","ilość"],["plenty","dużo"],["some","trochę"],["enough","wystarczająco"],["properly","właściwie"],
["half","pół"],["quarter","ćwierć"],["third","jedna trzecia"],["fourth","jedna czwarta"],
["cup of","szklanka"],["cups of","szklanki"],["tablespoon of","łyżka"],["tablespoons of","łyżki"],["teaspoon of","łyżeczka"],["teaspoons of","łyżeczki"],
["pound of","funt"],["pounds of","funty"],["head of","główka"],["heads of","główki"],
["and then","a następnie"],["and immediately","i natychmiast"],["and add","i dodaj"],["then add","następnie dodaj"],["then mix","następnie wymieszaj"],
["add to","dodaj do"],["mix with","wymieszaj z"],["cook with","gotuj z"],["serve with","podawaj z"],["cover with","przykryj"],["pour with","polej"],
];
const MORE = [
["walnut-sized","wielkości orzecha włoskiego"],["walnuts","orzechy włoskie"],["walnut","orzech włoski"],["almonds","migdały"],["almond","migdał"],
["hazelnuts","orzechy laskowe"],["hazelnut","orzech laskowy"],["cashews","nerkowce"],["cashew","orzech nerkowca"],["pecans","orzechy pekan"],["pecan","orzech pekan"],
["raisins","rodzynki"],["raisin","rodzynka"],["currants","porzeczki"],["currant","porzeczka"],["dates","daktyle"],["date","daktyl"],
["blanched","sparzony"],["shelled","obrany ze skorupek"],["unsalted","niesolony"],["salted","solony"],["sour","kwaśny"],["sweet","słodki"],
["bitter","gorzki"],["spicy","pikantny"],["young","młody"],["old","stary"],["white","biały"],["black","czarny"],["red","czerwony"],["green","zielony"],
["cold","zimny"],["hot","gorący"],["warm","ciepły"],["fine","drobny"],["finely","drobno"],["coarse","gruby"],["roughly","grubo"],["thin","cienki"],
["thick","gruby"],["freshly","świeżo"],["previously","wcześniej"],["preferably","najlepiej"],["optional","opcjonalnie"],["optionally","opcjonalnie"],
["instead","zamiast"],["instead of","zamiast"],["according","według"],["following","następujący"],["various","różne"],["other","pozostałe"],["remaining","pozostałe"],
["meat","mięso"],["meats","mięsa"],["soup","zupa"],["juice","sok"],["extract","ekstrakt"],["powder","proszek"],["baking powder","proszek do pieczenia"],
["wheat","pszenica"],["rye","żyto"],["barley","jęczmień"],["oat","owies"],["oats","płatki owsiane"],["corn","kukurydza"],["cornmeal","mąka kukurydziana"],
["bread","chleb"],["roll","bułka"],["loaf","bochenek"],["slices","plastry"],["slice","plaster"],["piece","kawałek"],["pieces","kawałki"],
["skin","skórka"],["skins","skórki"],["seeds","nasiona"],["seed","nasiono"],["leaves","liście"],["leaf","liść"],["stalk","łodyga"],
["shoulder","łopatka"],["leg","udziec"],["legs","nogi"],["breast","pierś"],["thigh","udo"],["wing","skrzydło"],["wings","skrzydła"],["neck","szyja"],
["head","głowa"],["tail","ogon"],["bone","kość"],["bones","kości"],["shell","skorupka"],["skinless","bez skóry"],
["grind","zmiel"],["ground","zmielony"],["grinding","mielenie"],["pounded","utłuczony"],["pound","utłucz"],["crushed","rozgnieciony"],["crush","rozgnieć"],
["sift","przesiej"],["sifted","przesiany"],["sifting","przesiewanie"],["strain","przecedź"],["strained","przecedzony"],
["sieve","sito"],["dressed","przybrany"],["toasted","opiekany"],["toast","opiecz"],["browned","zrumieniony"],["brown","zrumień"],
["melt","roztop"],["melts","topi się"],["melted","roztopiony"],["boiled","ugotowany"],["boiling","wrzący"],["drained","odcedzony"],["covered","przykryty"],
["placed","umieszczony"],["arrange","ułóż"],["arranged","ułożony"],["fill","napełnij"],["filled","wypełniony"],["wrap","zawiń"],["wrapped","zawinięty"],
["seal","zlep"],["sealed","zlepiony"],["stretch","rozciągnij"],["stretched","rozciągnięty"],["take","weź"],["taken","wzięty"],["make","zrób"],
["made","zrobiony"],["use","użyj"],["used","użyty"],["replace","zastąp"],["replaced","zastąpiony"],["cover","przykryj"],["covered","przykryty"],
["should","powinien"],["can","można"],["may","może"],["must","musi"],["will","będzie"],["would","byłoby"],["could","można by"],
["but","ale"],["if","jeśli"],["there","tam"],["there are","są"],["they","one"],["them","je"],["their","ich"],["which","który"],["that","który"],
["were","były"],["was","był"],["being","będąc"],["be","być"],["been","był"],["not","nie"],["no","nie"],["yes","tak"],
["about","około"],["approximately","około"],["almost","prawie"],["more","więcej"],["longer","dłużej"],["again","ponownie"],["well","dobrze"],
["together","razem"],["along","wraz"],["over","nad"],["on top","na wierzchu"],["bottom","dno"],["top","wierzch"],["center","środek"],
["first","najpierw"],["second","drugi"],["third","trzeci"],["next","następnie"],["finally","na koniec"],["immediately","natychmiast"],
["rest","odpocznij"],["let rest","odstaw"],["let sit","odstaw"],["allow","pozostaw"],["until completely","aż całkowicie"],
["inch","cal"],["inches","cale"],["quart","kwarta"],["quarts","kwarty"],["pint","pinta"],["pints","pinty"],["gallon","galon"],["gallons","galony"],
["glass","szklanka"],["glasses","szklanki"],["handful","garść"],["spoonful","łyżka"],["pinch","szczypta"],["half","pół"],["quarter","ćwierć"],
["one","jeden"],["two","dwa"],["three","trzy"],["four","cztery"],["five","pięć"],["six","sześć"],["seven","siedem"],["eight","osiem"],["nine","dziewięć"],["ten","dziesięć"],
["twenty","dwadzieścia"],["thirty","trzydzieści"],["forty","czterdzieści"],["hundred","sto"],
["perfectly","dokładnie"],["sufficiently","wystarczająco"],["lightly","lekko"],["firmly","mocno"],["strongly","energicznie"],
["deep","głęboki"],["deeply","głęboko"],["straight","prosty"],["even","równy"],["entire","cały"],["whole","cały"],
["fire","ogień"],["heat","ogień"],["flame","płomień"],["grill","grill"],["iron","żeliwo"],["pan","patelnia"],["pot","garnek"],["bowl","miska"],
["dish","naczynie"],["vessel","naczynie"],["mold","forma"],["platter","półmisek"],["sieve","sito"],
["catsup","ketchup"],["ketchup","ketchup"],["brandy","brandy"],["prosciutto","prosciutto"],
["bacon","boczek"],["sausage","kiełbasa"],["sausages","kiełbasy"],["herring","śledź"],["pheasant","bażant"],["capon","kapłon"],
["rutabaga","brukiew"],["beefsteak","befsztyk"],["steak","stek"],["garnish","dodatek"],["garnished","przybrany"],["mayonnaise","majonez"],
];
const NAME_MAP = [
["Baking Powder Babka","Babka z proszkiem do pieczenia"],["Economy Babka","Babka oszczędna"],["Home Cake","Ciasto domowe"],["Brown Bread","Chleb brunatny"],
["Whole Wheat Bread","Chleb pełnoziarnisty"],["Brown chleb","Chleb brunatny"],["Herring Cake","Babka ze śledzi"],["Beefsteak","Befsztyk"],
["German-style Steak","Befsztyk po niemiecku"],["French Pancakes","Bliny francuskie"],["Buckwheat Pancakes","Bliny gryczane"],["Cornmeal Pancakes","Bliny kukurydziane"],
["Pancakes","Naleśniki"],["Date Sandwiches","Butersznyty z daktyli"],["Nut Sandwiches","Butersznyty z orzechów"],["Sandwiches","Butersznyty"],
["Fruit Cake","Ciasto owocowe"],["Exquisite Cake","Ciasto wykwintne"],["Yellow Cake","Ciasto żółte"],["Pound Cake","Ciasto funtowe"],
["Stewed Rutabaga","Brukiew duszona"],["Italian kapusta Pudding","Budyń z włoskiej kapusty"],["Boston baked beans","Fasola po bostońsku"],
["Polish zimny Soup","Chłodnik polski"],["White Fish Mayonnaise","Biały majonez z ryb"],["Pure Beet Soup","Barszcz czysty"],
["Podolian Beet Soup","Barszcz podolski"],["Volyn Beet Soup","Barszcz wołyński"],["Rye Beet Soup with Beet Greens","Barszcz żytni z botwiną"],
["Beet Soup with Sour Cream","Barszcz ze śmietaną"],["Stuffed jagnięcina","Baranina faszerowana"],["Fried Lamb","Baranina smażona"],
["Mazovian \"Capon\"","Kapłon mazurski"],["Boston pieczony fasola","Fasola po bostońsku"],["ryż Pancakes","Bliny z ryżu"],
["Bananas with Orange Juice","Banany z pomarańczowym sokiem"],["Steak with Bananas","Befsztyk z bananami"],["Rye burak Soup","Barszcz żytni"],
["Baking Powder","proszek do pieczenia"],["English Muffins","muffiny angielskie"],["Muffins","muffiny"],["Bread","Chleb"],["Cake","Ciasto"],
];

// --- Expanded culinary vocabulary discovered in the full 1700-recipe audit ---
const AUDIT_EXTRA = [
["almonds","migdały"],["almond","migdał"],["walnuts","orzechy włoskie"],["walnut","orzech włoski"],
["hazelnuts","orzechy laskowe"],["hazelnut","orzech laskowy"],["pecans","orzechy pekan"],["pecan","orzech pekan"],
["cashews","nerkowce"],["cashew","nerkowiec"],["pistachios","pistacje"],["pistachio","pistacja"],["peanuts","orzeszki ziemne"],["peanut","orzeszek ziemny"],
["raisins","rodzynki"],["raisin","rodzynek"],["currants","porzeczki"],["currant","porzeczka"],["dates","daktyle"],["date","daktyl"],
["figs","figi"],["fig","figa"],["prunes","suszone śliwki"],["prune","suszona śliwka"],["chestnuts","kasztany"],["chestnut","kasztan"],
["shoulder","łopatka"],["leg","udziec"],["loin","schab"],["shank","golonka"],["rack","comber"],["neck","kark"],["liver","wątróbka"],
["kidney","nerka"],["heart","serce"],["tongue","język"],["marrow","szpik"],["skin","skóra"],["rind","skórka"],["peel","skórka"],
["zest","skórka"],["juice","sok"],["pulp","miąższ"],["seeds","nasiona"],["seed","nasiono"],["leaves","liście"],["leaf","liść"],
["sprig","gałązka"],["sprigs","gałązki"],["stalk","łodyga"],["stalks","łodygi"],["head","główka"],["heads","główki"],["clove","ząbek"],
["cloves","ząbki"],["strip","pasek"],["strips","paski"],["needle","igła"],["larding needle","igła do szpikowania"],
["entirely","całkowicie"],["halfway","w połowie"],["cooking","gotowania"],["cook","gotuj"],["using","używając"],["used","użyty"],
["through","przez"],["spit","rożen"],["spits","rożny"],["delicate","delikatny"],["delicately","delikatnie"],["lard","smalec"],
["seasoned","doprawiony"],["seasoning","przyprawianie"],["pieces","kawałki"],["piece","kawałek"],["squares","kwadraty"],["square","kwadrat"],
["rounds","plastry"],["round","plaster"],["sheets","arkusze"],["sheet","arkusz"],["forms","formy"],["form","forma"],
["mixture","masa"],["paste","pasta"],["sauce","sos"],["sauces","sosy"],["pan","patelnia"],["pot","garnek"],["bowl","miska"],
["platter","półmisek"],["dish","naczynie"],["sieve","sito"],["strainer","cedzak"],["skillet","patelnia"],["roaster","brytfanna"],
["oven","piekarnik"],["heat","ogień"],["fire","ogień"],["flame","płomień"],["bottom","dno"],["top","wierzch"],["side","bok"],
["center","środek"],["middle","środek"],["inside","wewnątrz"],["outside","na zewnątrz"],["back","tył"],["front","przód"],
["your","twój"],["you","ty"],["them","je"],["they","one"],["their","ich"],["there","tam"],["here","tutaj"],["not","nie"],
["are","są"],["is","jest"],["be","być"],["can","można"],["will","będzie"],["have","mieć"],["has","ma"],["make","zrób"],
["made","przygotowany"],["take","weź"],["let","pozwól"],["allow","pozwól"],["pass","przepuść"],["out","na zewnątrz"],
["back","z powrotem"],["same","taki sam"],["together","razem"],["another","kolejny"],["yourself","samodzielnie"],["own","własny"],
["good","dobry"],["fine","drobny"],["coarse","gruby"],["white","biały"],["black","czarny"],["red","czerwony"],["green","zielony"],
["yellow","żółty"],["brown","brązowy"],["sweet","słodki"],["sour","kwaśny"],["bitter","gorzkawy"],["dry","suchy"],["moist","wilgotny"],
["powdered","w proszku"],["granulated","granulowany"],["crushed","rozgnieciony"],["whole","cały"],["halved","przekrojony na pół"],
["quartered","pokrojony na ćwiartki"],["lengthwise","wzdłuż"],["crosswise","poprzecznie"],["finely","drobno"],["roughly","grubo"],
["thinly","cienko"],["thickly","grubo"],["equally","równie"],["immediately","natychmiast"],["directly","bezpośrednio"],
["finally","na koniec"],["first","najpierw"],["last","na końcu"],["next","następnie"],["again","ponownie"],["already","już"],
["before","przed"],["after","po"],["during","podczas"],["while","podczas"],["throughout","przez cały czas"],["each","każdy"],
["either","albo"],["neither","żaden"],["both","oba"],["only","tylko"],["just","tylko"],["quite","dość"],["rather","raczej"],
["very","bardzo"],["too","zbyt"],["more","więcej"],["less","mniej"],["most","większość"],["little","mało"],["much","dużo"],
["enough","wystarczająco"],["about","około"],["approximately","około"],["inch","cal"],["inches","cale"],["gram","gram"],["grams","gramów"],
["liter","litr"],["liters","litrów"],["quart","kwarta"],["quarts","kwarty"],["glass","szklanka"],["glasses","szklanki"],
["spoon","łyżka"],["spoons","łyżki"],["pinch","szczypta"],["pinches","szczypty"],["handful","garść"],["handfuls","garście"],
["boiling","wrzący"],["boiled","ugotowany"],["baking","pieczenie"],["roasting","pieczenie"],["fried","smażony"],["frying","smażenie"],
["braising","duszenie"],["simmering","duszenie"],["steaming","gotowanie na parze"],["blended","zmiksowany"],["strained","przecedzony"],
["drained","odcedzony"],["soaked","namoczony"],["marinated","marynowany"],["cooled","schłodzony"],["heated","podgrzany"],
["boil","gotuj"],["boiling point","punkt wrzenia"],["preheat","rozgrzej"],["preheated","rozgrzany"],["baste","polewaj"],["basted","polany"],
["skewer","szpikulec"],["skewers","szpikulce"],["tie","zwiąż"],["tied","związany"],["sew","zszyj"],["sewn","zszyty"],
["fold","złóż"],["folded","złożony"],["wrap","owinąć"],["wrapped","owinięty"],["fasten","przymocuj"],["fastened","przymocowany"],
["fill","napełnij"],["filled","napełniony"],["stuff","nadziewaj"],["stuffed","nadziewany"],["melt","roztop"],["melted","roztopiony"],
["dissolve","rozpuść"],["dissolved","rozpuszczony"],["combine","połącz"],["combined","połączony"],["incorporate","wmieszaj"],["incorporated","wmieszany"],
["spread","rozsmaruj"],["spread out","rozłóż"],["layer","warstwa"],["layered","ułożony warstwami"],["arrange","ułóż"],["arranged","ułożony"],
["turn","obróć"],["turned","obrócony"],["flip","odwróć"],["flipped","odwrócony"],["transfer","przełóż"],["transferred","przełożony"],
["reserve","zachowaj"],["reserved","zachowany"],["save","zachowaj"],["saved","zachowany"],["discard","wyrzuć"],["discarded","wyrzucony"],
["scoop","nabierz"],["scooped","nabrany"],["press","dociśnij"],["pressed","dociśnięty"],["squeeze","wyciśnij"],["squeezed","wyciśnięty"],
["strain","przecedź"],["drain","odcedź"],["rinse","opłucz"],["wash","umyj"],["clean","oczyść"],["cleaned","oczyszczony"],
["trim","przytnij"],["trimmed","przycięty"],["remove","usuń"],["removed","usunięty"],["discard","wyrzuć"],["peel","obierz"],
["quarter","ćwiartka"],["half","połowa"],["third","jedna trzecia"],["quarterly","ćwiartkami"],
["meat","mięso"],["meats","mięsa"],["vegetable","warzywo"],["vegetables","warzywa"],["fruit","owoc"],["fruits","owoce"],
["soup","zupa"],["stew","gulasz"],["salad","sałatka"],["cake","ciasto"],["pie","placek"],["tart","tarta"],["pudding","pudding"],
["bread","chleb"],["crumb","okruch"],["crumbs","okruchy"],["dough","ciasto"],["batter","ciasto"],["filling","nadzienie"],
["stuffing","farsz"],["broth","bulion"],["stock","wywar"],["gravy","sos pieczeniowy"],["juice","sok"],["water","woda"],
["milk","mleko"],["cream","śmietanka"],["cheese","ser"],["egg","jajko"],["eggs","jajka"],["yolk","żółtko"],["yolks","żółtka"],
["white","biały"],["whites","białka"],["sugar","cukier"],["honey","miód"],["syrup","syrop"],["salt","sól"],["pepper","pieprz"],
["almonds","migdały"],["sesame","sezam"],["coconut","kokos"],["chocolate","czekolada"],["cocoa","kakao"],
["Agnello","baranina"],["agnello","baranina"],["all'Orientale","po orientalnemu"],["Orientale","orientalny"],
["Acciughe","anchois"],["acciughe","anchois"],["alla Marinara","po marynarsku"],["alla marinaio","po marynarsku"],
["alla","po"],["all'","po "],["coda","ogon"],["coda di","ogon "],["con","z"],["senza","bez"],["al","w stylu"],["del","z"],
["della","z"],["degli","z"],["delle","z"],["e","i"],["il",""],["lo",""],["la",""],["gli",""],["le",""],
["Französische Art","po francusku"],["französische Art","po francusku"],["französisch","francusku"],["Aal","węgorz"],["aal","węgorz"],
["Lamm","jagnięcina"],["Schwein","wieprzowina"],["Rind","wołowina"],["Huhn","kurczak"],["Kartoffel","ziemniak"],
["España","Hiszpania"],["Española","hiszpański"],["frances","francuski"],["française","francuski"],["italiana","włoski"],["italiano","włoski"],
["Deutsch","niemiecki"],["Tschechisch","czeski"],["Český","czeski"],
];
const C = {"Kuchnia Polska":"Kuchnia polska","Cucina Italiana":"Kuchnia włoska","Cocina Española":"Kuchnia hiszpańska","Cuisine Française":"Kuchnia francuska","Japanese Kitchen":"Kuchnia japońska","Chinese Kitchen":"Kuchnia chińska","Indian Kitchen":"Kuchnia indyjska","German Kitchen":"Kuchnia niemiecka","Česká kuchyně":"Kuchnia czeska"};

const ALL_TERMS = [...P, ...OTHER, ...EXTRA, ...MORE].sort((a,b)=>b[0].length-a[0].length);
const escapeRegex = (s) => String(s).replace(/[.*+?^$(){}|[\\]\\]/g, "\\$&");
const TOKEN_RE = new RegExp("(?<!\\p{L})(" + ALL_TERMS.map(([a])=>escapeRegex(a)).join("|") + ")(?!\\p{L})","giu");
const TERM_MAP = new Map(ALL_TERMS.map(([a,b])=>[a.toLowerCase(),b]));
const TEXT_CACHE = new Map();

function apply(text) {
  const key=String(text ?? "");
  const cached=TEXT_CACHE.get(key);
  if(cached!==undefined) return cached;
  let out=key;
  out=out.replace(TOKEN_RE,(_,term)=>TERM_MAP.get(term.toLowerCase()) ?? term);
  out=out.replace(/\b(?:the|a|an)\b\s*/giu,"")
    .replace(/\s{2,}/g," ")
    .replace(/\s+([,.;:!?])/g,"$1")
    .trim();
  if(TEXT_CACHE.size>16000) TEXT_CACHE.clear();
  TEXT_CACHE.set(key,out);
  return out;
}

function cleanRecipeName(text) {
  let n=String(text ?? "").replace(/^["“”]+|["“”]+$/g,"").trim();
  const colon=n.indexOf(":");
  if(colon>0) n=n.slice(0,colon).trim();
  const paren=n.indexOf("(");
  if(paren>0) n=n.slice(0,paren).trim();
  for(const [a,b] of NAME_MAP) n=n.replace(new RegExp(escapeRegex(a),"giu"),b);
  n=apply(n).replace(/\\s*[-–—]\\s*$/,"").replace(/\\s{2,}/g," ").trim();
  return n;
}

export function translateRecipe(recipe) {
  const original=recipe.originalName||recipe.name||"";
  const sections=Array.isArray(recipe.sections)
    ? recipe.sections.map(s=>({...s,ingredients:Array.isArray(s.ingredients)?s.ingredients.map(i=>({...i,name:apply(i.name)})):s.ingredients}))
    : recipe.sections;
  const steps=Array.isArray(recipe.steps)
    ? recipe.steps.map(s=>({...s,text:apply(s.text)}))
    : recipe.steps;
  return {
    ...recipe,
    originalName:original,
    name:cleanRecipeName(recipe.name||original),
    description:apply(recipe.description||""),
    sections,
    steps,
    archiveCollectionName:C[recipe.archiveCollectionName]||recipe.archiveCollectionName,
    translationLanguage:"pl",
    translationVersion:4
  };
}
