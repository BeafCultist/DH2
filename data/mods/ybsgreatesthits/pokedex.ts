export const Pokedex: {[speciesid: string]: SpeciesData} = {
alakazam: {
		inherit: true,
		name: "Alakazam",
		types: ["Psychic"],
		baseStats: {hp: 85, atk: 50, def: 55, spa: 115, spd: 95, spe: 120},
		abilities: {0: "Psylink"},
	},
	riolu: {
		inherit: true,
		name: "Riolu",
		types: ["Fighting", "Psychic"],
		baseStats: {hp: 80, atk: 90, def: 70, spa: 70, spd: 70, spe: 100},
		abilities: {0: "Tinkering"},
	},
	gallade: {
		inherit: true,
		name: "Gallade",
		types: ["Steel", "Fighting"],
		baseStats: {hp: 80, atk: 120, def: 90, spa: 50, spd: 70, spe: 85},
		abilities: {0: "Scrappy", H: "Guts"},
	},
	gardevoir: {
		inherit: true,
		name: "Gardevoir",
		types: ["Steel", "Fairy"],
		baseStats: {hp: 80, atk: 50, def: 85, spa: 90, spd: 120, spe: 70},
		abilities: {0: "Serene Grace", H: "Volt Absorb"},
	},
	morpeko: {
		inherit: true,
		name: "Morpeko",
		types: ["Fairy"],
		baseStats: {hp: 75, atk: 67, def: 103, spa: 67, spd: 103, spe: 113},
		abilities: {0: "Hunger Switch"},
	},
	morpekohangry: {
		inherit: true,
		types: ["Fairy", "Dark"],
		baseStats: {hp: 75, atk: 103, def: 67, spa: 103, spd: 67, spe: 113},
		abilities: {0: "Hunger Switch"},
	},
	zapdosgalar: {
		inherit: true,
		types: ["Ground"],
		baseStats: {hp: 75, atk: 80, def: 65, spa: 60, spd: 75, spe: 130},
		abilities: {0: "Speed Boost", 1: "Sniper", H: "Sand Rush"},
	},
	archeops: {
		inherit: true,
		name: "Archeops",
		types: ["Rock", "Fire"],
		baseStats: {hp: 76, atk: 64, def: 77, spa: 100, spd: 87, spe: 116},
		abilities: {0: "Levitate", H: "Solar Power"},
	},
	castform: {
		inherit: true,
		name: "Castform",
		types: ["Normal"],
		baseStats: {hp: 85, atk: 35, def: 105, spa: 125, spd: 75, spe: 85},
		abilities: {0: "Mimicry"},
	},
	corsola: {
		inherit: true,
		name: "Corsola",
		types: ["Rock", "Grass"],
		baseStats: {hp: 85, atk: 30, def: 95, spa: 55, spd: 95, spe: 35},
		abilities: {0: "Light Power", H: "Solid Rock"},
	},
	chatot: {
		inherit: true,
		name: "Chatot",
		types: ["Rock", "Flying"],
		baseStats: {hp: 76, atk: 45, def: 55, spa: 112, spd: 52, spe: 91},
		abilities: {0: "Punk Rock", 1: "Heavy Metal", H: "Tangled Feet"},
	},
	ariados: {
		inherit: true,
		name: "Ariados",
		types: ["Bug", "Poison"],
		baseStats: {hp: 70, atk: 120, def: 110, spa: 60, spd: 90, spe: 50},
		abilities: {0: "Brute Force"},
	},
	carnivine: {
		inherit: true,
		name: "Carnivine",
		types: ["Grass", "Poison"],
		baseStats: {hp: 74, atk: 120, def: 89, spa: 90, spd: 89, spe: 92},
		abilities: {0: "Intoxicate"},
	},
	weavile: {
		inherit: true,
		name: "Weavile",
		types: ["Dark", "Ice"],
		baseStats: {hp: 70, atk: 45, def: 65, spa: 105, spd: 85, spe: 125},
		abilities: {0: "Pressure", 1: "Inner Focus", H: "Pickpocket"},
	},
	noctowl: {
		inherit: true,
		name: "Noctowl",
		types: ["Dark", "Flying"],
		baseStats: {hp: 100, atk: 30, def: 50, spa: 106, spd: 86, spe: 100},
		abilities: {0: "Dark Aura", 1: "Keen Eye", H: "Tinted Lens"},
	},
	lurantis: {
		inherit: true,
		name: "Lurantis",
		types: ["Grass"],
		baseStats: {hp: 70, atk: 115, def: 100, spa: 80, spd: 100, spe: 75},
		abilities: {0: "Contrary"},
	},
	octillery: {
		inherit: true,
		name: "Octillery",
		types: ["Water", "Dark"],
		baseStats: {hp: 75, atk: 100, def: 70, spa: 110, spd: 70, spe: 55},
		abilities: {0: "Suction Cups", 1: "Sniper", H: "Mega Launcher"},
	},
	articuno: {
		inherit: true,
		name: "Articuno",
		types: ["Ice", "Flying"],
		baseStats: {hp: 90, atk: 85, def: 85, spa: 100, spd: 95, spe: 125},
		abilities: {0: "Pressure", H: "Snow Warning"},
	},
	unfezant: {
		inherit: true,
		name: "Unfezant",
		types: ["Flying"],
		baseStats: {hp: 80, atk: 105, def: 80, spa: 82, spd: 80, spe: 93},
		abilities: {0: "Big Pecks", 1: "Super Luck", H: "Aerilate"},
	},
	kricketune: {
		inherit: true,
		name: "Kricketune",
		types: ["Bug"],
		baseStats: {hp: 112, atk: 125, def: 51, spa: 55, spd: 51, spe: 80},
		abilities: {0: "Swarm", 1: "Technician", H: "Prankster"},
	},
	leafeon: {
		inherit: true,
		name: "Leafeon",
		types: ["Grass"],
		baseStats: {hp: 65, atk: 95, def: 130, spa: 60, spd: 65, spe: 110},
		abilities: {0: "Chlorophyll", H: "Tough Claws"},
	},
	dedenne: {
		inherit: true,
		name: "Dedenne",
		types: ["Grass", "Electric"],
		baseStats: {hp: 87, atk: 117, def: 77, spa: 81, spd: 77, spe: 101},
		abilities: {0: "Harvest", 1: "Cheek Pouch", H: "Sap Sipper"},
	},
	electrode: {
		inherit: true,
		name: "Electrode",
		types: ["Electric"],
		baseStats: {hp: 70, atk: 50, def: 70, spa: 80, spd: 100, spe: 170},
		abilities: {0: "Aftermath", 1: "Soundproof", H: "No Guard"},
	},
	luxray: {
		inherit: true,
		name: "Luxray",
		types: ["Electric", "Ice"],
		baseStats: {hp: 70, atk: 120, def: 70, spa: 120, spd: 70, spe: 80},
		abilities: {0: "Slush Rush", 1: "Intimidate", H: "Guts"},
	},
	seviper: {
		inherit: true,
		name: "Seviper",
		types: ["Electric", "Poison"],
		baseStats: {hp: 80, atk: 110, def: 81, spa: 65, spd: 84, spe: 110},
		abilities: {0: "Shed Skin", H: "Strong Jaw"},
	},
	kangaskhan: {
		inherit: true,
		name: "Kangaskhan",
		types: ["Ground"],
		baseStats: {hp: 115, atk: 105, def: 80, spa: 40, spd: 80, spe: 105},
		abilities: {0: "Mold Breaker", 1: "Defiant", H: "Friend Guard"},
	},
	venusaur: {
		inherit: true,
		name: "Venusaur",
		types: ["Grass", "Poison"],
		baseStats: {hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80},
		abilities: {0: "Overgrow", H: "Chlorophyll"},
	},
	charizard: {
		inherit: true,
		name: "Charizard",
		types: ["Fire", "Flying"],
		baseStats: {hp: 78, atk: 104, def: 68, spa: 109, spd: 75, spe: 100},
		abilities: {0: "Blaze", H: "Solar Power"},
	},
	blastoise: {
		inherit: true,
		name: "Blastoise",
		types: ["Water"],
		baseStats: {hp: 79, atk: 80, def: 100, spa: 88, spd: 105, spe: 78},
		abilities: {0: "Torrent", H: "Rain Dish"},
	},
	houndoom: {
		inherit: true,
		name: "Houndoom",
		types: ["Dark", "Fire"],
		baseStats: {hp: 75, atk: 90, def: 90, spa: 120, spd: 90, spe: 95},
		abilities: {0: "Intimidate"},
	},
	scyther: {
		inherit: true,
		name: "Scyther",
		types: ["Bug", "Psychic"],
		baseStats: {hp: 65, atk: 100, def: 70, spa: 55, spd: 80, spe: 130},
		abilities: {0: "Technician", 1: "Telepathy", H: "Dazzling"},
		evos: null,
	},
	probopass: {
		inherit: true,
		name: "Probopass",
		types: ["Rock", "Psychic"],
		baseStats: {hp: 70, atk: 65, def: 154, spa: 90, spd: 120, spe: 30},
		abilities: {0: "Sturdy"},
	},
	luxio: {
		inherit: true,
		name: "Luxio",
		types: ["Electric", "Normal"],
		baseStats: {hp: 70, atk: 111, def: 85, spa: 69, spd: 85, spe: 70},
		abilities: {0: "Guts"},
	},
	banette: {
		inherit: true,
		name: "Banette",
		types: ["Ghost", "Dark"],
		baseStats: {hp: 64, atk: 135, def: 85, spa: 73, spd: 103, spe: 65},
		abilities: {0: "Prankster"},
	},
	heracross: {
		inherit: true,
		name: "Heracross",
		types: ["Bug", "Fighting"],
		baseStats: {hp: 80, atk: 105, def: 95, spa: 40, spd: 95, spe: 125},
		abilities: {0: "Compound Eyes"},
	},
	pidgeot: {
		inherit: true,
		name: "Pidgeot",
		types: ["Normal", "Flying"],
		baseStats: {hp: 83, atk: 70, def: 135, spa: 90, spd: 80, spe: 91},
		abilities: {0: "Iron Barbs"},
	},
	kirlia: {
		inherit: true,
		name: "Kirlia",
		types: ["Fairy", "Fighting"],
		baseStats: {hp: 76, atk: 60, def: 70, spa: 75, spd: 90, spe: 111},
		abilities: {0: "Cute Charm", 1: "Anger Point", H: "Sheer Force"},
	},
	sandslash: {
		inherit: true,
		name: "Sandslash",
		types: ["Ground", "Steel"],
		baseStats: {hp: 85, atk: 100, def: 120, spa: 55, spd: 75, spe: 75},
		abilities: {0: "Sand Force", 1: "Iron Barbs", H: "Sand Rush"},
	},
	pelipper: {
		inherit: true,
		name: "Pelipper",
		types: ["Water", "Flying"],
		baseStats: {hp: 60, atk: 50, def: 150, spa: 95, spd: 70, spe: 75},
		abilities: {0: "Prankster"},
	},
	monferno: {
		inherit: true,
		name: "Monferno",
		types: ["Fire", "Fighting"],
		baseStats: {hp: 64, atk: 78, def: 52, spa: 78, spd: 52, spe: 81},
		abilities: {0: "Sensei"},
	},
	greedent: {
		inherit: true,
		name: "Greedent",
		types: ["Grass", "Ground"],
		baseStats: {hp: 120, atk: 105, def: 95, spa: 55, spd: 95, spe: 20},
		abilities: {0: "Cheek Pouch", H: "Gluttony"},
	},
	indeedeef: {
		inherit: true,
		name: "Indeedee-F",
		types: ["Psychic", "Fairy"],
		baseStats: {hp: 70, atk: 65, def: 65, spa: 105, spd: 105, spe: 85},
		abilities: {0: "Own Temp", 1: "Synchronize", H: "Psychic Surge"},
	},
	primarina: {
		inherit: true,
		name: "Primarina",
		types: ["Water", "Fairy"],
		baseStats: {hp: 80, atk: 74, def: 74, spa: 126, spd: 116, spe: 60},
		abilities: {0: "Torrent", H: "Liquid Voice"},
	},
	hoopa: {
		inherit: true,
		name: "Hoopa",
		types: ["Ghost", "Steel"],
		baseStats: {hp: 110, atk: 110, def: 60, spa: 130, spd: 150, spe: 40},
		abilities: {0: "Heavy Metal"},
	},
	hoopaunbound: {
		inherit: true,
		name: "Hoopa-Unbound",
		types: ["Ghost", "Fairy"],
		baseStats: {hp: 110, atk: 150, def: 60, spa: 160, spd: 120, spe: 80},
		abilities: {0: "Prankster"},
	},
	delibird: {
		inherit: true,
		name: "Delibird",
		types: ["Ice", "Flying"],
		baseStats: {hp: 65, atk: 65, def: 65, spa: 65, spd: 65, spe: 100},
		abilities: {0: "Santa's Secret"},
	},
	vanilluxe: {
		inherit: true,
		name: "Vanilluxe",
		types: ["Ice"],
		baseStats: {hp: 71, atk: 95, def: 85, spa: 110, spd: 95, spe: 99},
		abilities: {0: "Ice Body", 1: "Snow Warning", H: "Weak Armor"},
	},
	oranguru: {
		inherit: true,
		name: "Oranguru",
		types: ["Psychic"],
		baseStats: {hp: 65, atk: 55, def: 60, spa: 110, spd: 70, spe: 95},
		abilities: {0: "Vital Spirit", 1: "Analytic", H: "Competitive"},
	},
	primeape: {
		inherit: true,
		name: "Primeape",
		types: ["Fairy"],
		baseStats: {hp: 80, atk: 90, def: 65, spa: 50, spd: 100, spe: 70},
		abilities: {0: "Wonder Skin", 1: "Prankster", H: "Flash Fire"},
	},
	machamp: {
		inherit: true,
		name: "Machamp",
		types: ["Fighting"],
		baseStats: {hp: 90, atk: 130, def: 80, spa: 65, spd: 85, spe: 55},
		abilities: {0: "Technician"},
	},
	wartortle: {
		inherit: true,
		name: "Wartortle",
		types: ["Water", "Ice"],
		baseStats: {hp: 78, atk: 105, def: 100, spa: 78, spd: 83, spe: 85},
		abilities: {0: "Long Reach"},
	},
	garbodor: {
		inherit: true,
		name: "Garbodor",
		types: ["Poison", "Psychic"],
		baseStats: {hp: 80, atk: 95, def: 92, spa: 50, spd: 92, spe: 65},
		abilities: {0: "Gravitas", 1: "Levitate", H: "Ice Body"},
	},
	yanmega: {
		inherit: true,
		name: "Yanmega",
		types: ["Bug", "Dragon"],
		baseStats: {hp: 86, atk: 76, def: 86, spa: 116, spd: 56, spe: 96},
		abilities: {0: "Speed Boost", 1: "Tinted Lens", H: "Frisk"},
	},
	rotomfan: {
		inherit: true,
		types: ["Electric", "Steel"],
		baseStats: {hp: 50, atk: 65, def: 107, spa: 105, spd: 107, spe: 86},
		abilities: {0: "Levitate"},
	},
	oricoriosensu: {
		inherit: true,
		types: ["Ghost", "Flying"],
		baseStats: {hp: 75, atk: 70, def: 70, spa: 108, spd: 70, spe: 103},
		abilities: {0: "Dancer"},
	},
	ledian: {
		inherit: true,
		name: "Ledian",
		types: ["Bug", "Fighting"],
		baseStats: {hp: 55, atk: 45, def: 50, spa: 55, spd: 110, spe: 95},
		abilities: {0: "Swam", 1: "Iron Fist", H: "Pure Power"},
	},
	accelgor: {
		inherit: true,
		name: "Accelgor",
		types: ["Bug", "Dark"],
		baseStats: {hp: 80, atk: 70, def: 60, spa: 100, spd: 60, spe: 145},
		abilities: {0: "Hydration", 1: "Sticky Hold", H: "Swarm"},
	},
	floatzel: {
		inherit: true,
		name: "Floatzel",
		types: ["Water", "Fighting"],
		baseStats: {hp: 85, atk: 105, def: 55, spa: 85, spd: 50, spe: 115},
		abilities: {0: "Swift Swim", H: "Technician"},
	},
	furret: {
		inherit: true,
		name: "Furret",
		types: ["Fairy"],
		baseStats: {hp: 85, atk: 81, def: 64, spa: 45, spd: 95, spe: 90},
		abilities: {0: "Run Away", 1: "Fluffy", H: "Pixilate"},
	},
	masquerain: {
		inherit: true,
		name: "Masquerain",
		types: ["Bug", "Water"],
		baseStats: {hp: 70, atk: 60, def: 62, spa: 100, spd: 100, spe: 82},
		abilities: {0: "Intimidate", H: "Unnerve"},
	},
	arbok: {
		inherit: true,
		name: "Arbok",
		types: ["Poison", "Dragon"],
		baseStats: {hp: 100, atk: 95, def: 69, spa: 65, spd: 109, spe: 81},
		abilities: {0: "Intimidate", H: "Shed Skin"},
	},
	rapidash: {
		inherit: true,
		name: "Rapidash",
		types: ["Fire", "Fairy"],
		baseStats: {hp: 65, atk: 110, def: 70, spa: 80, spd: 80, spe: 105},
		abilities: {0: "Quick Feet", 1: "Flash Fire", H: "Reckless"},
	},
	flygon: {
		inherit: true,
		name: "Flygon",
		types: ["Ground", "Bug"],
		baseStats: {hp: 80, atk: 100, def: 80, spa: 80, spd: 80, spe: 100},
		abilities: {0: "Levitate", H: "Tinted Lens"},
	},
	polteageist: {
		inherit: true,
		name: "Polteageist",
		types: ["Ghost", "Grass"],
		baseStats: {hp: 60, atk: 65, def: 65, spa: 134, spd: 114, spe: 70},
		abilities: {0: "Weak Armor", H: "Cursed Body"},
	},
	decidueye: {
		inherit: true,
		name: "Decidueye",
		types: ["Grass", "Ghost"],
		baseStats: {hp: 78, atk: 107, def: 75, spa: 100, spd: 70, spe: 100},
		abilities: {0: "Overgrow", H: "Long Reach"},
	},
	kyuremblack: {
		inherit: true,
		name: "Kyurem-Black",
		types: ["Dragon", "Ice"],
		baseStats: {hp: 95, atk: 140, def: 70, spa: 120, spd: 70, spe: 95},
		abilities: {0: "Teravolt"},
	},
	obstagoon: {
		inherit: true,
		name: "Obstagoon",
		types: ["Dark", "Normal"],
		baseStats: {hp: 93, atk: 90, def: 101, spa: 60, spd: 81, spe: 95},
		abilities: {0: "Reckless", 1: "Defiant", H: "Guts"},
	},
	starmie: {
		inherit: true,
		name: "Starmie",
		types: ["Water", "Psychic"],
		baseStats: {hp: 75, atk: 60, def: 85, spa: 100, spd: 85, spe: 115},
		abilities: {0: "Illuminate", 1: "Natural Cure", H: "Analytic"},
	},
	xurkitree: {
		inherit: true,
		name: "Xurkitree",
		types: ["Electric", "Grass"],
		baseStats: {hp: 83, atk: 89, def: 71, spa: 173, spd: 71, spe: 83},
		abilities: {0: "Beast Boost"},
	},
	skuntank: {
		inherit: true,
		name: "Skuntank",
		types: ["Poison", "Dark"],
		baseStats: {hp: 103, atk: 93, def: 87, spa: 71, spd: 87, spe: 94},
		abilities: {0: "Neutralizing Gas", 1: "Aftermath", H: "Merciless"},
	},
	tauros: {
		inherit: true,
		name: "Tauros",
		types: ["Normal", "Fighting"],
		baseStats: {hp: 75, atk: 120, def: 95, spa: 40, spd: 70, spe: 110},
		abilities: {0: "Anger Point"},
	},
	sudowoodo: {
		inherit: true,
		name: "Sudowoodo",
		types: ["Rock", "Ghost"],
		baseStats: {hp: 70, atk: 120, def: 130, spa: 30, spd: 95, spe: 30},
		abilities: {0: "Solid Rock", 1: "Rattled", H: "Rock Head"},
	},
	runerigus: {
		inherit: true,
		name: "Runerigus",
		types: ["Ground", "Ghost"],
		baseStats: {hp: 58, atk: 95, def: 145, spa: 50, spd: 105, spe: 30},
		abilities: {0: "Intimidate"},
	},
	talonflame: {
		inherit: true,
		name: "Talonflame",
		types: ["Fire", "Flying"],
		baseStats: {hp: 108, atk: 81, def: 71, spa: 74, spd: 69, spe: 126},
		abilities: {0: "Flame Body"},
	},
	incineroar: {
		inherit: true,
		name: "Incineroar",
		types: ["Fire", "Dark"],
		baseStats: {hp: 95, atk: 90, def: 90, spa: 105, spd: 90, spe: 60},
		abilities: {0: "Blaze", H: "Intimidate"},
	},
	dracovish: {
		inherit: true,
		name: "Dracovish",
		types: ["Water", "Dragon"],
		baseStats: {hp: 90, atk: 90, def: 110, spa: 90, spd: 80, spe: 75},
		abilities: {0: "Water Absorb", H: "Sand Force"},
	},
	armaldo: {
		inherit: true,
		name: "Armaldo",
		types: ["Rock", "Bug"],
		baseStats: {hp: 75, atk: 125, def: 100, spa: 45, spd: 79, spe: 71},
		abilities: {0: "Swift Swim", H: "Analytic"},
	},
	hitmonlee: {
		inherit: true,
		name: "Hitmonlee",
		types: ["Fighting"],
		baseStats: {hp: 50, atk: 120, def: 53, spa: 25, spd: 110, spe: 97},
		abilities: {0: "Magic Guard"},
	},
	flaaffy: {
		inherit: true,
		name: "Flaaffy",
		types: ["Electric"],
		baseStats: {hp: 82, atk: 55, def: 85, spa: 100, spd: 85, spe: 33},
		abilities: {0: "Static", H: "Galvanize"},
	},
	sunflora: {
		inherit: true,
		name: "Sunflora",
		types: ["Grass"],
		baseStats: {hp: 85, atk: 65, def: 85, spa: 105, spd: 95, spe: 30},
		abilities: {0: "Desolate Land"},
	},
	clefable: {
		inherit: true,
		name: "Clefable",
		types: ["Normal"],
		baseStats: {hp: 95, atk: 90, def: 73, spa: 95, spd: 100, spe: 60},
		abilities: {0: "Magic Guard"},
	},
	mawile: {
		inherit: true,
		name: "Mawile",
		types: ["Steel", "Fairy"],
		baseStats: {hp: 60, atk: 65, def: 125, spa: 55, spd: 65, spe: 40},
		abilities: {0: "Huge Power", H: "Intimidate"},
	},
	avalugg: {
		inherit: true,
		name: "Avalugg",
		types: ["Ice", "Fighting"],
		baseStats: {hp: 95, atk: 117, def: 184, spa: 44, spd: 76, spe: 28},
		abilities: {0: "Technician", H: "Sturdy"},
	},
	deoxys: {
		inherit: true,
		name: "Deoxys",
		types: ["Psychic"],
		baseStats: {hp: 50, atk: 110, def: 110, spa: 110, spd: 110, spe: 110},
		abilities: {0: "Pressure"},
	},
	deoxysattack: {
		inherit: true,
		types: ["Psychic"],
		baseStats: {hp: 50, atk: 130, def: 100, spa: 130, spd: 100, spe: 90},
		abilities: {0: "Pressure"},
	},
	deoxysdefense: {
		inherit: true,
		types: ["Psychic"],
		baseStats: {hp: 50, atk: 50, def: 170, spa: 90, spd: 170, spe: 70},
		abilities: {0: "Pressure"},
	},
	deoxysspeed: {
		inherit: true,
		types: ["Psychic"],
		baseStats: {hp: 50, atk: 90, def: 115, spa: 90, spd: 115, spe: 140},
		abilities: {0: "Pressure"},
	},
	cherrim: {
		inherit: true,
		name: "Cherrim",
		types: ["Grass"],
		baseStats: {hp: 80, atk: 70, def: 80, spa: 87, spd: 98, spe: 85},
		abilities: {0: "Desolate Land"},
	},
	ampharos: {
		inherit: true,
		name: "Ampharos",
		types: ["Electric", "Dragon"],
		baseStats: {hp: 90, atk: 95, def: 95, spa: 135, spd: 110, spe: 45},
		abilities: {0: "Mold Breaker", H: "Fluffy"},
	},
	centiskorch: {
		inherit: true,
		name: "Centiskorch",
		types: ["Fire", "Bug"],
		baseStats: {hp: 100, atk: 115, def: 75, spa: 90, spd: 90, spe: 65},
		abilities: {0: "Flash Fire", 1: "Intimidate", H: "Sticky Hold"},
	},
	magmortar: {
		inherit: true,
		name: "Magmortar",
		types: ["Fire", "Fighting"],
		baseStats: {hp: 75, atk: 95, def: 67, spa: 125, spd: 115, spe: 83},
		abilities: {0: "Flame Body", 1: "Magma Armor", H: "Neutralizing Gas"},
	},
	electivire: {
		inherit: true,
		name: "Electivire",
		types: ["Electric", "Dark"],
		baseStats: {hp: 75, atk: 123, def: 67, spa: 95, spd: 105, spe: 95},
		abilities: {0: "Motor Drive", 1: "Libero", H: "Iron Fist"},
	},
	swampert: {
		inherit: true,
		name: "Swampert",
		types: ["Water", "Grass"],
		baseStats: {hp: 100, atk: 92, def: 80, spa: 100, spd: 100, spe: 45},
		abilities: {0: "Berserk", H: "Swift Swim"},
	},
	copperajah: {
		inherit: true,
		name: "Copperajah",
		types: ["Flying", "Steel"],
		baseStats: {hp: 96, atk: 105, def: 65, spa: 95, spd: 75, spe: 55},
		abilities: {0: "Intimidate"},
	},
	pyroar: {
		inherit: true,
		name: "Pyroar",
		types: ["Steel", "Fire"],
		baseStats: {hp: 75, atk: 85, def: 80, spa: 100, spd: 75, spe: 105},
		abilities: {0: "Grim Neigh"},
	},
	pinsir: {
		inherit: true,
		name: "Pinsir",
		types: ["Ground", "Bug"],
		baseStats: {hp: 85, atk: 110, def: 115, spa: 45, spd: 75, spe: 95},
		abilities: {0: "Mold Breaker"},
	},
	toucannon: {
		inherit: true,
		name: "Toucannon",
		types: ["Psychic", "Flying"],
		baseStats: {hp: 80, atk: 85, def: 80, spa: 110, spd: 85, spe: 90},
		abilities: {0: "Magic Guard", H: "Trace"},
	},
	tapukoko: {
		inherit: true,
		name: "Tapu Koko",
		types: ["Ice", "Electric"],
		baseStats: {hp: 85, atk: 110, def: 85, spa: 80, spd: 70, spe: 110},
		abilities: {0: "Snow Warning"},
	},
	rotomheat: {
		inherit: true,
		types: ["Fire", "Fairy"],
		baseStats: {hp: 75, atk: 75, def: 90, spa: 100, spd: 100, spe: 90},
		abilities: {0: "Levitate"},
	},
	fearow: {
		inherit: true,
		name: "Fearow",
		types: ["Flying", "Ghost"],
		baseStats: {hp: 71, atk: 122, def: 94, spa: 52, spd: 72, spe: 89},
		abilities: {0: "Infiltrator", 1: "Unnerve", H: "Fluffy"},
	},
	mightyena: {
		inherit: true,
		name: "Mightyena",
		types: ["Dark", "Grass"],
		baseStats: {hp: 75, atk: 70, def: 70, spa: 125, spd: 70, spe: 80},
		abilities: {0: "Cute Charm", 1: "Harvest", H: "Natural Cure"},
	},
	manectric: {
		inherit: true,
		name: "Manectric",
		types: ["Steel"],
		baseStats: {hp: 55, atk: 100, def: 115, spa: 50, spd: 60, spe: 130},
		abilities: {0: "Technician", 1: "Volt Absorb", H: "Light Metal"},
	},
	slaking: {
		inherit: true,
		name: "Slaking",
		types: ["Psychic"],
		baseStats: {hp: 120, atk: 55, def: 80, spa: 90, spd: 80, spe: 20},
		abilities: {0: "Levitate", H: "Telepathy"},
	},
	dragapult: {
		inherit: true,
		name: "Dragapult",
		types: ["Ghost", "Dragon"],
		baseStats: {hp: 80, atk: 60, def: 55, spa: 105, spd: 75, spe: 125},
		abilities: {0: "Soul Strider", H: "Quick Feet"},
	},
	krookodile: {
		inherit: true,
		name: "Krookodile",
		types: ["Fire", "Rock"],
		baseStats: {hp: 70, atk: 90, def: 90, spa: 50, spd: 50, spe: 110},
		abilities: {0: "Solid Rock", 1: "Rattled", H: "Rock Head"},
	},
	carracosta: {
		inherit: true,
		name: "Carracosta",
		types: ["Poison", "Rock"],
		baseStats: {hp: 70, atk: 50, def: 110, spa: 90, spd: 90, spe: 50},
		abilities: {0: "Solid Rock", 1: "Poison Point", H: "Keen Eye"},
	},
	goodra: {
		inherit: true,
		name: "Goodra",
		types: ["Electric", "Steel"],
		baseStats: {hp: 100, atk: 90, def: 95, spa: 100, spd: 120, spe: 90},
		abilities: {0: "Long Reach", 1: "Static", H: "Galvanize"},
	},
	oricoriopompom: {
		inherit: true,
		types: ["Fighting", "Flying"],
		baseStats: {hp: 65, atk: 108, def: 70, spa: 70, spd: 70, spe: 113},
		abilities: {0: "Dancer"},
	},
	delcatty: {
		inherit: true,
		name: "Delcatty",
		types: ["Fairy", "Ice"],
		baseStats: {hp: 80, atk: 95, def: 95, spa: 70, spd: 70, spe: 110},
		abilities: {0: "Ice Body", 1: "Refrigerate", H: "Wonder Skin"},
	},
	tropius: {
		inherit: true,
		name: "Tropius",
		types: ["Grass", "Dragon"],
		baseStats: {hp: 114, atk: 78, def: 93, spa: 92, spd: 92, spe: 76},
		abilities: {0: "Chlorophyll", 1: "Solar Power", H: "Thick Fat"},
	},
	skitty: {
		inherit: true,
		name: "Skitty",
		types: ["Normal"],
		baseStats: {hp: 90, atk: 65, def: 65, spa: 55, spd: 55, spe: 90},
		abilities: {0: "Normalize"},
	},
};
