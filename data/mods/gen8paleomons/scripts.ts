export const Scripts: {[k: string]: ModdedBattleScriptsData} = {
	gen: 8,
	inherit: 'gen8',
	teambuilderConfig: {
		excludeStandardTiers: true,
		customTiers: ['Paleomons'],
		customDoublesTiers: ['Paleomons Doubles'],
	},

	canMegaEvo(pokemon) {
		const altForme = pokemon.baseSpecies.otherFormes && this.dex.species.get(pokemon.baseSpecies.otherFormes[0]);
		const item = pokemon.getItem();
		if (
			altForme?.isMega && altForme?.requiredMove &&
			pokemon.baseMoves.includes(this.toID(altForme.requiredMove)) && !item.zMove
		) {
			return altForme.name;
		}
		if (item.name === "Slowbronite" && pokemon.baseSpecies.name === "Slowbro-Galar") {
			return null;
		}
		return item.megaStone;
	},
	pokemon: { 
		runImmunity(type: string, message?: string | boolean) {
			if (!type || type === '???') return true;
			if (!this.battle.dex.types.isName(type)) {
				throw new Error("Use runStatusImmunity for " + type);
			}
			if (this.fainted) return false;
	
			const negateImmunity = !this.battle.runEvent('NegateImmunity', this, type);
			const notImmune = type === 'Ground' ?
				this.isGrounded(negateImmunity) :
				(negateImmunity || this.battle.dex.getImmunity(type, this));
			if (notImmune) return true;
			if (message) {
				if (notImmune === null) {
					this.battle.add('-immune', this, '[from] ability: ' + this.getAbility().name);
				} else {
					this.battle.add('-immune', this);
				}
			}
			return false;
		},
		isGrounded(negateImmunity = false) {
			if ('gravity' in this.battle.field.pseudoWeather) return true;
			if ('ingrain' in this.volatiles && this.battle.gen >= 4) return true;
			if ('smackdown' in this.volatiles) return true;
			const item = (this.ignoringItem() ? '' : this.item);
			if (item === 'ironball') return true;
			// If a Fire/Flying type uses Burn Up and Roost, it becomes ???/Flying-type, but it's still grounded.
			if (!negateImmunity && this.hasType('Flying') && !(this.hasType('???') && 'roost' in this.volatiles)) return false;
			if ((this.hasAbility('levitate') || 
				 this.hasAbility('powerofalchemyweezing') || 
				 this.hasAbility('powerofalchemymismagius')) && !this.battle.suppressingAbility(this)) return null;
			if ('magnetrise' in this.volatiles) return false;
			if ('telekinesis' in this.volatiles) return false;
			return item !== 'airballoon';
		},
		ignoringAbility() {
			if (this.battle.gen >= 5 && !this.isActive) return true;
			// Certain Abilities won't activate while Transformed, even if they ordinarily couldn't be suppressed (e.g. Disguise)
			if (this.getAbility().flags['notransform'] && this.transformed) return true;
			if (this.getAbility().flags['cantsuppress']) return false;
			if (this.volatiles['gastroacid']) return true;
			// Check if any active pokemon have the ability Neutralizing Gas
			if (this.hasItem('Ability Shield') || this.ability === ('neutralizinggas' as ID) || this.ability === ('powerofalchemyweezing' as ID)) return false;
			for (const pokemon of this.battle.getAllActive()) {
				// can't use hasAbility because it would lead to infinite recursion
				if ((pokemon.ability === ('neutralizinggas' as ID) || pokemon.ability === ('powerofalchemyweezing' as ID)) && !pokemon.volatiles['gastroacid'] &&
					!pokemon.transformed && !pokemon.abilityState.ending && !this.volatiles['commanding']) {
					return true;
				}
			}
			return false;
		},
		setStatus(
			status: string | Condition,
			source: Pokemon | null = null,
			sourceEffect: Effect | null = null,
			ignoreImmunities = false
		) {
			if (!this.hp) return false;
			status = this.battle.dex.conditions.get(status);
			if (this.battle.event) {
				if (!source) source = this.battle.event.source;
				if (!sourceEffect) sourceEffect = this.battle.effect;
			}
			if (!source) source = this;
	
			if (this.status === status.id) {
				if ((sourceEffect as Move)?.status === this.status) {
					this.battle.add('-fail', this, this.status);
				} else if ((sourceEffect as Move)?.status) {
					this.battle.add('-fail', source);
					this.battle.attrLastMove('[still]');
				}
				return false;
			}
	
			if (!ignoreImmunities && status.id &&
					!(source?.hasAbility(['corrosion', 'powerofalchemymismagius', 'powerofalchemyumbreon']) && ['tox', 'psn'].includes(status.id))) {
				// the game currently never ignores immunities
				if (!this.runStatusImmunity(status.id === 'tox' ? 'psn' : status.id)) {
					this.battle.debug('immune to status');
					if ((sourceEffect as Move)?.status) {
						this.battle.add('-immune', this);
					}
					return false;
				}
			}
			const prevStatus = this.status;
			const prevStatusState = this.statusState;
			if (status.id) {
				const result: boolean = this.battle.runEvent('SetStatus', this, source, sourceEffect, status);
				if (!result) {
					this.battle.debug('set status [' + status.id + '] interrupted');
					return result;
				}
			}
	
			this.status = status.id;
			this.statusState = {id: status.id, target: this};
			if (source) this.statusState.source = source;
			if (status.duration) this.statusState.duration = status.duration;
			if (status.durationCallback) {
				this.statusState.duration = status.durationCallback.call(this.battle, this, source, sourceEffect);
			}
	
			if (status.id && !this.battle.singleEvent('Start', status, this.statusState, this, source, sourceEffect)) {
				this.battle.debug('status start [' + status.id + '] interrupted');
				// cancel the setstatus
				this.status = prevStatus;
				this.statusState = prevStatusState;
				return false;
			}
			if (status.id && !this.battle.runEvent('AfterSetStatus', this, source, sourceEffect, status)) {
				return false;
			}
			return true;
		},
	/*
		modifyDamage(
			baseDamage: number, pokemon: Pokemon, target: Pokemon, move: ActiveMove, suppressMessages = false
		) {
			const tr = this.trunc;
			if (!move.type) move.type = '???';
			const type = move.type;

			baseDamage += 2;

			// multi-target modifier (doubles only)
			if (move.spreadHit) {
				const spreadModifier = move.spreadModifier || (this.gameType === 'free-for-all' ? 0.5 : 0.75);
				this.debug('Spread modifier: ' + spreadModifier);
				baseDamage = this.modify(baseDamage, spreadModifier);
			}

			// weather modifier
			baseDamage = this.runEvent('WeatherModifyDamage', pokemon, target, move, baseDamage);

			// crit - not a modifier
			const isCrit = target.getMoveHitData(move).crit;
			if (isCrit) {
				baseDamage = tr(baseDamage * (move.critModifier || (this.gen >= 6 ? 1.5 : 2)));
			}

			// random factor - also not a modifier
			baseDamage = this.randomizer(baseDamage);

			// STAB
			if (move.forceSTAB || (type !== '???' && pokemon.hasType(type))) {
				// The "???" type never gets STAB
				// Not even if you Roost in Gen 4 and somehow manage to use
				// Struggle in the same turn.
				// (On second thought, it might be easier to get a MissingNo.)
				baseDamage = this.modify(baseDamage, move.stab || 1.5);
			}
			// types
			let typeMod = target.runEffectiveness(move);
			typeMod = this.clampIntRange(typeMod, -6, 6);
			target.getMoveHitData(move).typeMod = typeMod;
			if (typeMod > 0) {
				if (!suppressMessages) this.add('-supereffective', target);

				for (let i = 0; i < typeMod; i++) {
					baseDamage *= 2;
				}
			}
			if (typeMod < 0) {
				if (!suppressMessages) this.add('-resisted', target);

				for (let i = 0; i > typeMod; i--) {
					baseDamage = tr(baseDamage / 2);
				}
			}

			if (isCrit && !suppressMessages) this.add('-crit', target);

			if (pokemon.status === 'brn' && move.category === 'Physical' && !(pokemon.hasAbility('guts'))) {
				if (this.gen < 6 || move.id !== 'facade' || move.id !== 'shadowpunch') {
					baseDamage = this.modify(baseDamage, 0.5);
				}
			}

			// Generation 5, but nothing later, sets damage to 1 before the final damage modifiers
			if (this.gen === 5 && !baseDamage) baseDamage = 1;

			// Final modifier. Modifiers that modify damage after min damage check, such as Life Orb.
			baseDamage = this.runEvent('ModifyDamage', pokemon, target, move, baseDamage);

			if (move.isZOrMaxPowered && target.getMoveHitData(move).zBrokeProtect) {
				baseDamage = this.modify(baseDamage, 0.25);
				this.add('-zbroken', target);
			}

			// Generation 6-7 moves the check for minimum 1 damage after the final modifier...
			if (this.gen !== 5 && !baseDamage) return 1;

			// ...but 16-bit truncation happens even later, and can truncate to 0
			return tr(baseDamage, 16);
		},
*/
		getDamage(
			pokemon: Pokemon, target: Pokemon, move: string | number | ActiveMove,
			suppressMessages = false
		): number | undefined | null | false { // modified for Electro Ball
			if (typeof move === 'string') move = this.dex.getActiveMove(move);
	
			if (typeof move === 'number') {
				const basePower = move;
				move = new Dex.Move({
					basePower,
					type: '???',
					category: 'Physical',
					willCrit: false,
				}) as ActiveMove;
				move.hit = 0;
			}
	
			if (!move.ignoreImmunity || (move.ignoreImmunity !== true && !move.ignoreImmunity[move.type])) {
				if (!target.runImmunity(move.type, !suppressMessages)) {
					return false;
				}
			}
	
			if (move.ohko) return target.maxhp;
			if (move.damageCallback) return move.damageCallback.call(this, pokemon, target);
			if (move.damage === 'level') {
				return pokemon.level;
			} else if (move.damage) {
				return move.damage;
			}
	
			const category = this.getCategory(move);
			const defensiveCategory = move.defensiveCategory || category;
	
			let basePower: number | false | null = move.basePower;
			if (move.basePowerCallback) {
				basePower = move.basePowerCallback.call(this, pokemon, target, move);
			}
			if (!basePower) return basePower === 0 ? undefined : basePower;
			basePower = this.clampIntRange(basePower, 1);
	
			let critMult;
			let critRatio = this.runEvent('ModifyCritRatio', pokemon, target, move, move.critRatio || 0);
			if (this.gen <= 5) {
				critRatio = this.clampIntRange(critRatio, 0, 5);
				critMult = [0, 16, 8, 4, 3, 2];
			} else {
				critRatio = this.clampIntRange(critRatio, 0, 4);
				if (this.gen === 6) {
					critMult = [0, 16, 8, 2, 1];
				} else {
					critMult = [0, 24, 8, 2, 1];
				}
			}
	
			const moveHit = target.getMoveHitData(move);
			moveHit.crit = move.willCrit || false;
			if (move.willCrit === undefined) {
				if (critRatio) {
					moveHit.crit = this.randomChance(1, critMult[critRatio]);
				}
			}
	
			if (moveHit.crit) {
				moveHit.crit = this.runEvent('CriticalHit', target, null, move);
			}
	
			// happens after crit calculation
			basePower = this.runEvent('BasePower', pokemon, target, move, basePower, true);
	
			if (!basePower) return 0;
			basePower = this.clampIntRange(basePower, 1);
	
			const level = pokemon.level;
	
			const attacker = pokemon;
			const defender = target;
			let attackStat: StatNameExceptHP = category === 'Physical' ? 'atk' : 'spa';
			const defenseStat: StatNameExceptHP = defensiveCategory === 'Physical' ? 'def' : 'spd';
			const speedStat: StatNameExceptHP = 'spe';
			if (move.useSourceDefensiveAsOffensive) {
				attackStat = defenseStat;
				// Body press really wants to use the def stat,
				// so it switches stats to compensate for Wonder Room.
				// Of course, the game thus miscalculates the boosts...
				if ('wonderroom' in this.field.pseudoWeather) {
					if (attackStat === 'def') {
						attackStat = 'spd';
					} else if (attackStat === 'spd') {
						attackStat = 'def';
					}
					if (attacker.boosts['def'] || attacker.boosts['spd']) {
						this.hint("Body Press uses Sp. Def boosts when Wonder Room is active.");
					}
				}
			}
			if (move.useSourceSpeedAsOffensive) attackStat = speedStat;
	
			const statTable = {atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe'};
			let attack;
			let defense;
	
			let atkBoosts = move.useTargetOffensive ? defender.boosts[attackStat] : attacker.boosts[attackStat];
			let defBoosts = defender.boosts[defenseStat];
	
			let ignoreNegativeOffensive = !!move.ignoreNegativeOffensive;
			let ignorePositiveDefensive = !!move.ignorePositiveDefensive;
	
			if (moveHit.crit) {
				ignoreNegativeOffensive = true;
				ignorePositiveDefensive = true;
			}
			const ignoreOffensive = !!(move.ignoreOffensive || (ignoreNegativeOffensive && atkBoosts < 0));
			const ignoreDefensive = !!(move.ignoreDefensive || (ignorePositiveDefensive && defBoosts > 0));
	
			if (ignoreOffensive) {
				this.debug('Negating (sp)atk boost/penalty.');
				atkBoosts = 0;
			}
			if (ignoreDefensive) {
				this.debug('Negating (sp)def boost/penalty.');
				defBoosts = 0;
			}
	
			if (move.useTargetOffensive) {
				attack = defender.calculateStat(attackStat, atkBoosts);
			} else {
				attack = attacker.calculateStat(attackStat, atkBoosts);
			}
	
			attackStat = (category === 'Physical' ? 'atk' : 'spa');
			defense = defender.calculateStat(defenseStat, defBoosts);
	
			// Apply Stat Modifiers
			attack = this.runEvent('Modify' + statTable[attackStat], attacker, defender, move, attack);
			defense = this.runEvent('Modify' + statTable[defenseStat], defender, attacker, move, defense);
	
			if (this.gen <= 4 && ['explosion', 'selfdestruct'].includes(move.id) && defenseStat === 'def') {
				defense = this.clampIntRange(Math.floor(defense / 2), 1);
			}
	
			const tr = this.trunc;
	
			// int(int(int(2 * L / 5 + 2) * A * P / D) / 50);
			const baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50);
	
			// Calculate damage modifiers separately (order differs between generations)
			return this.modifyDamage(baseDamage, pokemon, target, move, suppressMessages);
		},
		getAbility() {
			const item = this.battle.dex.items.get(this.ability);
			return item.exists ? item as Effect as Ability : this.battle.dex.abilities.get(this.ability);
		},
		hasItem(item) {
			if (this.ignoringItem()) return false;
			if (!Array.isArray(item)) {
				item = this.battle.toID(item);
				return item === this.item || item === this.ability;
			}
			item = item.map(this.battle.toID);
			return item.includes(this.item) || item.includes(this.ability);
		},
		eatItem() {
			if (!this.hp || !this.isActive) return false;
			const source = this.battle.event.target;
			const item = this.battle.effect;
			if (this.battle.runEvent('UseItem', this, null, null, item) && this.battle.runEvent('TryEatItem', this, null, null, item)) {
				this.battle.add('-enditem', this, item, '[eat]');
	
				this.battle.singleEvent('Eat', item, this.itemData, this, source, item);
				this.battle.runEvent('EatItem', this, null, null, item);
	
				if (this.item === item.id) {
					this.lastItem = this.item;
					this.item = '';
					this.itemData = {id: '', target: this};
				}
				if (this.ability === item.id) {
					this.lastItem = this.ability;
					this.baseAbility = this.ability = '';
					this.abilityData = {id: '', target: this};
				}
				this.usedItemThisTurn = true;
				this.ateBerry = true;
				this.battle.runEvent('AfterUseItem', this, null, null, item);
				return true;
			}
			return false;
		},
		useItem(unused, source) {
			const item = this.battle.effect as Item;
			if ((!this.hp && !item.isGem) || !this.isActive) return false;
			if (!source && this.battle.event && this.battle.event.target) source = this.battle.event.target;
			if (this.battle.runEvent('UseItem', this, null, null, item)) {
				switch (item.id) {
				case 'redcard':
					this.battle.add('-enditem', this, item, '[of] ' + source);
					break;
				default:
					if (!item.isGem) {
						this.battle.add('-enditem', this, item);
					}
					break;
				}
	
				this.battle.singleEvent('Use', item, this.itemData, this, source, item);
	
				if (this.item === item.id) {
					this.lastItem = this.item;
					this.item = '';
					this.itemData = {id: '', target: this};
				}
				if (this.ability === item.id) {
					this.lastItem = this.ability;
					this.baseAbility = this.ability = '';
					this.abilityData = {id: '', target: this};
				}
				this.usedItemThisTurn = true;
				this.battle.runEvent('AfterUseItem', this, null, null, item);
				return true;
			}
			return false;
		},
		setAbility(ability, source, isFromFormeChange) {
			if (this.battle.dex.items.get(this.ability).exists) return false;
			return Object.getPrototypeOf(this).setAbility.call(this, ability, source, isFromFormeChange);
		},
		takeDual(source) {
			if (!this.isActive) return false;
			if (!this.ability) return false;
			if (!source) source = this;
			const dual = this.getAbility() as any as Item;
			if (dual.effectType !== 'Item') return false;
			if (this.battle.runEvent('TakeItem', this, source, null, dual)) {
				this.baseAbility = this.ability = '';
				this.abilityData = {id: '', target: this};
				return dual;
			}
			return false;
		},
	},

	/*
	pokemon: {
        hasAbility(ability) {
            if (this.ignoringAbility()) return false;
            ability = toID(ability);
            return this.ability === ability || !!this.volatiles['ability' + ability];
            if(this.ability === 'powerofalchemy'){
                return this.species.abilities.some(checkAbility => toID(checkAbility) === ability || !!this.volatiles['ability' + toID(checkAbility)]);
            }
        },
		transformInto(pokemon, effect) {
			let template = pokemon.template;
			if (pokemon.fainted || pokemon.illusion || (pokemon.volatiles['substitute'] && this.battle.gen >= 5)) {
				return false;
			}
			if (!template.abilities || (pokemon && pokemon.transformed && this.battle.gen >= 2) || (this.transformed && this.battle.gen >= 5)) {
				return false;
			}
			if (!this.formeChange(template, null)) {
				return false;
			}
			this.transformed = true;

			this.types = pokemon.types;
			this.addedType = pokemon.addedType;
			this.knownType = this.side === pokemon.side && pokemon.knownType;

			for (let statName in this.stats) {
				this.stats[statName] = pokemon.stats[statName];
			}
			this.moveSlots = [];
			this.set.ivs = (this.battle.gen >= 5 ? this.set.ivs : pokemon.set.ivs);
			this.hpType = (this.battle.gen >= 5 ? this.hpType : pokemon.hpType);
			this.hpPower = (this.battle.gen >= 5 ? this.hpPower : pokemon.hpPower);
			for (let i = 0; i < pokemon.moveSlots.length; i++) {
				let moveData = pokemon.moveSlots[i];
				let moveName = moveData.move;
				if (moveData.id === 'hiddenpower') {
					moveName = 'Hidden Power ' + this.hpType;
				}
				this.moveSlots.push({
					move: moveName,
					id: moveData.id,
					pp: moveData.maxpp === 1 ? 1 : 5,
					maxpp: this.battle.gen >= 5 ? (moveData.maxpp === 1 ? 1 : 5) : moveData.maxpp,
					target: moveData.target,
					disabled: false,
					used: false,
					virtual: true,
				});
			}
			for (let j in pokemon.boosts) {
				// @ts-ignore
				this.boosts[j] = pokemon.boosts[j];
			}
			if (effect) {
				this.battle.add('-transform', this, pokemon, '[from] ' + effect.fullname);
			} else {
				this.battle.add('-transform', this, pokemon);
			}
			this.setAbility(pokemon.ability, this, true);
			if (this.innates) {
				for (let innate of this.innates) {
					this.removeVolatile('ability' + innate);
				}
			}
			if (pokemon.innates) {
				for (let innate of pokemon.innates) {
					this.addVolatile('ability' + innate, this);
				}
			}
			return true;
		},
	},
*/

	init() {
		/*
		for (const id in this.dataCache.Pokedex) {
			const poke = this.dataCache.Pokedex[id];
			if (poke.restrictedLearnset) {
				console.log(this.toID(poke.name));
				const thisPoke = this.toID(poke.name);
				const learnset = this.dataCache.Learnsets[this.toID(poke.name)].learnset;
				for (const move in learnset) {
					console.log(thisPoke + " has " + move);
					const moveid = this.dataCache.Moves[move];
					if (moveid.isNonstandard) {
						console.log(moveid.isNonstandard);
						delete this.modData('Learnsets', thisPoke).learnset.moveid;
					}
				}
			}
		}
*/

// Kabuto-Ancient
		this.modData("Learnsets", "kabutoancient").learnset.recover = ["9L1"];
		this.modData("Learnsets", "kabutoancient").learnset.drainingkiss = ["9L1"];
		// Kabutops-Ancient
		this.modData("Learnsets", "kabutopsancient").learnset.playrough = ["9L1"];
		// Omanyte-Ancient
		this.modData("Learnsets", "omanyteancient").learnset.acid = ["9L1"];
		this.modData("Learnsets", "omanyteancient").learnset.poisonfang = ["9L1"];
		this.modData("Learnsets", "omanyteancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "omanyteancient").learnset.sludge = ["9L1"];
		this.modData("Learnsets", "omanyteancient").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "omanyteancient").learnset.toxicspikes = ["9L1"];
		delete this.modData('Learnsets', 'omanyteancient').learnset.ancientpower;
		delete this.modData('Learnsets', 'omanyteancient').learnset.meteorbeam;
		delete this.modData('Learnsets', 'omanyteancient').learnset.rockblast;
		delete this.modData('Learnsets', 'omanyteancient').learnset.rockpolish;
		delete this.modData('Learnsets', 'omanyteancient').learnset.rockslide;
		delete this.modData('Learnsets', 'omanyteancient').learnset.rockthrow;
		delete this.modData('Learnsets', 'omanyteancient').learnset.rocktomb;
		delete this.modData('Learnsets', 'omanyteancient').learnset.rollout;
		delete this.modData('Learnsets', 'omanyteancient').learnset.sandstorm;
		delete this.modData('Learnsets', 'omanyteancient').learnset.shellsmash;
		delete this.modData('Learnsets', 'omanyteancient').learnset.smackdown;
		delete this.modData('Learnsets', 'omanyteancient').learnset.spikes;
		delete this.modData('Learnsets', 'omanyteancient').learnset.stealthrock;
		// Omastar-Ancient
		this.modData("Learnsets", "omastarancient").learnset.agility = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.dragondance = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.leechlife = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.psychicfangs = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "omastarancient").learnset.venomdrain = ["9L1"];
		delete this.modData('Learnsets', 'omastarancient').learnset.ancientpower;
		delete this.modData('Learnsets', 'omastarancient').learnset.meteorbeam;
		delete this.modData('Learnsets', 'omastarancient').learnset.rockblast;
		delete this.modData('Learnsets', 'omastarancient').learnset.rockpolish;
		delete this.modData('Learnsets', 'omastarancient').learnset.rockslide;
		delete this.modData('Learnsets', 'omastarancient').learnset.rockthrow;
		delete this.modData('Learnsets', 'omastarancient').learnset.rocktomb;
		delete this.modData('Learnsets', 'omastarancient').learnset.sandstorm;
		delete this.modData('Learnsets', 'omastarancient').learnset.shellsmash;
		delete this.modData('Learnsets', 'omastarancient').learnset.smackdown;
		delete this.modData('Learnsets', 'omastarancient').learnset.spikes;
		delete this.modData('Learnsets', 'omastarancient').learnset.stealthrock;
		delete this.modData('Learnsets', 'omastarancient').learnset.stoneedge;
		// Aerodactyl-Ancient
		this.modData("Learnsets", "aerodactylancient").learnset.terrorsoar = ["9L1"];
		delete this.modData('Learnsets', 'aerodactylancient').learnset.ancientpower;
		delete this.modData('Learnsets', 'aerodactylancient').learnset.earthquake;
		// Armaldo-Ancient
		this.modData("Learnsets", "armaldoancient").learnset.closecombat = ["9L1"];
		this.modData("Learnsets", "armaldoancient").learnset.uturn = ["9L1"];
		// Cradily-Ancient
		this.modData("Learnsets", "cradilyancient").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "cradilyancient").learnset.scald = ["9L1"];
		// Torkoal-Pottery
		this.modData("Learnsets", "torkoalpottery").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "torkoalpottery").learnset.scald = ["9L1"];
		this.modData("Learnsets", "torkoalpottery").learnset.wish = ["9L1"];
		delete this.modData('Learnsets', 'torkoalpottery').learnset.ancientpower;
		delete this.modData('Learnsets', 'torkoalpottery').learnset.stoneedge;
		delete this.modData('Learnsets', 'torkoalpottery').learnset.superpower;
		// Relicanth-Scorched
		this.modData("Learnsets", "relicanthscorched").learnset.ember = ["9L1"];
		this.modData("Learnsets", "relicanthscorched").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "relicanthscorched").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "relicanthscorched").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "relicanthscorched").learnset.scorchedpebbles = ["9L1"];
		// Swinub-Ancient
		this.modData("Learnsets", "swinubancient").learnset.tarpit = ["9L1"];
		delete this.modData('Learnsets', 'swinubancient').learnset.bulldoze;
		delete this.modData('Learnsets', 'swinubancient').learnset.dig;
		delete this.modData('Learnsets', 'swinubancient').learnset.earthpower;
		delete this.modData('Learnsets', 'swinubancient').learnset.earthquake;
		delete this.modData('Learnsets', 'swinubancient').learnset.fissure;
		delete this.modData('Learnsets', 'swinubancient').learnset.mudshot;
		delete this.modData('Learnsets', 'swinubancient').learnset.mudslap;
		delete this.modData('Learnsets', 'swinubancient').learnset.sandtomb;
		// Piloswine-Ancient
		this.modData("Learnsets", "piloswineancient").learnset.acidspray = ["9L1"];
		this.modData("Learnsets", "piloswineancient").learnset.acidarmor = ["9L1"];
		this.modData("Learnsets", "piloswineancient").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "piloswineancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "piloswineancient").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "piloswineancient").learnset.tarpit = ["9L1"];
		this.modData("Learnsets", "piloswineancient").learnset.tarshot = ["9L1"];
		delete this.modData('Learnsets', 'piloswineancient').learnset.bulldoze;
		delete this.modData('Learnsets', 'piloswineancient').learnset.dig;
		delete this.modData('Learnsets', 'piloswineancient').learnset.earthpower;
		delete this.modData('Learnsets', 'piloswineancient').learnset.earthquake;
		delete this.modData('Learnsets', 'piloswineancient').learnset.fissure;
		delete this.modData('Learnsets', 'piloswineancient').learnset.highhorsepower;
		delete this.modData('Learnsets', 'piloswineancient').learnset.mudshot;
		delete this.modData('Learnsets', 'piloswineancient').learnset.mudslap;
		delete this.modData('Learnsets', 'piloswineancient').learnset.sandtomb;
		delete this.modData('Learnsets', 'piloswineancient').learnset.stompingtantrum;
		// Mamoswine-Ancient
		this.modData("Learnsets", "mamoswineancient").learnset.acidarmor = ["9L1"];
		this.modData("Learnsets", "mamoswineancient").learnset.acidspray = ["9L1"];
		this.modData("Learnsets", "mamoswineancient").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "mamoswineancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "mamoswineancient").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "mamoswineancient").learnset.tarpit = ["9L1"];
		this.modData("Learnsets", "mamoswineancient").learnset.tarshot = ["9L1"];
		delete this.modData('Learnsets', 'mamoswineancient').learnset.bulldoze;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.dig;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.earthpower;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.fissure;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.highhorsepower;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.mudshot;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.mudslap;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.sandtomb;
		delete this.modData('Learnsets', 'mamoswineancient').learnset.stompingtantrum;
		// Dodrumb
		this.modData("Learnsets", "dodrumb").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.attract = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.curse = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.defensecurl = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.defog = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.dig = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.dreameater = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.endure = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.expandingforce = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.facade = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.hypervoice = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.protect = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.rest = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.roost = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.round = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.snore = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.teleport = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.toxic = ["9L1"];
		// Blossobite
		this.modData("Learnsets", "blossobite").learnset.attract = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.electroball = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.endure = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.facade = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.growth = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.jawlock = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.protect = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.rest = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.risingvoltage = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.round = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.screech = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.skittersmack = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.snarl = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.snore = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.suckerpunch = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.zapcannon = ["9L1"];
		// Ghoulipinch
		this.modData("Learnsets", "ghoulipinch").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.ominouswind = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.poltergeist = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.scald = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.toxicthread = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.venomdrench = ["9L1"];
		// Ghoulpion
		this.modData("Learnsets", "ghoulpion").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.ominouswind = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.poltergeist = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.scald = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.toxicthread = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.venomdrench = ["9L1"];
		// Cranidos-Cretaceous
		this.modData("Learnsets", "cranidoscretaceous").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.wildcharge = ["9L1"];
		// Rampardos-Cretaceous
		this.modData("Learnsets", "rampardoscretaceous").learnset.headcharge = ["9L1"];
		this.modData("Learnsets", "rampardoscretaceous").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "rampardoscretaceous").learnset.wildcharge = ["9L1"];
		// Shieldon-Ancient
		this.modData("Learnsets", "shieldonancient").learnset.mossysurprise = ["9L1"];
		delete this.modData('Learnsets', 'shieldonancient').learnset.knockoff;
		// Bastiodon-Ancient
		this.modData("Learnsets", "bastiodonancient").learnset.mossysurprise = ["9L1"];
		delete this.modData('Learnsets', 'bastiodonancient').learnset.knockoff;
		// Tirtouga-Leatherback
		this.modData("Learnsets", "tirtougaleatherback").learnset.pursuit = ["9L1"];
		// Carracosta-Leatherback
		this.modData("Learnsets", "carracostaleatherback").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "carracostaleatherback").learnset.suckerpunch = ["9L1"];
		// Archen-Ancient
		this.modData("Learnsets", "archenancient").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "archenancient").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "archenancient").learnset.playrough = ["9L1"];
		this.modData("Learnsets", "archenancient").learnset.roost = ["9L1"];
		delete this.modData('Learnsets', 'archenancient').learnset.ancientpower;
		delete this.modData('Learnsets', 'archenancient').learnset.earthpower;
		delete this.modData('Learnsets', 'archenancient').learnset.headsmash;
		delete this.modData('Learnsets', 'archenancient').learnset.meteorbeam;
		delete this.modData('Learnsets', 'archenancient').learnset.rockblast;
		delete this.modData('Learnsets', 'archenancient').learnset.rockpolish;
		delete this.modData('Learnsets', 'archenancient').learnset.rockslide;
		delete this.modData('Learnsets', 'archenancient').learnset.rockthrow;
		delete this.modData('Learnsets', 'archenancient').learnset.rocktomb;
		delete this.modData('Learnsets', 'archenancient').learnset.sandstorm;
		delete this.modData('Learnsets', 'archenancient').learnset.smackdown;
		delete this.modData('Learnsets', 'archenancient').learnset.stealthrock;
		delete this.modData('Learnsets', 'archenancient').learnset.stoneedge;
		// Archeops-Ancient
		this.modData("Learnsets", "archeopsancient").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "archeopsancient").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "archeopsancient").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "archeopsancient").learnset.roost = ["9L1"];
		this.modData("Learnsets", "archeopsancient").learnset.playrough = ["9L1"];
		delete this.modData('Learnsets', 'archeopsancient').learnset.ancientpower;
		delete this.modData('Learnsets', 'archeopsancient').learnset.earthpower;
		delete this.modData('Learnsets', 'archeopsancient').learnset.headsmash;
		delete this.modData('Learnsets', 'archeopsancient').learnset.meteorbeam;
		delete this.modData('Learnsets', 'archeopsancient').learnset.rockblast;
		delete this.modData('Learnsets', 'archeopsancient').learnset.rockpolish;
		delete this.modData('Learnsets', 'archeopsancient').learnset.rockslide;
		delete this.modData('Learnsets', 'archeopsancient').learnset.rockthrow;
		delete this.modData('Learnsets', 'archeopsancient').learnset.rocktomb;
		delete this.modData('Learnsets', 'archeopsancient').learnset.sandstorm;
		delete this.modData('Learnsets', 'archeopsancient').learnset.smackdown;
		delete this.modData('Learnsets', 'archeopsancient').learnset.stealthrock;
		delete this.modData('Learnsets', 'archeopsancient').learnset.stoneedge;
		// Tyrunt-Apex
		this.modData("Learnsets", "tyruntapex").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "tyruntapex").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "tyruntapex").learnset.heavyslam = ["9L1"];
		this.modData("Learnsets", "tyruntapex").learnset.swordsdance = ["9L1"];
		delete this.modData('Learnsets', 'tyruntapex').learnset.ancientpower;
		delete this.modData('Learnsets', 'tyruntapex').learnset.dragondance;
		delete this.modData('Learnsets', 'tyruntapex').learnset.rockblast;
		// Tyrantrum-Apex
		this.modData("Learnsets", "tyrantrumapex").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "tyrantrumapex").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "tyrantrumapex").learnset.heavyslam = ["9L1"];
		this.modData("Learnsets", "tyrantrumapex").learnset.swordsdance = ["9L1"];
		delete this.modData('Learnsets', 'tyrantrumapex').learnset.ancientpower;
		delete this.modData('Learnsets', 'tyrantrumapex').learnset.rockblast;
		// Amaura-Regnant
		this.modData("Learnsets", "amauraregnant").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "amauraregnant").learnset.howlingaurora = ["9L1"];
		this.modData("Learnsets", "amauraregnant").learnset.moonlight = ["9L1"];
		// Aurorus-Regnant
		this.modData("Learnsets", "aurorusregnant").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "aurorusregnant").learnset.howlingaurora = ["9L1"];
		this.modData("Learnsets", "aurorusregnant").learnset.mistyterrain = ["9L1"];
		this.modData("Learnsets", "aurorusregnant").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "aurorusregnant").learnset.moonlight = ["9L1"];
		// Shellos-Entity
		this.modData("Learnsets", "shellosentity").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "shellosentity").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "shellosentity").learnset.sludgewave = ["9L1"];
		delete this.modData('Learnsets', 'shellosentity').learnset.earthpower;
		delete this.modData('Learnsets', 'shellosentity').learnset.fissure;
		delete this.modData('Learnsets', 'shellosentity').learnset.mudshot;
		delete this.modData('Learnsets', 'shellosentity').learnset.mudslap;
		delete this.modData('Learnsets', 'shellosentity').learnset.scald;
		// Gastrodon-West-Entity
		this.modData("Learnsets", "gastrodonwestentity").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.dragonrage = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.twister = ["9L1"];
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.bulldoze;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.dig;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.earthpower;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.earthquake;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.fissure;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.mudshot;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.mudslap;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.sandtomb;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.scald;
		delete this.modData('Learnsets', 'gastrodonwestentity').learnset.stompingtantrum;
		// Gastrodon-East-Entity
		this.modData("Learnsets", "gastrodoneastentity").learnset.confusion = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.psybeam = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.psyshock = ["9L1"];
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.bulldoze;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.dig;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.earthpower;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.earthquake;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.fissure;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.mudshot;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.mudslap;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.sandtomb;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.scald;
		delete this.modData('Learnsets', 'gastrodoneastentity').learnset.stompingtantrum;
		// Yanma-Ancient
		this.modData("Learnsets", "yanmaancient").learnset.agility = ["9L1"];
		this.modData("Learnsets", "yanmaancient").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "yanmaancient").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "yanmaancient").learnset.hyperfang = ["9L1"];
		this.modData("Learnsets", "yanmaancient").learnset.poisonfang = ["9L1"];
		delete this.modData('Learnsets', 'yanmaancient').learnset.psychic;
		delete this.modData('Learnsets', 'yanmaancient').learnset.shadowball;
		// Yanmega-Ancient
		this.modData("Learnsets", "yanmegaancient").learnset.agility = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.crosschop = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.hyperfang = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.jawforce = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.jawlock = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.poisonfang = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.thunderfang = ["9L1"];
		delete this.modData('Learnsets', 'yanmegaancient').learnset.psychic;
		delete this.modData('Learnsets', 'yanmegaancient').learnset.shadowball;
		// Tangela-Ancient
		this.modData("Learnsets", "tangelaancient").learnset.ember = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.firelash = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.willowisp = ["9L1"];
		// Tangrowth-Ancient
		this.modData("Learnsets", "tangrowthancient").learnset.ember = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.firelash = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.willowisp = ["9L1"];
		// Liluǒ
		this.modData("Learnsets", "liluǒ").learnset.attract = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.electricterrain = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.ember = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.endure = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.facade = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.howl = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.protect = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.rest = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.round = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.scorchedpebbles = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.snore = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.spark = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.swagger = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.willowisp = ["9L1"];
		// Flaruǒ
		this.modData("Learnsets", "flaruǒ").learnset.attract = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.electricterrain = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.ember = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.endure = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.facade = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.howl = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.protect = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.rest = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.roar = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.round = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.scorchedpebbles = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.snore = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.spark = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.swagger = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.willowisp = ["9L1"];
		// Alohwo
		this.modData("Learnsets", "alohwo").learnset.attract = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.circlethrow = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.electricterrain = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.ember = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.endure = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.facade = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.howl = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.protect = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.rest = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.roar = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.round = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.scorchedpebbles = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.snore = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.spark = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.swagger = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.tarshot = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.volttackle = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.willowisp = ["9L1"];
		// Wonkway
		this.modData("Learnsets", "wonkway").learnset.allyswitch = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.attract = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.confusion = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.constrict = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.destinybond = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.dreameater = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.embargo = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.endure = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.expandingforce = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.extrasensory = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.facade = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.feintattack = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.fellstinger = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.flash = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.foulplay = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.gravity = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.imprison = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.magiccoat = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.magicroom = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.mimic = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.naturalgift = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.payback = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.powerswap = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.protect = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.psybeam = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.psywave = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.quash = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.recycle = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.rest = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.return = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.round = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.secretpower = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.skillswap = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.snatch = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.snore = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.spite = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.swift = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.synchronoise = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.telekinesis = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.topsyturvy = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.torment = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.trickroom = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.wonderroom = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.zenheadbutt = ["9L1"];
		// Illusinogen
		this.modData("Learnsets", "illusinogen").learnset.allyswitch = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.attract = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.confusion = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.constrict = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.destinybond = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.dreameater = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.embargo = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.endure = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.expandingforce = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.extrasensory = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.facade = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.feintattack = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.fellstinger = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.fierydance = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.flash = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.foulplay = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.gravity = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.imprison = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.magiccoat = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.magicroom = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.mimic = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.naturalgift = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.payback = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.powerswap = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.protect = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.psybeam = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.psywave = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.quash = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.recycle = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.rest = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.round = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.secretpower = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.signalbeam = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.skillswap = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.snatch = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.snore = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.spite = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.swift = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.synchronoise = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.telekinesis = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.topsyturvy = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.torment = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.trickroom = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.wonderroom = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.zenheadbutt = ["9L1"];
		// Robusteel
		this.modData("Learnsets", "robusteel").learnset.acrobatics = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.airslash = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.autotomize = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.bulkup = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.defog = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.doomdesire = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.drillpeck = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.facade = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.haze = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.hurricane = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.irondefense = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.protect = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.rest = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.return = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.roost = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.tailwind = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.uturn = ["9L1"];
		// Velovolt
		this.modData("Learnsets", "velovolt").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.boltbeak = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.charge = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.charm = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.discharge = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.electroball = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.endure = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.extremespeed = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.facade = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.firespin = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.lowkick = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.megakick = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.megapunch = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.mistyexplosion = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.playrough = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.protect = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.rest = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.risingvoltage = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.round = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.slam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.snore = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.sweetkiss = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.thunderpunch = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.thundershock = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.wildcharge = ["9L1"];
		// Vishcaca
		this.modData("Learnsets", "vishcaca").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.bite = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.dive = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.facade = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.fishiousrend = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.leechlife = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.psychicfangs = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.superfang = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.waterfall = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.zenheadbutt = ["9L1"];
		// Dracosaur
		this.modData("Learnsets", "dracosaur").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.endure = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.facade = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.lowkick = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.megakick = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.protect = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.rest = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.round = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.scaleshot = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.scorchingsands = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.snore = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.stomp = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.tackle = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.tailspike = ["9L1"];
		// Gorlifross
		this.modData("Learnsets", "gorlifross").learnset.acrobatics = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.aircutter = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.airslash = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.aurorabeam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.avalanche = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.blizzard = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.defog = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.dualwingbeat = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.endure = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.facade = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.featherdance = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.frostbreath = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.hail = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.haze = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.icepunch = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.iceshard = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.iciclespear = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.icywind = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.mirrormove = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.mist = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.peck = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.powdersnow = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.protect = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rest = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.roost = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.round = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.skyattack = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.skydrop = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.snore = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.surf = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.tailwind = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.uturn = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.wingattack = ["9L1"];
		// Arctachoris
		this.modData("Learnsets", "arctachoris").learnset.acrobatics = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.aircutter = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.airslash = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.aurorabeam = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.avalanche = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.blizzard = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.defog = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.drillpeck = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.dualwingbeat = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.endure = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.facade = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.featherdance = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.freezedry = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.frostbreath = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.glacialgale = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.hail = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.haze = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.hurricane = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.hydropump = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.icepunch = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.iceshard = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.iciclespear = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.icywind = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.knockoffmeteorbeam = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.mirrormove = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.mist = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.powdersnow = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.peck = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.protect = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.rest = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.roost = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.round = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.sheercold = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.skyattack = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.skydrop = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.snore = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.surf = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.tailwind = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.tripleaxel = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.uturn = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.wingattack = ["9L1"];
		// Dreepy-Luminous
		this.modData("Learnsets", "dreepyluminous").learnset.sludgebomb = ["9L1"];
		delete this.modData('Learnsets', 'dreepyluminous').learnset.dracometeor;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.dragondarts;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.fireblast;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.hydropump;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.scald;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.surf;
		// Drakloak-Luminous
		this.modData("Learnsets", "drakloakluminous").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.voltswitch = ["9L1"];
		delete this.modData('Learnsets', 'drakloakluminous').learnset.dracometeor;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.dragondarts;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.fireblast;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.hydropump;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.scald;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.surf;
		// Dragapult-Luminous
		this.modData("Learnsets", "dragapultluminous").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.luminousdarts = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.wildcharge = ["9L1"];
		delete this.modData('Learnsets', 'dragapultluminous').learnset.dracometeor;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.dragondarts;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.fireblast;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.hydropump;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.scald;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.surf;
		// Larvitar-Nature
		this.modData("Learnsets", "larvitarnature").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "larvitarnature").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "larvitarnature").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "larvitarnature").learnset.seedbomb = ["9L1"];
		delete this.modData('Learnsets', 'larvitarnature').learnset.rockpolish;
		delete this.modData('Learnsets', 'larvitarnature').learnset.stealthrock;
		delete this.modData('Learnsets', 'larvitarnature').learnset.stoneedge;
		delete this.modData('Learnsets', 'larvitarnature').learnset.superpower;
		// Pupitar-Nature
		this.modData("Learnsets", "pupitarnature").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "pupitarnature").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "pupitarnature").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "pupitarnature").learnset.seedbomb = ["9L1"];
		delete this.modData('Learnsets', 'pupitarnature').learnset.rockpolish;
		delete this.modData('Learnsets', 'pupitarnature').learnset.stealthrock;
		delete this.modData('Learnsets', 'pupitarnature').learnset.stoneedge;
		delete this.modData('Learnsets', 'pupitarnature').learnset.superpower;
		// Tyranitar-Nature
		this.modData("Learnsets", "tyranitarnature").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.woodhammer = ["9L1"];
		delete this.modData('Learnsets', 'tyranitarnature').learnset.dragondance;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.fireblast;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.focusblast;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.rockpolish;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.stealthrock;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.stoneedge;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.superpower;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.thunder;
		// Gible-Persistent
		this.modData("Learnsets", "giblepersistent").learnset.astonish = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.counter = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.dive = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.phantomforce = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.skullbash = ["9L1"];
		delete this.modData('Learnsets', 'giblepersistent').learnset.dracometeor;
		delete this.modData('Learnsets', 'giblepersistent').learnset.fireblast;
		// Gabite-Persistent
		this.modData("Learnsets", "gabitepersistent").learnset.astonish = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.counter = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.dive = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.phantomforce = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.skullbash = ["9L1"];
		delete this.modData('Learnsets', 'gabitepersistent').learnset.dracometeor;
		delete this.modData('Learnsets', 'gabitepersistent').learnset.fireblast;
		// Garchomp-Persistent
		this.modData("Learnsets", "garchomppersistent").learnset.astonish = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.counter = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.dive = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.phantomforce = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.skullbash = ["9L1"];
		delete this.modData('Learnsets', 'garchomppersistent').learnset.dracometeor;
		delete this.modData('Learnsets', 'garchomppersistent').learnset.fireblast;
		// Scorcharnia-Average
		this.modData("Learnsets", "scorcharniaaverage").learnset.absorb = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.aquajet = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.aquaring = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.attract = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.bind = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.brine = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.bubblebeam = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.camouflage = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.coil = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.confide = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.constrict = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.crabhammer = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.defog = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.dive = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.doubleteam = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.ember = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.encore = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.endure = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.facade = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.firelash = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.flameburst = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.flash = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.harden = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.healingwish = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.hydropump = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.ingrain = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.lavaplume = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.mimic = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.muddywater = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.powerwhip = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.protect = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.reflecttype = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.rest = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.return = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.round = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.round = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.scald = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.scorchingpebbles = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.snore = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.surf = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.takedown = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.waterfall = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.weatherball = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.willowisp = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.wringout = ["9L1"];
		// Listoxina
		this.modData("Learnsets", "listoxina").learnset.acid = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.acidspray = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.aquaring = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.gastroacid = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.hail = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.hydropump = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.leechlife = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.poisonsting = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.poisontail = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.recover = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.rest = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.return = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.scald = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.sleeptail = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.surf = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.tackle = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.toxicspikes = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.venomdrench = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.venoshock = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.whirlpool = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.wish = ["9L1"];
		// Spinollina
		this.modData("Learnsets", "spinollina").learnset.attract = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.babydolleyes = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.captivate = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.detect = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.discharge = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.ember = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.facade = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.highjumpkick = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.moonlight = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.mudshot = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.poltergeist = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.powergem = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.protect = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.rockthrow = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.rollingkick = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.spark = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.stickkick = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.superdrill = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.thief = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.thunderouskick = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.toxicthread = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.tripleaxel = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.triplekick = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.zingzap = ["9L1"];
		// Plusle-Primal
		this.modData("Learnsets", "plusleprimal").learnset.hex = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.willowisp = ["9L1"];
		// Minun-Primal
		this.modData("Learnsets", "minunprimal").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.gyroball = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.photonball = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.spikes = ["9L1"];
		// Swalot-Primal
		this.modData("Learnsets", "swalotprimal").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.scald = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.tarpit = ["9L1"];
		delete this.modData('Learnsets', 'swalotprimal').learnset.gigadrain;
		// Hariyama-Primal
		this.modData("Learnsets", "hariyamaprimal").learnset.playrough = ["9L1"];
		// Grumpig-Primal
		this.modData("Learnsets", "grumpigprimal").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "grumpigprimal").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "grumpigprimal").learnset.wish = ["9L1"];
		// Trapinch
		this.modData("Learnsets", "trapinch").learnset.trapinch = ["9L1"];
		// Vibrava-Classical
		this.modData("Learnsets", "vibravaclassical").learnset.aurasphere = ["9L1"];
		this.modData("Learnsets", "vibravaclassical").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "vibravaclassical").learnset.healbell = ["9L1"];
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dracometeor;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragonbreath;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragonpulse;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragonrush;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragontail;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.outrage;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.twister;
		// Flygon-Classical
		this.modData("Learnsets", "flygonclassical").learnset.aurasphere = ["9L1"];
		this.modData("Learnsets", "flygonclassical").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "flygonclassical").learnset.healbell = ["9L1"];
		delete this.modData('Learnsets', 'flygonclassical').learnset.breakingswipe;
		delete this.modData('Learnsets', 'flygonclassical').learnset.dracometeor;
		delete this.modData('Learnsets', 'flygonclassical').learnset.dragonbreath;
		delete this.modData('Learnsets', 'flygonclassical').learnset.dragonclaw;
		delete this.modData('Learnsets', 'flygonclassical').learnset.dragonpulse;
		delete this.modData('Learnsets', 'flygonclassical').learnset.dragonrush;
		delete this.modData('Learnsets', 'flygonclassical').learnset.dragontail;
		delete this.modData('Learnsets', 'flygonclassical').learnset.outrage;
		delete this.modData('Learnsets', 'flygonclassical').learnset.scaleshot;
		delete this.modData('Learnsets', 'flygonclassical').learnset.twister;
		// Spheal-Ancient
		delete this.modData('Learnsets', 'sphealancient').learnset.waterfall;
		// Sealeo-Ancient
		this.modData("Learnsets", "sealeoancient").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "sealeoancient").learnset.closecombat = ["9L1"];
		this.modData("Learnsets", "sealeoancient").learnset.moonlight = ["9L1"];
		delete this.modData('Learnsets', 'sealeoancient').learnset.waterfall;
		// Walrein-Ancient
		this.modData("Learnsets", "walreinancient").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "walreinancient").learnset.closecombat = ["9L1"];
		this.modData("Learnsets", "walreinancient").learnset.furioustusks = ["9L1"];
		this.modData("Learnsets", "walreinancient").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "walreinancient").learnset.moonlight = ["9L1"];
		delete this.modData('Learnsets', 'walreinancient').learnset.hydropump;
		delete this.modData('Learnsets', 'walreinancient').learnset.liquidation;
		delete this.modData('Learnsets', 'walreinancient').learnset.waterfall;
		// Whismur-Ancient
		this.modData("Learnsets", "whismurancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "whismurancient").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "whismurancient").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "whismurancient").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "whismurancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "whismurancient").learnset.stoneedge = ["9L1"];
		delete this.modData('Learnsets', 'whismurancient').learnset.raindance;
		delete this.modData('Learnsets', 'whismurancient').learnset.waterpulse;
		// Loudred-Ancient
		this.modData("Learnsets", "loudredancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "loudredancient").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "loudredancient").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "loudredancient").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "loudredancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "loudredancient").learnset.stoneedge = ["9L1"];
		delete this.modData('Learnsets', 'loudredancient').learnset.raindance;
		delete this.modData('Learnsets', 'loudredancient').learnset.waterpulse;
		// Exploud-Ancient
		this.modData("Learnsets", "exploudancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.primevalrock = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.overdrive = ["9L1"];
		delete this.modData('Learnsets', 'exploudancient').learnset.hydropump;
		delete this.modData('Learnsets', 'exploudancient').learnset.raindance;
		delete this.modData('Learnsets', 'exploudancient').learnset.surf;
		delete this.modData('Learnsets', 'exploudancient').learnset.waterpulse;
		delete this.modData('Learnsets', 'exploudancient').learnset.whirlpool;
		// Anklarmor
		this.modData("Learnsets", "anklarmor").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "anklarmor").learnset.spikyshield = ["9L1"];
		this.modData("Learnsets", "anklarmor").learnset.meteorbeam = ["9L1"];
		delete this.modData('Learnsets', 'anklarmor').learnset.basedonprobopassmovepool;
		// Drakabyssal
		this.modData("Learnsets", "drakabyssal").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.icefangs = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.moonlight = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.psychicfangs = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.suckerpunch = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.waterfall = ["9L1"];
		// Trobsidon
		this.modData("Learnsets", "trobsidon").learnset.accelerock = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.attract = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.cut = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dig = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.dualchop = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.endure = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.facade = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.fakeout = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.fling = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.furycutter = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.harden = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.headbutt = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.highjumpkick = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.lowkick = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.megakick = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.metalclaw = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.poisonfang = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.powergem = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.protect = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rest = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rockpolish = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rockthrow = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.round = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.screech = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.shockwave = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.smackdown = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.snore = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.stomp = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.strength = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.tackle = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.takedown = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.uturn = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.zenheadbutt = ["9L1"];
		// Dhelmise-Ancient
		this.modData("Learnsets", "dhelmiseancient").learnset.acidarmor = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.bonerush = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.dig = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.shadowbone = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.spiritshackle = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.toxicspikes = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.venomdrench = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.venoshock = ["9L1"];
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.anchorshot;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.block;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.flashcannon;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.gyroball;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.irondefense;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.metalsound;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.steelroller;
		// Honedge-Ancient
		this.modData("Learnsets", "honedgeancient").learnset.branchpoke = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.growth = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.woodhammer = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.worryseed = ["9L1"];
		delete this.modData('Learnsets', 'honedgeancient').learnset.autotomize;
		delete this.modData('Learnsets', 'honedgeancient').learnset.falseswipe;
		delete this.modData('Learnsets', 'honedgeancient').learnset.flashcannon;
		delete this.modData('Learnsets', 'honedgeancient').learnset.furycutter;
		delete this.modData('Learnsets', 'honedgeancient').learnset.gyroball;
		delete this.modData('Learnsets', 'honedgeancient').learnset.irondefense;
		delete this.modData('Learnsets', 'honedgeancient').learnset.ironhead;
		delete this.modData('Learnsets', 'honedgeancient').learnset.magnetrise;
		delete this.modData('Learnsets', 'honedgeancient').learnset.metalsound;
		delete this.modData('Learnsets', 'honedgeancient').learnset.nightslash;
		delete this.modData('Learnsets', 'honedgeancient').learnset.sacredsword;
		delete this.modData('Learnsets', 'honedgeancient').learnset.shadowclaw;
		delete this.modData('Learnsets', 'honedgeancient').learnset.shockwave;
		delete this.modData('Learnsets', 'honedgeancient').learnset.slash;
		delete this.modData('Learnsets', 'honedgeancient').learnset.steelbeam;
		delete this.modData('Learnsets', 'honedgeancient').learnset.wideguard;
		// Doublade-Ancient
		this.modData("Learnsets", "doubladeancient").learnset.branchpoke = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.drillrun = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.growth = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.woodhammer = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.worryseed = ["9L1"];
		delete this.modData('Learnsets', 'doubladeancient').learnset.autotomize;
		delete this.modData('Learnsets', 'doubladeancient').learnset.falseswipe;
		delete this.modData('Learnsets', 'doubladeancient').learnset.flashcannon;
		delete this.modData('Learnsets', 'doubladeancient').learnset.furycutter;
		delete this.modData('Learnsets', 'doubladeancient').learnset.gyroball;
		delete this.modData('Learnsets', 'doubladeancient').learnset.irondefense;
		delete this.modData('Learnsets', 'doubladeancient').learnset.ironhead;
		delete this.modData('Learnsets', 'doubladeancient').learnset.magnetrise;
		delete this.modData('Learnsets', 'doubladeancient').learnset.metalsound;
		delete this.modData('Learnsets', 'doubladeancient').learnset.nightslash;
		delete this.modData('Learnsets', 'doubladeancient').learnset.sacredsword;
		delete this.modData('Learnsets', 'doubladeancient').learnset.shadowclaw;
		delete this.modData('Learnsets', 'doubladeancient').learnset.shockwave;
		delete this.modData('Learnsets', 'doubladeancient').learnset.slash;
		delete this.modData('Learnsets', 'doubladeancient').learnset.steelbeam;
		delete this.modData('Learnsets', 'doubladeancient').learnset.wideguard;
		// Aegislash-Ancient
		this.modData("Learnsets", "aegislashancient").learnset.branchpoke = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.drillrun = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.flintspear = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.foragerspoise = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.growth = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.woodhammer = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.worryseed = ["9L1"];
		delete this.modData('Learnsets', 'aegislashancient').learnset.autotomize;
		delete this.modData('Learnsets', 'aegislashancient').learnset.falseswipe;
		delete this.modData('Learnsets', 'aegislashancient').learnset.flashcannon;
		delete this.modData('Learnsets', 'aegislashancient').learnset.furycutter;
		delete this.modData('Learnsets', 'aegislashancient').learnset.gyroball;
		delete this.modData('Learnsets', 'aegislashancient').learnset.irondefense;
		delete this.modData('Learnsets', 'aegislashancient').learnset.ironhead;
		delete this.modData('Learnsets', 'aegislashancient').learnset.kingsshield;
		delete this.modData('Learnsets', 'aegislashancient').learnset.magnetrise;
		delete this.modData('Learnsets', 'aegislashancient').learnset.metalsound;
		delete this.modData('Learnsets', 'aegislashancient').learnset.nightslash;
		delete this.modData('Learnsets', 'aegislashancient').learnset.sacredsword;
		delete this.modData('Learnsets', 'aegislashancient').learnset.shadowclaw;
		delete this.modData('Learnsets', 'aegislashancient').learnset.shockwave;
		delete this.modData('Learnsets', 'aegislashancient').learnset.slash;
		delete this.modData('Learnsets', 'aegislashancient').learnset.steelbeam;
		delete this.modData('Learnsets', 'aegislashancient').learnset.wideguard;
		// Baltoy-Premade
		this.modData("Learnsets", "baltoypremade").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.meteorbeam = ["9L1"];
		// Claydol-Premade
		this.modData("Learnsets", "claydolpremade").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.meteorbeam = ["9L1"];
		// Paras-Ancient
		this.modData("Learnsets", "parasancient").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.irondefense = ["9L1"];
		delete this.modData('Learnsets', 'parasancient').learnset.aromatherapy;
		delete this.modData('Learnsets', 'parasancient').learnset.bulletseed;
		delete this.modData('Learnsets', 'parasancient').learnset.energyball;
		delete this.modData('Learnsets', 'parasancient').learnset.grassknot;
		delete this.modData('Learnsets', 'parasancient').learnset.grassyterrain;
		delete this.modData('Learnsets', 'parasancient').learnset.seedbomb;
		delete this.modData('Learnsets', 'parasancient').learnset.solarbeam;
		delete this.modData('Learnsets', 'parasancient').learnset.synthesis;
		delete this.modData('Learnsets', 'parasancient').learnset.worryseed;
		// Parasect-Ancient
		this.modData("Learnsets", "parasectancient").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "parasectancient").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "parasectancient").learnset.irondefense = ["9L1"];
		delete this.modData('Learnsets', 'parasectancient').learnset.aromatherapy;
		delete this.modData('Learnsets', 'parasectancient').learnset.bulletseed;
		delete this.modData('Learnsets', 'parasectancient').learnset.energyball;
		delete this.modData('Learnsets', 'parasectancient').learnset.grassknot;
		delete this.modData('Learnsets', 'parasectancient').learnset.grassyterrain;
		delete this.modData('Learnsets', 'parasectancient').learnset.seedbomb;
		delete this.modData('Learnsets', 'parasectancient').learnset.solarbeam;
		delete this.modData('Learnsets', 'parasectancient').learnset.synthesis;
		delete this.modData('Learnsets', 'parasectancient').learnset.worryseed;
		// Parasinensis
		this.modData("Learnsets", "parasinensis").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "parasinensis").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "parasinensis").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "parasinensis").learnset.aurasphere = ["9L1"];
		this.modData("Learnsets", "parasinensis").learnset.strengthsap = ["9L1"];
		// Girafarig-Ancient
		this.modData("Learnsets", "girafarigancient").learnset.dig = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.mudshot = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.scorchingsands = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.smackdown = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.superpower = ["9L1"];
		delete this.modData('Learnsets', 'girafarigancient').learnset.allyswitch;
		delete this.modData('Learnsets', 'girafarigancient').learnset.calmmind;
		delete this.modData('Learnsets', 'girafarigancient').learnset.confusion;
		delete this.modData('Learnsets', 'girafarigancient').learnset.dazzlinggleam;
		delete this.modData('Learnsets', 'girafarigancient').learnset.dreameater;
		delete this.modData('Learnsets', 'girafarigancient').learnset.futuresight;
		delete this.modData('Learnsets', 'girafarigancient').learnset.gravity;
		delete this.modData('Learnsets', 'girafarigancient').learnset.guardswap;
		delete this.modData('Learnsets', 'girafarigancient').learnset.lightscreen;
		delete this.modData('Learnsets', 'girafarigancient').learnset.magiccoat;
		delete this.modData('Learnsets', 'girafarigancient').learnset.mirrorcoat;
		delete this.modData('Learnsets', 'girafarigancient').learnset.powerswap;
		delete this.modData('Learnsets', 'girafarigancient').learnset.psybeam;
		delete this.modData('Learnsets', 'girafarigancient').learnset.psychic;
		delete this.modData('Learnsets', 'girafarigancient').learnset.psychicterrain;
		delete this.modData('Learnsets', 'girafarigancient').learnset.psyshock;
		delete this.modData('Learnsets', 'girafarigancient').learnset.reflect;
		delete this.modData('Learnsets', 'girafarigancient').learnset.skillswap;
		delete this.modData('Learnsets', 'girafarigancient').learnset.trickroom;
		// Oligosogilo
		this.modData("Learnsets", "oligosogilo").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.bulkup = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.crushclaw = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.firepunch = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.hammerarm = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.icehammer = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.icepunch = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.nightslash = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.slash = ["9L1"];
		// Poochyena-Ancient
		this.modData("Learnsets", "poochyenaancient").learnset.burningjealousy = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.charm = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.flatter = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.trick = ["9L1"];
		delete this.modData('Learnsets', 'poochyenaancient').learnset.astonish;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.confide;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.counter;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.doubleteam;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.mimic;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.swagger;
		// Mightyena-Ancient
		this.modData("Learnsets", "mightyenaancient").learnset.burningjealousy = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.charm = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.flatter = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.trick = ["9L1"];
		delete this.modData('Learnsets', 'mightyenaancient').learnset.astonish;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.confide;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.counter;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.doubleteam;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.mimic;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.swagger;
		// Matriaryena
		this.modData("Learnsets", "matriaryena").learnset.bonerush = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.jawlock = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.psychicfangs = ["9L1"];
		// Teenizino
		this.modData("Learnsets", "teenizino").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.attract = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.confide = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.counter = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.cut = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.detect = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dig = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dualchop = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.endeavor = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.endure = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.facade = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.falseswipe = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.feint = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.firstimpression = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.fling = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.furycutter = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.furyswipes = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.guillotine = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.laserfocus = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.leer = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.payback = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.peck = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.protect = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.razorwind = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.rest = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.return = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.roar = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.round = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.scratch = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.shockwave = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.slash = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.snore = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.strength = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.voltswitch = ["9L1"];
		// Terrorzino
		this.modData("Learnsets", "terrorzino").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.attract = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.confide = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.counter = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.crosspoison = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.crushclaw = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.cut = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.detect = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dig = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dualchop = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.endeavor = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.endure = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.facade = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.falseswipe = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.feint = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.firstimpression = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.fling = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.furycutter = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.furyswipes = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.guillotine = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.laserfocus = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.leer = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.metalclaw = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.nightslash = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.payback = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.peck = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.protect = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.razorwind = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.rest = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.return = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.roar = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.round = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.scratch = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.shockwave = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.slash = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.smartstrike = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.snore = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.strength = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.surf = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.xscissor = ["9L1"];
		// Sailad
		this.modData("Learnsets", "sailad").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.attract = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.beatup = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.bite = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.confide = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.counter = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.curse = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.cut = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.dig = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.ember = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.endure = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.facade = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.firespin = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.inferno = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.leer = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.meanlook = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.nastyplot = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.payback = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.protect = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.rest = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.retaliate = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.roar = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.round = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.sandattack = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.snore = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.spite = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.thief = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.thrash = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.torment = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.willowisp = ["9L1"];
		// Pharaocious
		this.modData("Learnsets", "pharaocious").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.attract = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.beatup = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.bite = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.block = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.burningjealousy = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.confide = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.counter = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.curse = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.cut = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dig = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.ember = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.endure = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.facade = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.firespin = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.foulplay = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.inferno = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.leer = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.meanlook = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.nastyplot = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.payback = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.powertrip = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.protect = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.rest = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.retaliate = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.revenge = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.roar = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.round = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.sandattack = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.scaleshot = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.scorchingsands = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.smackdown = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.snarl = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.snore = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.spite = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.strength = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.thief = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.thrash = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.torment = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.willowisp = ["9L1"];
		// Honkeri
		this.modData("Learnsets", "honkeri").learnset.absorb = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.attract = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.boomburst = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.bubblebeam = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.bulletseed = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.confide = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.defog = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.disarmingvoice = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dive = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.echoedvoice = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.endure = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.facade = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.grassyterrain = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.healingwish = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.hornattack = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.hypervoice = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.muddywater = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.payback = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.protect = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.rest = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.roar = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.round = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.snore = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.supersonic = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.vinewhip = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.whirlpool = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.workup = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.worryseed = ["9L1"];
		// Melophus
		this.modData("Learnsets", "melophus").learnset.absorb = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.attract = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.boomburst = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.bubblebeam = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.bulletseed = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.confide = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.defog = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.disarmingvoice = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.dive = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.echoedvoice = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.endure = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.facade = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.grassyterrain = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.guardswap = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.healingwish = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.hornattack = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.hypervoice = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.megahorn = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.mistyexplosion = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.mistyterrain = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.muddywater = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.mysticalfire = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.payback = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.powerswap = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.protect = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.rest = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.revenge = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.roar = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.round = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.skullbash = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.snore = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.supersonic = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.vinewhip = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.whirlpool = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.wish = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.workup = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.worryseed = ["9L1"];
		// Noibat-Ancient
		this.modData("Learnsets", "noibatancient").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.willowisp = ["9L1"];
		delete this.modData('Learnsets', 'noibatancient').learnset.dragonpulse;
		delete this.modData('Learnsets', 'noibatancient').learnset.dragonrush;
		// Noivern-Ancient
		this.modData("Learnsets", "noivernancient").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.willowisp = ["9L1"];
		delete this.modData('Learnsets', 'noivernancient').learnset.dragonclaw;
		delete this.modData('Learnsets', 'noivernancient').learnset.dragonpulse;
		delete this.modData('Learnsets', 'noivernancient').learnset.dragonrush;
		// Diancie-Cataclysm
		this.modData("Learnsets", "dianciecataclysm").learnset.crosspoison = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.clearsmog = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.curse = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.destinybond = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.eruption = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.grudge = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.haze = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.inferno = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.lavaplume = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.shadowsneak = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.smog = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.spite = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.venomdrench = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.venoshock = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.willowisp = ["9L1"];
		// Onix-Crystal
		this.modData("Learnsets", "onixcrystal").learnset.blizzard = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.charm = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.drainingkiss = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.fairywind = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.haze = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.iceshard = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.iciclespear = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.lifedew = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.lovelykiss = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.mistyexplosion = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.playrough = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.recrystallize = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.refresh = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.surf = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.sweetkiss = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.tripleaxel = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.waterfall = ["9L1"];
		delete this.modData('Learnsets', 'onixcrystal').learnset.bulldoze;
		delete this.modData('Learnsets', 'onixcrystal').learnset.dig;
		delete this.modData('Learnsets', 'onixcrystal').learnset.drillrun;
		delete this.modData('Learnsets', 'onixcrystal').learnset.earthpower;
		delete this.modData('Learnsets', 'onixcrystal').learnset.earthquake;
		delete this.modData('Learnsets', 'onixcrystal').learnset.firefang;
		delete this.modData('Learnsets', 'onixcrystal').learnset.fissure;
		delete this.modData('Learnsets', 'onixcrystal').learnset.headsmash;
		delete this.modData('Learnsets', 'onixcrystal').learnset.highhorsepower;
		delete this.modData('Learnsets', 'onixcrystal').learnset.mudslap;
		delete this.modData('Learnsets', 'onixcrystal').learnset.sandtomb;
		delete this.modData('Learnsets', 'onixcrystal').learnset.scorchingsands;
		delete this.modData('Learnsets', 'onixcrystal').learnset.stealthrock;
		delete this.modData('Learnsets', 'onixcrystal').learnset.stompingtantrum;
		delete this.modData('Learnsets', 'onixcrystal').learnset.stoneedge;
		// Steelix-Crystal
		this.modData("Learnsets", "steelixcrystal").learnset.blizzard = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.charm = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.diamondstorm = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.drainingkiss = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.fairywind = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.haze = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.hydropump = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.iceshard = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.iciclespear = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.lifedew = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.lovelykiss = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.mistyexplosion = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.playrough = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.recrystallize = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.refresh = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.surf = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.sweetkiss = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.tripleaxel = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.waterfall = ["9L1"];
		delete this.modData('Learnsets', 'steelixcrystal').learnset.bulldoze;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.dig;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.drillrun;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.earthpower;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.earthquake;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.firefang;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.fissure;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.headsmash;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.highhorsepower;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.mudslap;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.sandtomb;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.scorchingsands;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.stealthrock;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.stompingtantrum;
		delete this.modData('Learnsets', 'steelixcrystal').learnset.stoneedge;
}
};
