export const Pokedex: {[k: string]: ModdedSpeciesData} = {
	kabutoancient: {
		num: 2001,
		name: "Kabuto-Ancient",
		types: ["Water", "Fairy"],
		baseStats: {hp: 55, atk: 70, def: 110, spa: 80, spd: 85, spe: 20},
		abilities: {0: "Swift Swim", 1: "Battle Armor", H: "Marvel Scale"},
		evos: ["Kabutops-Ancient"],
	},
	kabutopsancient: {
		num: 2002,
		name: "Kabutops-Ancient",
		types: ["Water", "Fairy"],
		baseStats: {hp: 85, atk: 115, def: 95, spa: 80, spd: 75, spe: 85},
		abilities: {0: "Swift Swim", 1: "Battle Armor", H: "Poison Heal"},
		prevo: "Kabuto-Ancient",
	},
	omanyteancient: {
		num: 2003,
		name: "Omanyte-Ancient",
		types: ["Water"],
		baseStats: {hp: 45, atk: 80, def: 70, spa: 30, spd: 40, spe: 50},
		abilities: {0: "Swift Swim", H: "Torrent"},
		evos: ["Omastar-Ancient"],
	},
	omastarancient: {
		num: 2004,
		name: "Omastar-Ancient",
		types: ["Water", "Poison"],
		baseStats: {hp: 65, atk: 105, def: 105, spa: 55, spd: 85, spe: 80},
		abilities: {0: "Swift Swim", 1: "Shell Armor", H: "Bloodsuck"},
		prevo: "Omanyte-Ancient",
	},
	aerodactylancient: {
		num: 2005,
		name: "Aerodactyl-Ancient",
		types: ["Rock", "Flying"],
		baseStats: {hp: 80, atk: 95, def: 70, spa: 60, spd: 80, spe: 130},
		abilities: {0: "Sheer Force", 1: "Pressure", H: "Rough Skin"},
	},
	anorithancient: {
		num: 2006,
		name: "Anorith-Ancient",
		types: ["Bug"],
		baseStats: {hp: 60, atk: 100, def: 50, spa: 40, spd: 50, spe: 50},
		abilities: {0: "Swift Swim", 1: "Battle Armor", H: "Weak Armor"},
		evos: ["Armaldo-Ancient"],
	},
	armaldoancient: {
		num: 2007,
		name: "Armaldo-Ancient",
		types: ["Bug", "Fighting"],
		baseStats: {hp: 80, atk: 125, def: 100, spa: 70, spd: 80, spe: 75},
		abilities: {0: "Swift Swim", 1: "Battle Armor", H: "Carboniferous"},
		prevo: "Anorith-Ancient",
	},
	lileepancient: {
		num: 2008,
		name: "Lileep-Ancient",
		types: ["Grass"],
		baseStats: {hp: 66, atk: 41, def: 77, spa: 61, spd: 87, spe: 23},
		abilities: {0: "Suction Cups", H: "Storm Drain"},
		evos: ["Cradily-Ancient"],
	},
	cradilyancient: {
		num: 2009,
		name: "Cradily-Ancient",
		types: ["Grass", "Ground"],
		baseStats: {hp: 95, atk: 100, def: 100, spa: 80, spd: 90, spe: 60},
		abilities: {0: "Regenerator", H: "Water Absorb"},
		prevo: "Lileep-Ancient",
	},
	torkoalpottery: {
		num: 2010,
		name: "Torkoal-Pottery",
		types: ["Fire", "Ground"],
		baseStats: {hp: 70, atk: 65, def: 140, spa: 95, spd: 70, spe: 30},
		abilities: {0: "White Smoke", 1: "Water Compaction", H: "Oblivious"},
	},
	relicanthscorched: {
		num: 2011,
		name: "Relicanth-Scorched",
		types: ["Fire", "Rock"],
		baseStats: {hp: 85, atk: 40, def: 80, spa: 110, spd: 70, spe: 100},
		abilities: {0: "Water Bubble", H: "Rock Head"},
	},
	swinubancient: {
		num: 2012,
		name: "Swinub-Ancient",
		types: ["Ice"],
		baseStats: {hp: 50, atk: 30, def: 40, spa: 30, spd: 50, spe: 50},
		abilities: {0: "Oblivious", 1: "Snow Cloak", H: "Adaptability"},
		evos: ["Piloswine-Ancient"],
	},
	piloswineancient: {
		num: 2013,
		name: "Piloswine-Ancient",
		types: ["Ice", "Poison"],
		baseStats: {hp: 100, atk: 80, def: 80, spa: 60, spd: 80, spe: 50},
		abilities: {0: "Oblivious", 1: "Poison Touch", H: "Oozing Tar"},
		prevo: "Swinub-Ancient",
		evos: ["Mamoswine-Ancient"],
	},
	mamoswineancient: {
		num: 2014,
		name: "Mamoswine-Ancient",
		types: ["Ice", "Poison"],
		baseStats: {hp: 110, atk: 110, def: 80, spa: 70, spd: 80, spe: 80},
		abilities: {0: "Oblivious", 1: "Poison Touch", H: "Oozing Tar"},
		prevo: "Piloswine-Ancient",
	},
	dodrumb: {
		num: 2015,
		name: "Dodrumb",
		types: ["Normal", "Psychic"],
		baseStats: {hp: 94, atk: 74, def: 104, spa: 94, spd: 64, spe: 64},
		abilities: {0: "Unaware", 1: "Own Tempo", H: "Simple"},
	},
	blossobite: {
		num: 2016,
		name: "Blossobite",
		types: ["Grass", "Electric"],
		baseStats: {hp: 81, atk: 125, def: 100, spa: 70, spd: 70, spe: 81},
		abilities: {0: "Chlorophyll", 1: "Lightning Rod", H: "Underbrush Tactics"},
	},
	ghoulipinch: {
		num: 2017,
		name: "Ghoulipinch",
		types: ["Water", "Ghost"],
		baseStats: {hp: 50, atk: 40, def: 80, spa: 35, spd: 55, spe: 70},
		abilities: {0: "Corrosive Pincers", 1: "Cursed Body", H: "Swift Swim"},
		evos: ["Ghoulpion"],
	},
	ghoulpion: {
		num: 2018,
		name: "Ghoulpion",
		types: ["Water", "Ghost"],
		baseStats: {hp: 70, atk: 90, def: 110, spa: 65, spd: 85, spe: 80},
		abilities: {0: "Corrosive Pincers", 1: "Cursed Body", H: "Swift Swim"},
		prevo: "Ghoulipinch",
	},
	cranidoscretaceous: {
		num: 2019,
		name: "Cranidos-Cretaceous",
		types: ["Rock", "Normal"],
		baseStats: {hp: 77, atk: 95, def: 43, spa: 34, spd: 42, spe: 55},
		abilities: {0: "Rock Head", H: "Mold Breaker"},
		evos: ["Rampardos-Cretaceous"],
	},
	rampardoscretaceous: {
		num: 2020,
		name: "Rampardos-Cretaceous",
		types: ["Rock", "Normal"],
		baseStats: {hp: 107, atk: 125, def: 83, spa: 74, spd: 73, spe: 78},
		abilities: {0: "Rock Head", H: "Mold Breaker"},
		prevo: "Cranidos-Cretaceous",
	},
	shieldonancient: {
		num: 2021,
		name: "Shieldon-Ancient",
		types: ["Grass", "Steel"],
		baseStats: {hp: 56, atk: 46, def: 77, spa: 67, spd: 97, spe: 30},
		abilities: {0: "Grassy Surge"},
		evos: ["Bastiodon-Ancient"],
	},
	bastiodonancient: {
		num: 2022,
		name: "Bastiodon-Ancient",
		types: ["Grass", "Steel"],
		baseStats: {hp: 80, atk: 75, def: 101, spa: 111, spd: 116, spe: 20},
		abilities: {0: "Grass Pelt"},
		prevo: "Shieldon-Ancient",
	},
	tirtougaleatherback: {
		num: 2023,
		name: "Tirtouga-Leatherback",
		types: ["Ground", "Dark"],
		baseStats: {hp: 54, atk: 78, def: 103, spa: 53, spd: 45, spe: 22},
		abilities: {0: "Dry Skin", 1: "Sturdy", H: "Sand Rush"},
		evos: ["Carracosta-Leatherback"],
	},
	carracostaleatherback: {
		num: 2024,
		name: "Carracosta-Leatherback",
		types: ["Ground", "Dark"],
		baseStats: {hp: 74, atk: 108, def: 133, spa: 83, spd: 80, spe: 32},
		abilities: {0: "Dry Skin", 1: "Sturdy", H: "Sand Rush"},
		prevo: "Tirtouga-Leatherback",
	},
	archenancient: {
		num: 2025,
		name: "Archen-Ancient",
		types: ["Fairy", "Flying"],
		baseStats: {hp: 60, atk: 60, def: 70, spa: 68, spd: 65, spe: 90},
		abilities: {0: "Natural Cure"},
		evos: ["Archeops-Ancient"],
	},
	archeopsancient: {
		num: 2026,
		name: "Archeops-Ancient",
		types: ["Fairy", "Flying"],
		baseStats: {hp: 85, atk: 75, def: 96, spa: 85, spd: 90, spe: 140},
		abilities: {0: "Regenerator"},
		prevo: "Archen-Ancient",
	},
	tyruntapex: {
		num: 2027,
		name: "Tyrunt-Apex",
		types: ["Steel", "Dragon"],
		baseStats: {hp: 58, atk: 89, def: 75, spa: 50, spd: 45, spe: 50},
		abilities: {0: "Anger Point", H: "Iron Barbs"},
		evos: ["Tyrantrum-Apex"],
	},
	tyrantrumapex: {
		num: 2028,
		name: "Tyrantrum-Apex",
		types: ["Steel", "Dragon"],
		baseStats: {hp: 82, atk: 121, def: 110, spa: 74, spd: 65, spe: 74},
		abilities: {0: "Strong Jaw", H: "Iron Barbs"},
		prevo: "Tyrunt-Apex",
	},
	amauraregnant: {
		num: 2029,
		name: "Amaura-Regnant",
		types: ["Ice"],
		baseStats: {hp: 70, atk: 37, def: 45, spa: 70, spd: 67, spe: 58},
		abilities: {0: "Snow Warning", H: "Refrigerate"},
		evos: ["Aurorus-Regnant"],
	},
	aurorusregnant: {
		num: 2030,
		name: "Aurorus-Regnant",
		types: ["Ice", "Fairy"],
		baseStats: {hp: 90, atk: 77, def: 85, spa: 109, spd: 90, spe: 88},
		abilities: {0: "Snow Warning", H: "Refrigerate"},
		prevo: "Amaura-Regnant",
	},
	shellosentity: {
		num: 2031,
		name: "Shellos-Entity",
		types: ["Poison"],
		baseStats: {hp: 70, atk: 50, def: 60, spa: 50, spd: 60, spe: 40},
		abilities: {0: "Gooey", H: "Poison Point"},
		evos: ["Gastrodon-Entity-West", "Gastrodon-Entity-East"],
	},
	gastrodonwestentity: {
		num: 2032,
		name: "Gastrodon-West-Entity",
		types: ["Poison", "Dragon"],
		baseStats: {hp: 120, atk: 55, def: 90, spa: 110, spd: 50, spe: 50},
		abilities: {0: "Gooey", H: "Neuroforce"},
		prevo: "Shellos-Entity",
	},
	gastrodoneastentity: {
		num: 2033,
		name: "Gastrodon-East-Entity",
		types: ["Poison", "Psychic"],
		baseStats: {hp: 100, atk: 55, def: 90, spa: 100, spd: 80, spe: 50},
		abilities: {0: "Gooey", H: "Psychic Surge"},
		prevo: "Shellos-Entity",
	},
	yanmaancient: {
		num: 2034,
		name: "Yanma-Ancient",
		types: ["Bug", "Dragon"],
		baseStats: {hp: 60, atk: 80, def: 55, spa: 80, spd: 55, spe: 60},
		abilities: {0: "Compound Eyes", H: "Chaser"},
		evos: ["Yanmega-Ancient"],
	},
	yanmegaancient: {
		num: 2035,
		name: "Yanmega-Ancient",
		types: ["Bug", "Dragon"],
		baseStats: {hp: 85, atk: 110, def: 70, spa: 90, spd: 70, spe: 90},
		abilities: {0: "Strong Jaw", H: "Chaser"},
		prevo: "Yanma-Ancient",
	},
	tangelaancient: {
		num: 2036,
		name: "Tangela-Ancient",
		types: ["Grass", "Fire"],
		baseStats: {hp: 65, atk: 55, def: 40, spa: 100, spd: 115, spe: 60},
		abilities: {0: "Mold Breaker", 1: "Grass Pelt", H: "Absorption"},
		evos: ["Tangrowth-Ancient"],
	},
	tangrowthancient: {
		num: 2037,
		name: "Tangrowth-Ancient",
		types: ["Grass", "Fire"],
		baseStats: {hp: 100, atk: 105, def: 75, spa: 90, spd: 115, spe: 50},
		abilities: {0: "Mold Breaker", 1: "Grass Pelt", H: "Absorption"},
		prevo: "Tangela-Ancient",
	},
	liluǒ: {
		num: 2038,
		name: "Liluǒ",
		types: ["Fire"],
		baseStats: {hp: 60, atk: 72, def: 40, spa: 67, spd: 57, spe: 55},
		abilities: {0: "Lightning Rod"},
		evos: ["Flaruǒ"],
	},
	flaruǒ: {
		num: 2039,
		name: "Flaruǒ",
		types: ["Fire"],
		baseStats: {hp: 80, atk: 86, def: 65, spa: 76, spd: 69, spe: 75},
		abilities: {0: "Lightning Rod"},
		prevo: "Liluǒ",
		evos: ["Alohwo"],
	},
	alohwo: {
		num: 2040,
		name: "Alohwo",
		types: ["Fire"],
		baseStats: {hp: 111, atk: 92, def: 70, spa: 80, spd: 79, spe: 95},
		abilities: {0: "Thunderstruck"},
		prevo: "Flaruǒ",
	},
	wonkway: {
		num: 2041,
		name: "Wonkway",
		types: ["Psychic", "Dark"],
		baseStats: {hp: 73, atk: 59, def: 47, spa: 83, spd: 61, spe: 97},
		abilities: {0: "Beast Boost"},
		evos: ["Illusinogen"],
	},
	illusinogen: {
		num: 2042,
		name: "Illusinogen",
		types: ["Psychic", "Dark"],
		baseStats: {hp: 97, atk: 73, def: 67, spa: 101, spd: 89, spe: 113},
		abilities: {0: "Beast Boost"},
		prevo: "Wonkway",
	},
	robusteel: {
		num: 2043,
		name: "Robusteel",
		types: ["Steel", "Flying"],
		baseStats: {hp: 75, atk: 67, def: 94, spa: 110, spd: 95, spe: 70},
		abilities: {0: "Mirror Armor", H: "Flare Boost"},
	},
	velovolt: {
		num: 2044,
		name: "Velovolt",
		types: ["Electric", "Fairy"],
		baseStats: {hp: 90, atk: 90, def: 70, spa: 80, spd: 90, spe: 105},
		abilities: {0: "Volt Absorb", H: "Static"},
	},
	vishcaca: {
		num: 2045,
		name: "Vishcaca",
		types: ["Water"],
		baseStats: {hp: 85, atk: 110, def: 112, spa: 58, spd: 74, spe: 76},
		abilities: {0: "Strong Jaw", 1: "Fanglock", H: "Water Absorb"},
	},
	dracosaur: {
		num: 2046,
		name: "Dracosaur",
		types: ["Dragon", "Ground"],
		baseStats: {hp: 90, atk: 90, def: 90, spa: 100, spd: 80, spe: 75},
		abilities: {0: "Hustle", H: "Sand Rush"},
	},
	gorlifross: {
		num: 2047,
		name: "Gorlifross",
		types: ["Ice", "Flying"],
		baseStats: {hp: 65, atk: 60, def: 55, spa: 80, spd: 50, spe: 45},
		abilities: {0: "Slush Rush", 1: "Frigid Landing", H: "Snow Warning"},
		evos: ["Artachoris"],
	},
	arctachoris: {
		num: 2048,
		name: "Arctachoris",
		types: ["Ice", "Flying"],
		baseStats: {hp: 90, atk: 110, def: 80, spa: 115, spd: 75, spe: 65},
		abilities: {0: "Slush Rush", 1: "Frigid Landing", H: "Snow Warning"},
		prevo: "Gorlifross",
	},
	dreepyluminous: {
		num: 2049,
		name: "Dreepy-Luminous",
		types: ["Poison"],
		baseStats: {hp: 28, atk: 60, def: 30, spa: 40, spd: 30, spe: 82},
		abilities: {0: "Clear Body", 1: "Illuminate", H: "Dazzling"},
		evos: ["Drakloak-Luminous"],
	},
	drakloakluminous: {
		num: 2050,
		name: "Drakloak-Luminous",
		types: ["Poison"],
		baseStats: {hp: 89, atk: 60, def: 65, spa: 70, spd: 85, spe: 71},
		abilities: {0: "Clear Body", 1: "Illuminate", H: "Dazzling"},
		prevo: "Dreepy-Luminous",
		evos: ["Dragapult-Luminous"],
	},
	dragapultluminous: {
		num: 2051,
		name: "Dragapult-Luminous",
		types: ["Electric", "Poison"],
		baseStats: {hp: 109, atk: 90, def: 75, spa: 100, spd: 105, spe: 121},
		abilities: {0: "Clear Body", 1: "Illuminate", H: "Dazzling"},
		prevo: "Drakloak-Luminous",
	},
	larvitarnature: {
		num: 2052,
		name: "Larvitar-Nature",
		types: ["Grass"],
		baseStats: {hp: 60, atk: 70, def: 45, spa: 35, spd: 45, spe: 45},
		abilities: {0: "Natural Cure", H: "Tough Claws"},
		evos: ["Pupitar-Nature"],
	},
	pupitarnature: {
		num: 2053,
		name: "Pupitar-Nature",
		types: ["Grass"],
		baseStats: {hp: 85, atk: 50, def: 90, spa: 60, spd: 85, spe: 45},
		abilities: {0: "Natural Cure", H: "Flower Veil"},
		prevo: "Larvitar-Nature",
		evos: ["Tyranitar-Nature"],
	},
	tyranitarnature: {
		num: 2054,
		name: "Tyranitar-Nature",
		types: ["Grass"],
		baseStats: {hp: 110, atk: 100, def: 90, spa: 100, spd: 110, spe: 90},
		abilities: {0: "Natural Cure", H: "Nature Prowess"},
		prevo: "Pupitar-Nature",
	},
	giblepersistent: {
		num: 2055,
		species: "Gible-Persistent",
		baseSpecies: "Gible",
		forme: "Persistent",
		types: ["Ground", "Ghost"],
		baseStats: {hp: 55, atk: 53, def: 49, spa: 55, spd: 55, spe: 33},
		abilities: {0: "Persistence", H: "Dragons Maw"},
		evos: ["Gabite-Persistent"],
	},
	gabitepersistent: {
		num: 2056,
		name: "Gabite-Persistent",
		types: ["Ground", "Ghost"],
		baseStats: {hp: 65, atk: 83, def: 59, spa: 75, spd: 75, spe: 53},
		abilities: {0: "Persistence", H: "Dragons Maw"},
		prevo: "Gible-Persistent",
		evos: ["Garchomp-Persistent"],
	},
	garchomppersistent: {
		num: 2057,
		name: "Garchomp-Persistent",
		types: ["Ground", "Ghost"],
		baseStats: {hp: 95, atk: 113, def: 89, spa: 115, spd: 115, spe: 73},
		abilities: {0: "Persistence", H: "Dragons Maw"},
		prevo: "Gabite-Persistent",
	},
	scorcharnia: {
		num: 2058,
		name: "Scorcharnia",
		baseForme: "Average",
		types: ["Water", "Fire"],
		baseStats: {hp: 90, atk: 114, def: 85, spa: 70, spd: 80, spe: 76},
		abilities: { 0: "Flame Body", H: "Regenerator" },
		otherFormes: ["Scorcharnia-Short", "Scorcharnia-Long"],
		formeOrder: ["Scorcharnia", "Scorcharnia-Short", "Scorcharnia-Long"],
	},
	scorcharniashort: {
		num: 2058,
		name: "Scorcharnia-Short",
		baseSpecies: "Scorcharnia",
		forme: "Short",
		types: ["Water", "Fire"],
		baseStats: { hp: 75, atk: 94, def: 85, spa: 85, spd: 70, spe: 106 },
		abilities: { 0: "Flame Body", H: "Regenerator" },
	},
	scorcharnialong: {
		num: 2058,
		name: "Scorcharnia-Long",
		baseSpecies: "Scorcharnia",
		forme: "Long",
		types: ["Water", "Fire"],
		baseStats: { hp: 105, atk: 134, def: 85, spa: 55, spd: 90, spe: 46 },
		abilities: { 0: "Flame Body", H: "Regenerator" },
	},
	listoxina: {
		num: 2059,
		name: "Listoxina",
		types: ["Water", "Poison"],
		baseStats: {hp: 120, atk: 60, def: 75, spa: 80, spd: 90, spe: 85},
		abilities: {0: "Sticky Hold", H: "Swift Swim"},
	},
	spinollina: {
		num: 2060,
		name: "Spinollina",
		types: ["Ground", "Electric"],
		baseStats: {hp: 106, atk: 79, def: 75, spa: 90, spd: 82, spe: 60},
		abilities: { 0: "Water Absorb", H: "Rough Skin" },
		otherFormes: ["Spinollina-Mega"],
		formeOrder: ["Spinollina", "Spinollina-Mega"], 
	},
	spinollinamega: {
		num: 2060,
		name: "Spinollina-Mega",
		baseSpecies: "Spinollina",
		forme: "Mega",
		types: ["Ground", "Electric"],
		baseStats: { hp: 106, atk: 119, def: 75, spa: 90, spd: 82, spe: 120 },
		abilities: { 0: "Thunder Thighs" },
		requiredItem: "Spinollite",
	},
	plusleprimal: {
		num: 2061,
		name: "Plusle-Primal",
		types: ["Electric", "Ghost"],
		baseStats: {hp: 60, atk: 60, def: 70, spa: 105, spd: 105, spe: 105},
		abilities: { 0: "Shadow Shield" },
		requiredItem: "Spectral Orb",
	},
	minunprimal: {
		num: 2062,
		name: "Minun-Primal",
		types: ["Electric", "Steel"],
		baseStats: {hp: 60, atk: 65, def: 80, spa: 75, spd: 130, spe: 95},
		abilities: { 0: "Huge Power" },
		requiredItem: "Blue Orb",
	},
	swalotprimal: {
		num: 2063,
		name: "Swalot-Primal",
		types: ["Poison", "Fire"],
		baseStats: {hp: 100, atk: 73, def: 83, spa: 113, spd: 83, spe: 115},
		abilities: { 0: "Storm Drain" },
		requiredItem: "Petrol Orb",
	},
	hariyamaprimal: {
		num: 2064,
		name: "Hariyama-Primal",
		types: ["Fighting", "Fairy"],
		baseStats: {hp: 144, atk: 140, def: 80, spa: 40, spd: 100, spe: 70},
		abilities: { 0: "Misty Surge" },
		requiredItem: "Crystal Orb",
	},
	grumpigprimal: {
		num: 2065,
		name: "Grumpig-Primal",
		types: ["Psychic", "Steel"],
		baseStats: {hp: 80, atk: 60, def: 90, spa: 130, spd: 125, spe: 85},
		abilities: { 0: "Magic Surge" },
		requiredItem: "Black Orb",
	},
	trapinch: {
		inherit: true,
		num: 2066,
		species: "Trapinch",
		types: ["Ground"],
		baseStats: {hp: 45, atk: 100, def: 45, spa: 45, spd: 45, spe: 10},
		abilities: {0: "Hyper Cutter", 1: "Arena Trap", H: "Sheer Force"},
		evos: ["Vibrava-Classical"],
	},
	vibravaclassical: {
		num: 2067,
		name: "Vibrava-Classical",
		types: ["Ground", "Fighting"],
		baseStats: {hp: 50, atk: 60, def: 50, spa: 60, spd: 50, spe: 70},
		abilities: {0: "Levitate", H: "Vibrato"},
		prevo: "Trapinch",
		evos: ["Flygon-Classical"],
	},
	flygonclassical: {
		num: 2068,
		name: "Flygon-Classical",
		types: ["Ground", "Fighting"],
		baseStats: {hp: 80, atk: 90, def: 80, spa: 90, spd: 80, spe: 100},
		abilities: {0: "Levitate", H: "Vibrato"},
		prevo: "Vibrava-Classical",
	},
	sphealancient: {
		num: 2069,
		name: "Spheal-Ancient",
		types: ["Ice"],
		baseStats: {hp: 70, atk: 40, def: 50, spa: 55, spd: 50, spe: 25},
		abilities: {0: "Thick Fat", 1: "Ice Body", H: "Oblivious"},
		evos: ["Sealeo-Ancient"],
	},
	sealeoancient: {
		num: 2070,
		name: "Sealeo-Ancient",
		types: ["Ice", "Fighting"],
		baseStats: {hp: 90, atk: 75, def: 60, spa: 70, spd: 70, spe: 45},
		abilities: {0: "Fur Coat", 1: "Ice Body", H: "Oblivious"},
		prevo: "Spheal-Ancient",
		evos: ["Walrein-Ancient"],
	},
	walreinancient: {
		num: 2071,
		name: "Walrein-Ancient",
		types: ["Ice", "Fighting"],
		baseStats: {hp: 90, atk: 110, def: 65, spa: 90, spd: 95, spe: 80},
		abilities: {0: "Fur Coat", 1: "Ice Body", H: "Oblivious"},
		prevo: "Sealeo-Ancient",
	},
	whismurancient: {
		num: 2072,
		name: "Whismur-Ancient",
		types: ["Rock"],
		baseStats: {hp: 64, atk: 41, def: 33, spa: 46, spd: 23, spe: 33},
		abilities: {0: "Vital Spirit", H: "Soundproof"},
		evos: ["Loudred-Ancient"],
	},
	loudredancient: {
		num: 2073,
		name: "Loudred-Ancient",
		types: ["Rock"],
		baseStats: {hp: 84, atk: 61, def: 53, spa: 66, spd: 33, spe: 63},
		abilities: {0: "Vital Spirit", H: "Soundproof"},
		prevo: "Whismur-Ancient",
		evos: ["Exploud-Ancient"],
	},
	exploudancient: {
		num: 2074,
		name: "Exploud-Ancient",
		types: ["Rock", "Electric"],
		baseStats: {hp: 104, atk: 81, def: 73, spa: 86, spd: 53, spe: 93},
		abilities: {0: "Vital Spirit", H: "Punk Rock"},
		prevo: "Loudred-Ancient",
	},
	anklarmor: {
		num: 2075,
		name: "Anklarmor",
		types: ["Steel"],
		baseStats: {hp: 79, atk: 65, def: 102, spa: 90, spd: 111, spe: 46},
		abilities: {0: "Filter", 1: "Justified", H: "Overcoat"},
	},
	drakabyssal: {
		num: 2076,
		name: "Drakabyssal",
		types: ["Water", "Dark"],
		baseStats: {hp: 100, atk: 100, def: 85, spa: 65, spd: 105, spe: 65},
		abilities: {0: "Mold Breaker", H: "Guts"},
	},
	trobsidon: {
		num: 2077,
		name: "Trobsidon",
		types: ["Dragon", "Rock"],
		baseStats: {hp: 80, atk: 115, def: 80, spa: 65, spd: 70, spe: 115},
		abilities: { 0: "Keen Eye", 1: "Merciless", H: "Technician" },
		otherFormes: ["Trobsidon-Mega"],
		formeOrder: ["Trobsidon", "Trobsidon-Mega"], 
	},
	trobsidonmega: {
		num: 2077,
		name: "Trobsidon-Mega",
		baseSpecies: "Trobsidon",
		forme: "Mega",
		types: ["Dragon", "Rock"],
		baseStats: { hp: 80, atk: 115, def: 80, spa: 130, spd: 100, spe: 120 },
		abilities: { 0: "Solid Rock" },
		requiredItem: "Trobsidonite",
	},
	dhelmiseancient: {
		num: 2078,
		name: "Dhelmise-Ancient",
		types: ["Ghost", "Poison"],
		baseStats: {hp: 70, atk: 131, def: 100, spa: 76, spd: 90, spe: 50},
		abilities: {0: "Boneyard"},
	},
	honedgeancient: {
		num: 2079,
		name: "Honedge-Ancient",
		types: ["Grass", "Ghost"],
		baseStats: {hp: 50, atk: 80, def: 85, spa: 35, spd: 37, spe: 38},
		abilities: {0: "Long Reach"},
		evos: ["Doublade-Ancient"],
	},
	doubladeancient: {
		num: 2080,
		name: "Doublade-Ancient",
		types: ["Grass", "Ghost"],
		baseStats: {hp: 69, atk: 100, def: 90, spa: 45, spd: 49, spe: 95},
		abilities: {0: "Long Reach"},
		prevo: "Honedge-Ancient",
		evos: ["Aegislash-Ancient"],
	},
	aegislashancient: {
		num: 2081,
		name: "Aegislash-Ancient",
		baseForme: "Gatherer",
		types: ["Grass", "Ghost"],
		baseStats: {hp: 70, atk: 50, def: 110, spa: 50, spd: 110, spe: 110},
		abilities: {0: "Tactics Change"},
		prevo: "Doublade-Ancient",
		otherFormes: ["Aegislash-Ancient-Blade"],
		formeOrder: ["Aegislash-Ancient", "Aegislash-Ancient-Blade"],
	},
	aegislashancienthunter: {
		num: 2081,
		name: "Aegislash-Ancient-Hunter",
		baseSpecies: "Aegislash-Ancient",
		forme: "Hunter",
		types: ["Grass", "Ghost"],
		baseStats: { hp: 70, atk: 110, def: 50, spa: 110, spd: 50, spe: 110 },
		abilities: { 0: "Tactics Change" },
		prevo: "Doublade-Ancient",
		requiredAbility: "Tactics Change",
		battleOnly: "Aegislash-Ancient",
	},
	baltoypremade: {
		num: 2082,
		name: "Baltoy-Premade",
		types: ["Rock", "Psychic"],
		baseStats: {hp: 40, atk: 45, def: 35, spa: 70, spd: 40, spe: 70},
		abilities: {0: "Levitate"},
		evos: ["Claydol-Premade"],
	},
	claydolpremade: {
		num: 2083,
		name: "Claydol-Premade",
		types: ["Rock", "Psychic"],
		baseStats: {hp: 60, atk: 90, def: 70, spa: 120, spd: 65, spe: 95},
		abilities: {0: "Solid Rock", 1: "Trace", H: "Unaware"},
		prevo: "Baltoy-Premade",
	},
	parasancient: {
		num: 2084,
		name: "Paras-Ancient",
		types: ["Bug", "Fighting"],
		baseStats: {hp: 35, atk: 70, def: 55, spa: 45, spd: 55, spe: 25},
		abilities: {0: "Vital Spirit", 1: "Dry Skin", H: "Magic Bounce"},
		evos: ["Parasect-Ancient"],
	},
	parasectancient: {
		num: 2085,
		name: "Parasect-Ancient",
		types: ["Bug", "Fighting"],
		baseStats: {hp: 60, atk: 80, def: 95, spa: 60, spd: 80, spe: 30},
		abilities: {0: "Vital Spirit", 1: "Dry Skin", H: "Magic Bounce"},
		prevo: "Para",
		evos: ["Parasinensis"],
	},
	parasinensis: {
		num: 2086,
		name: "Parasinensis",
		types: ["Bug", "Fighting"],
		baseStats: {hp: 70, atk: 100, def: 125, spa: 80, spd: 90, spe: 10},
		abilities: {0: "Vital Spirit", 1: "Dry Skin", H: "Magic Bounce"},
		prevo: "Parasect-Ancient",
	},
	girafarigancient: {
		num: 2087,
		name: "Girafarig-Ancient",
		types: ["Normal", "Ground"],
		baseStats: {hp: 70, atk: 90, def: 75, spa: 70, spd: 75, spe: 75},
		abilities: {0: "Oblivious", 1: "Early Bird", H: "Sap Sipper"},
		evos: ["Oligosogilo"],
	},
	oligosogilo: {
		num: 2088,
		name: "Oligosogilo",
		types: ["Normal", "Ground"],
		baseStats: {hp: 100, atk: 120, def: 90, spa: 75, spd: 85, spe: 65},
		abilities: {0: "Oblivious", 1: "Early Bird", H: "Sap Sipper"},
		prevo: "Girafarig-Ancient",
	},
	poochyenaancient: {
		num: 2089,
		name: "Poochyena-Ancient",
		types: ["Dark", "Fairy"],
		baseStats: {hp: 35, atk: 55, def: 35, spa: 30, spd: 30, spe: 35},
		abilities: {0: "Run Away", 1: "Quick Feet", H: "Rattled"},
		evos: ["Mightyena-Ancient"],
	},
	mightyenaancient: {
		num: 2090,
		name: "Mightyena-Ancient",
		types: ["Dark", "Fairy"],
		baseStats: {hp: 70, atk: 90, def: 70, spa: 60, spd: 60, spe: 70},
		abilities: {0: "Intimidate", 1: "Quick Feet", H: "Pressure"},
		prevo: "Poochyena-Ancient",
		evos: ["Matriaryena"],
	},
	matriaryena: {
		num: 2091,
		name: "Matriaryena",
		types: ["Dark", "Fairy"],
		baseStats: {hp: 85, atk: 110, def: 85, spa: 65, spd: 65, spe: 110},
		abilities: {0: "Intimidate", 1: "Quick Feet", H: "Pressure"},
		prevo: "Mightyena-Ancient",
	},
	teenizino: {
		num: 2092,
		name: "Teenizino",
		types: ["Dragon"],
		baseStats: {hp: 35, atk: 50, def: 35, spa: 45, spd: 60, spe: 80},
		abilities: {0: "Run Away", H: "Frisk"},
		evos: ["Terrorzino"],
	},
	terrorzino: {
		num: 2093,
		name: "Terrorzino",
		types: ["Dragon"],
		baseStats: {hp: 85, atk: 135, def: 80, spa: 75, spd: 110, spe: 60},
		abilities: {0: "Hyper Cutter", H: "Steelworker"},
		prevo: "Teenizino",
	},
	sailad: {
		num: 2094,
		name: "Sailad",
		types: ["Fire"],
		baseStats: {hp: 58, atk: 50, def: 75, spa: 89, spd: 45, spe: 50},
		abilities: {0: "Mummy", H: "Sand Force"},
		evos: ["Pharaocious"],
	},
	pharaocious: {
		num: 2095,
		name: "Pharaocious",
		types: ["Fire", "Dark"],
		baseStats: {hp: 82, atk: 80, def: 111, spa: 106, spd: 70, spe: 78},
		abilities: {0: "Mummy", H: "Sand Force"},
		prevo: "Sailad",
	},
	honkeri: {
		num: 2096,
		name: "Honkeri",
		types: ["Grass"],
		baseStats: {hp: 55, atk: 50, def: 50, spa: 50, spd: 50, spe: 55},
		abilities: {0: "Pastel Veil", H: "Liquid Voice"},
		evos: ["Melophus"],
	},
	melophus: {
		num: 2097,
		name: "Melophus",
		types: ["Grass", "Fairy"],
		baseStats: {hp: 110, atk: 70, def: 90, spa: 90, spd: 70, spe: 95},
		abilities: {0: "Pastel Veil", H: "Liquid Voice"},
		prevo: "Honkeri",
	},
	noibatancient: {
		num: 2098,
		name: "Noibat-Ancient",
		types: ["Fire", "Flying"],
		baseStats: {hp: 40, atk: 25, def: 45, spa: 40, spd: 40, spe: 55},
		abilities: {0: "Frisk", 1: "Infiltrator", H: "Flame Body"},
		evos: ["Noivern-Ancient"],
	},
	noivernancient: {
		num: 2099,
		name: "Noivern-Ancient",
		types: ["Fire", "Flying"],
		baseStats: {hp: 85, atk: 60, def: 97, spa: 90, spd: 80, spe: 123},
		abilities: {0: "Frisk", 1: "Infiltrator", H: "Flame Body"},
		prevo: "Noibat-Ancient",
	},
	dianciecataclysm: {
		num: 2100,
		name: "Diancie-Cataclysm",
		types: ["Rock", "Poison"],
		baseStats: {hp: 50, atk: 130, def: 120, spa: 130, spd: 120, spe: 50},
		abilities: { 0: "Flash Fire" },
		otherFormes: ["Diancie-Cataclysm-Mega"],
		formeOrder: ["Diancie-Cataclysm", "Diancie-Cataclysm-Mega"],
	},
	dianciecataclysmmega: {
		num: 2100,
		name: "Diancie-Cataclysm-Mega",
		baseSpecies: "Diancie-Cataclysm",
		forme: "Mega",
		types: ["Rock", "Ghost"],
		baseStats: { hp: 50, atk: 110, def: 160, spa: 110, spd: 160, spe: 110 },
		abilities: { 0: "Levitate" },
		requiredItem: "Diancite",
	},
	onixcrystal: {
		num: 2101,
		name: "Onix-Crystal",
		types: ["Ice", "Fairy"],
		baseStats: {hp: 35, atk: 55, def: 145, spa: 30, spd: 50, spe: 70},
		abilities: {0: "Water Absorb", 1: "Clear Body", H: "Filter"},
		evos: ["Steelix-Crystal"],
	},
	steelixcrystal: {
		num: 2102,
		name: "Steelix-Crystal",
		types: ["Ice", "Fairy"],
		baseStats: {hp: 70, atk: 90, def: 190, spa: 50, spd: 80, spe: 30},
		abilities: {0: "Water Absorb", 1: "Sheer Force", H: "Filter"},
		prevo: "Onix-Crystal",
		otherFormes: ["Steelix-Crystal-Mega"],
		formeOrder: ["Steelix-Crystal", "Steelix-Crystal-Mega"],
	},
	steelixcrystalmega: {
		num: 2102,
		name: "Steelix-Crystal-Mega",
		baseSpecies: "Steelix-Crystal",
		forme: "Mega",
		types: ["Ice", "Water"],
		baseStats: { hp: 70, atk: 135, def: 210, spa: 50, spd: 95, spe: 50 },
		abilities: { 0: "Polar Ice" },
		requiredItem: "Steelixite",
	},
};
