export const Pokedex: {[speciesid: string]: SpeciesData} = {
	//Slate 1: Grass, Fire, Water
	sproutsel: {
		num: 1,
		name: "Sproutsel",
		types: ["Grass"],
		baseStats: {hp: 45, atk: 40, def: 70, spa: 40, spd: 45, spe: 70},
		abilities: {0: "Overgrow", H: "Poison Heal"},
		weightkg: 35.5,
		evos: ["Mestela"],
	},
	mestela: {
		num: 2,
		name: "Mestela",
		types: ["Grass"],
		baseStats: {hp: 75, atk: 55, def: 80, spa: 50, spd: 65, spe: 85},
		abilities: {0: "Overgrow", H: "Poison Heal"},
		weightkg: 35.5,
		evos: ["Prairret"],
		prevo: "Sproutsel",
	},
	prairret: {
		num: 3,
		name: "Prairret",
		types: ["Grass"],
		baseStats: {hp: 85, atk: 105, def: 100, spa: 65, spd: 75, spe: 100},
		abilities: {0: "Overgrow", H: "Poison Heal"},
		heightm: 1.9,
		weightkg: 35.5,
		prevo: "Mestela",
	},
	fluxtape: {
		num: 4,
		name: "Fluxtape",
		baseForme: "Mono",
		types: ["Fire"],
		gender: "N",
		baseStats: {hp: 60, atk: 89, def: 50, spa: 115, spd: 60, spe: 126},
		abilities: {0: "Flame Body", 1: "Competitive", H: "Flash Fire"},
		heightm: 1.7,
		weightkg: 0.2,
		otherFormes: ["Fluxtape-Stereo"],
		formeOrder: ["Fluxtape", "Fluxtape-Stereo"],
	},
	triluga: {
		num: 5,
		name: "Triluga",
		types: ["Water"],
		baseStats: {hp: 50, atk: 75, def: 45, spa: 30, spd: 30, spe: 60},
		abilities: {0: "Torrent", H: "Water Veil"},
		weightkg: 21.3,
		evos: ["Tridolphin"],
	},
	tridolphin: {
		num: 6,
		name: "Tridolphin",
		types: ["Water"],
		baseStats: {hp: 70, atk: 95, def: 65, spa: 40, spd: 50, spe: 90},
		abilities: {0: "Torrent", H: "Water Veil"},
		weightkg: 89.5,
		evos: ["Prairret"],
		prevo: "Triluga",
	},
	cetaidon: {
		num: 7,
		name: "Cetaidon",
		types: ["Water"],
		baseStats: {hp: 110, atk: 125, def: 85, spa: 80, spd: 80, spe: 50},
		abilities: {0: "Torrent", H: "Water Veil"},
		heightm: 3.3,
		weightkg: 371.1,
		prevo: "Tridolphin",
	},
	//Slate 2: Dragon, Fairy, Steel
	drakotomy: {
		num: 1004,
		name: "Drakotomy",
		types: ["Dragon"],
		baseStats: {hp: 95, atk: 100, def: 105, spa: 90, spd: 80, spe: 40},
		abilities: {0: "Regenerator", H: "Hustle"},
		heightm: 4.1,
		weightkg: 462.3,
	},
	gencook: {
		num: 1005,
		name: "Gencook",
		types: ["Fairy"],
		baseStats: {hp: 80, atk: 70, def: 110, spa: 90, spd: 120, spe: 60},
		abilities: {0: "Ripen", 1: "Gluttony", H: "Oblivious"},
		heightm: 1.2,
		weightkg: 115.3,
	},
	heraleo: {
		num: 1006,
		name: "Heraleo",
		types: ["Steel"],
		baseStats: {hp: 65, atk: 100, def: 125, spa: 75, spd: 85, spe: 75},
		abilities: {0: "Dauntless Shield", 1: "Intimidate", H: "Tough Claws"},
		heightm: 1.0,
		weightkg: 205.0,
	},
	//Slate 3: Psychic, Dark, Fighting
	correept: {
		num: 1007,
		name: "Correept",
		types: ["Dark"],
		baseStats: {hp: 74, atk: 93, def: 129, spa: 75, spd: 107, spe: 32},
		abilities: {0: "Dark Aura", 1: "Rattled", H: "Tangled Feet"},
		weightkg: 74.5,
	},
	dojodo: {
		num: 1008,
		name: "Dojodo",
		types: ["Fighting"],
		baseStats: {hp: 90, atk: 115, def: 80, spa: 60, spd: 100, spe: 80},
		abilities: {0: "Justified", 1: "Iron Fist", H: "Stamina"},
		heightm: 1.3,
		weightkg: 34.8,
	},
	harzodia: {
		num: 1009,
		name: "Harzodia",
		types: ["Psychic"],
		baseStats: {hp: 75, atk: 55, def: 65, spa: 130, spd: 125, spe: 90},
		abilities: {0: "Magician", 1: "Victory Star", H: "Telepathy"},
		heightm: 1.1,
		weightkg: 26.1,
	},
	//Slate 4: Flying, Ground, Rock
	nimbustorm: {
		num: 1010,
		name: "Nimbustorm",
		types: ["Flying"],
		baseStats: {hp: 170, atk: 40, def: 65, spa: 100, spd: 45, spe: 85},
		abilities: {0: "Magic Guard", H: "Drizzle"},
		weightkg: 326,
	},
	burrodger: {
		num: 1011,
		name: "Burrodger",
		types: ["Ground"],
		baseStats: {hp: 60, atk: 90, def: 145, spa: 60, spd: 120, spe: 55},
		abilities: {0: "Immunity", 1: "Sand Veil", H: "Sand Force"},
		weightkg: 32.4,
	},
	wesgranit: {
		num: 1012,
		name: "Wesgranit",
		types: ["Rock"],
		baseStats: {hp: 70, atk: 130, def: 85, spa: 75, spd: 60, spe: 110},
		abilities: {0: "Victory Star", H: "Levitate"},
		heightm: 1.6,
		weightkg: 160,
	},
	//Slate 5: Electric, Ghost, Ice
	storvark: {
		num: 1013,
		name: "Storvark",
		types: ["Electric"],
		baseStats: {hp: 90, atk: 67, def: 80, spa: 100, spd: 70, spe: 130},
		abilities: {0: "Motor Drive", H: "Intimidate"},
		weightkg: 88,
	},
	dullaham: {
		num: 1014,
		name: "Dullaham",
		types: ["Ghost"],
		baseStats: {hp: 100, atk: 85, def: 60, spa: 95, spd: 110, spe: 60},
		abilities: {0: "Thick Fat", 1: "Oblivious", H: "Frisk"},
		heightm: 1.1,
		weightkg: 97.3,
	},
	skappa: {
		num: 1015,
		name: "Skappa",
		types: ["Ice"],
		baseStats: {hp: 60, atk: 75, def: 75, spa: 115, spd: 70, spe: 130},
		abilities: {0: "Water Absorb", 1: "Swift Swim", H: "Slush Rush"},
		heightm: 0.7,
		weightkg: 24.3,
	},
	//Slate 6: Bug, Normal, Poison
	magroach: {
		num: 1016,
		name: "Magroach",
		types: ["Bug"],
		baseStats: {hp: 90, atk: 110, def: 85, spa: 85, spd: 110, spe: 90},
		abilities: {0: "Magic Guard", 1: "Illuminate", H: "Rattled"},
		heightm: 3.5,
		weightkg: 135,
	},
	resonake: {
		num: 1017,
		name: "Resonake",
		types: ["Normal"],
		baseStats: {hp: 84, atk: 70, def: 119, spa: 91, spd: 113, spe: 67},
		abilities: {0: "Soundproof", 1: "Gluttony", H: "Sheer Force"},
		weightkg: 7,
	},
	clavelye: {
		num: 1018,
		name: "Clavelye",
		types: ["Poison"],
		baseStats: {hp: 108, atk: 80, def: 95, spa: 120, spd: 85, spe: 60},
		abilities: {0: "Sticky Hold", 1: "Clear Body", H: "Healer"},
		weightkg: 58.1,
	},
	//Slate 7: Electric/Water, Poison/Dragon, Steel/Ghost
	whiscamp: {
		num: 1019,
		name: "Whiscamp",
		types: ["Electric", "Water"],
		baseStats: {hp: 80, atk: 70, def: 80, spa: 105, spd: 110, spe: 80},
		abilities: {0: "Rain Dish", 1: "Hydration", H: "Mold Breaker"},
		weightkg: 53,
	},
	laopharsi: {
		num: 1020,
		name: "Laopharsi",
		types: ["Poison", "Dragon"],
		baseStats: {hp: 85, atk: 100, def: 100, spa: 80, spd: 46, spe: 109},
		abilities: {0: "Technician", 1: "Strong Jaw", H: "Corrosion"},
		heightm: 7,
		weightkg: 750,
	},
	spirox: {
		num: 1021,
		name: "Spirox",
		types: ["Steel", "Ghost"],
		baseStats: {hp: 71, atk: 62, def: 66, spa: 113, spd: 101, spe: 117},
		abilities: {0: "Limber", H: "Cursed Body"},
		weightkg: 24,
	},
	//Slate 8: Flying/Dark, Normal/Grass, Rock/Fairy
	spincaba: {
		num: 1022,
		name: "Spincaba",
		types: ["Flying", "Dark"],
		baseStats: {hp: 65, atk: 90, def: 95, spa: 80, spd: 135, spe: 80},
		abilities: {0: "Insomnia", 1: "Tangled Feet", H: "Contrary"},
		weightkg: 2.5,
	},
	jungape: {
		num: 1023,
		name: "Jungape",
		types: ["Normal", "Grass"],
		baseStats: {hp: 82, atk: 90, def: 116, spa: 67, spd: 76, spe: 79},
		abilities: {0: "Own Tempo", H: "Gorilla Tactics"},
		weightkg: 189,
	},
	nympheral: {
		num: 1024,
		name: "Nympheral",
		types: ["Rock", "Fairy"],
		baseStats: {hp: 71, atk: 109, def: 83, spa: 89, spd: 67, spe: 151},
		abilities: {0: "Beast Boost"},
		weightkg: 21.6,
	},
	//Slate 9: Bug/Fighting, Ice/Fire, Ground/Psychic
	beetilient: {
		num: 1025,
		name: "Beetilient",
		types: ["Bug", "Fighting"],
		baseStats: {hp: 75, atk: 110, def: 135, spa: 40, spd: 75, spe: 75},
		abilities: {0: "Shell Armor", 1: "Stamina", H: "Mirror Armor"},
		weightkg: 65.4,
	},
	thermasorb: {
		num: 1026,
		name: "Thermasorb",
		types: ["Ice", "Fire"],
		baseStats: {hp: 100, atk: 75, def: 75, spa: 130, spd: 90, spe: 100},
		abilities: {0: "Flash Fire", 1: "White Smoke", H: "Perish Body"},
		weightkg: 122.3,
	},
	cosmole : {
		num: 1027,
		name: "Cosmole",
		types: ["Ground", "Psychic"],
		baseStats: {hp: 95, atk: 80, def: 95, spa: 100, spd: 110, spe: 85},
		abilities: {0: "Anticipation", 1: "Tough Claws", H: "Prism Armor"},
		weightkg: 24.9,
	},
	//Slate 10: Dark/Normal, Steel/Flying, Water/Fairy
	slashowa: {
		num: 1028,
		name: "Slashowa",
		types: ["Dark", "Normal"],
		baseStats: {hp: 70, atk: 55, def: 70, spa: 115, spd: 65, spe: 115},
		abilities: {0: "Soundproof", 1: "Technician", H: "Punk Rock"},
		weightkg: 81,
	},
	fluormingo: {
		num: 1029,
		name: "Fluormingo",
		types: ["Steel", "Flying"],
		baseStats: {hp: 72, atk: 115, def: 80, spa: 50, spd: 120, spe: 58},
		abilities: {0: "Drought"},
		weightkg: 36.2,
	},
	fuscicea : {
		num: 1030,
		name: "Fuscicea",
		types: ["Water", "Fairy"],
		baseStats: {hp: 65, atk: 80, def: 75, spa: 95, spd: 90, spe: 105},
		abilities: {0: "Natural Cure", H: "Adaptability"},
		weightkg: 16,
	},
	//Slate 11: Grass/Ground, Ice/Dragon, Psychic/Fighting
	akanalud: {
		num: 1031,
		name: "Akanalud",
		types: ["Grass", "Ground"],
		baseStats: {hp: 109, atk: 71, def: 82, spa: 113, spd: 119, spe: 9},
		abilities: {0: "Dry Skin", 1: "Sand Veil", H: "Sand Spit"},
		weightkg: 999.9,
	},
	glaciallo: {
		num: 1032,
		name: "Glaciallo",
		types: ["Ice", "Dragon"],
		baseStats: {hp: 95, atk: 117, def: 93, spa: 45, spd: 70, spe: 85},
		abilities: {0: "Vital Spirit", 1: "Skill Link", H: "Clear Body"},
		weightkg: 107.9,
	},
	gorilax : {
		num: 1033,
		name: "Gorilax",
		types: ["Psychic", "Fighting"],
		baseStats: {hp: 116, atk: 61, def: 101, spa: 83, spd: 117, spe: 122},
		abilities: {0: "Aroma Veil", H: "Sniper"},
		weightkg: 193,
	},
	//Slate 12: Bug/Ghost, Fire/Electric, Rock/Poison
	pharaoach: {
		num: 1034,
		name: "Pharaoach",
		types: ["Bug", "Ghost"],
		baseStats: {hp: 120, atk: 140, def: 40, spa: 100, spd: 90, spe: 70},
		abilities: {0: "Cursed Body", 1: "Sand Force", H: "Regenerator"},
		weightkg: 180,
	},
	fluxtapestereo: {
		num: 4,
		name: "Fluxtape-Stereo",
		baseSpecies: "Fluxtape",
		forme: "Stereo",
		types: ["Fire", "Electric"],
		gender: "N",
		baseStats: {hp: 110, atk: 129, def: 100, spa: 105, spd: 80, spe: 76},
		abilities: {0: "Flame Body", 1: "Rock Head", H: "Volt Absorb"},
		heightm: 5.1,
		weightkg: 42,
		changesFrom: "Fluxtape",
	},
	gargogunk: {
		num: 1035,
		name: "Gargogunk",
		types: ["Rock", "Poison"],
		baseStats: {hp: 101, atk: 123, def: 80, spa: 88, spd: 130, spe: 78},
		abilities: {0: "Mold Breaker", 1: "Aftermath", H: "Sand Stream"},
		heightm: 1.8,
		weightkg: 147,
	},
};