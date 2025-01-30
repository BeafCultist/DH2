export const Scripts: {[k: string]: ModdedBattleScriptsData} = {
  	gen: 8,
	inherit: 'gen8',
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
		this.modData("Learnsets", "dodrumb").learnset.acidarmor = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.acidspray = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.tarpit = ["9L1"];
		this.modData("Learnsets", "dodrumb").learnset.tarshot = ["9L1"];
		// Blossobite
		this.modData("Learnsets", "blossobite").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.attract = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.curse = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.defensecurl = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.defog = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.dig = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.dreameater = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.endure = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.expandingforce = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.facade = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.hypervoice = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.protect = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.rest = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.roost = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.round = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.snore = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.teleport = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "blossobite").learnset.toxic = ["9L1"];
		// Ghoulipinch
		this.modData("Learnsets", "ghoulipinch").learnset.attract = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.electroball = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.endure = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.facade = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.growth = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.jawlock = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.protect = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.rest = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.risingvoltage = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.round = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.screech = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.skittersmack = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.snarl = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.snore = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.suckerpunch = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "ghoulipinch").learnset.zapcannon = ["9L1"];
		// Ghoulpion
		this.modData("Learnsets", "ghoulpion").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.ominouswind = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.poltergeist = ["9L1"];
		this.modData("Learnsets", "ghoulpion").learnset.scald = ["9L1"];
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
		this.modData("Learnsets", "cranidoscretaceous").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.ominouswind = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.poltergeist = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.scald = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.scald = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.toxicthread = ["9L1"];
		this.modData("Learnsets", "cranidoscretaceous").learnset.venomdrench = ["9L1"];
		// Rampardos-Cretaceous
		this.modData("Learnsets", "rampardoscretaceous").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "rampardoscretaceous").learnset.wildcharge = ["9L1"];
		// Shieldon-Ancient
		this.modData("Learnsets", "shieldonancient").learnset.headcharge = ["9L1"];
		this.modData("Learnsets", "shieldonancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "shieldonancient").learnset.wildcharge = ["9L1"];
		delete this.modData('Learnsets', 'shieldonancient').learnset.knockoff;
		// Bastiodon-Ancient
		this.modData("Learnsets", "bastiodonancient").learnset.mossysurprise = ["9L1"];
		delete this.modData('Learnsets', 'bastiodonancient').learnset.knockoff;
		// Tirtouga-Leatherback
		this.modData("Learnsets", "tirtougaleatherback").learnset.mossysurprise = ["9L1"];
		// Carracosta-Leatherback
		this.modData("Learnsets", "carracostaleatherback").learnset.pursuit = ["9L1"];
		// Archen-Ancient
		this.modData("Learnsets", "archenancient").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "archenancient").learnset.suckerpunch = ["9L1"];
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
		this.modData("Learnsets", "archeopsancient").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "archeopsancient").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "archeopsancient").learnset.playrough = ["9L1"];
		this.modData("Learnsets", "archeopsancient").learnset.roost = ["9L1"];
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
		this.modData("Learnsets", "tyruntapex").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "tyruntapex").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "tyruntapex").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "tyruntapex").learnset.roost = ["9L1"];
		delete this.modData('Learnsets', 'tyruntapex').learnset.ancientpower;
		delete this.modData('Learnsets', 'tyruntapex').learnset.dragondance;
		delete this.modData('Learnsets', 'tyruntapex').learnset.rockblast;
		// Tyrantrum-Apex
		this.modData("Learnsets", "tyrantrumapex").learnset.playrough = ["9L1"];
		delete this.modData('Learnsets', 'tyrantrumapex').learnset.ancientpower;
		delete this.modData('Learnsets', 'tyrantrumapex').learnset.rockblast;
		// Amaura-Regnant
		this.modData("Learnsets", "amauraregnant").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "amauraregnant").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "amauraregnant").learnset.heavyslam = ["9L1"];
		this.modData("Learnsets", "amauraregnant").learnset.swordsdance = ["9L1"];
		// Aurorus-Regnant
		this.modData("Learnsets", "aurorusregnant").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "aurorusregnant").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "aurorusregnant").learnset.heavyslam = ["9L1"];
		// Shellos-Entity
		this.modData("Learnsets", "shellosentity").learnset.swordsdance = ["9L1"];
		delete this.modData('Learnsets', 'shellosentity').learnset.earthpower;
		delete this.modData('Learnsets', 'shellosentity').learnset.fissure;
		delete this.modData('Learnsets', 'shellosentity').learnset.mudshot;
		delete this.modData('Learnsets', 'shellosentity').learnset.mudslap;
		delete this.modData('Learnsets', 'shellosentity').learnset.scald;
		// Gastrodon-West-Entity
		this.modData("Learnsets", "gastrodonwestentity").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.howlingaurora = ["9L1"];
		this.modData("Learnsets", "gastrodonwestentity").learnset.moonlight = ["9L1"];
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
		this.modData("Learnsets", "gastrodoneastentity").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.howlingaurora = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.mistyterrain = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "gastrodoneastentity").learnset.moonlight = ["9L1"];
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
		this.modData("Learnsets", "yanmaancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "yanmaancient").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "yanmaancient").learnset.sludgewave = ["9L1"];
		delete this.modData('Learnsets', 'yanmaancient').learnset.psychic;
		delete this.modData('Learnsets', 'yanmaancient').learnset.shadowball;
		// Yanmega-Ancient
		this.modData("Learnsets", "yanmegaancient").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.dragonrage = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "yanmegaancient").learnset.twister = ["9L1"];
		delete this.modData('Learnsets', 'yanmegaancient').learnset.psychic;
		delete this.modData('Learnsets', 'yanmegaancient').learnset.shadowball;
		// Tangela-Ancient
		this.modData("Learnsets", "tangelaancient").learnset.confusion = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.psybeam = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "tangelaancient").learnset.psyshock = ["9L1"];
		// Tangrowth-Ancient
		this.modData("Learnsets", "tangrowthancient").learnset.agility = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.hyperfang = ["9L1"];
		this.modData("Learnsets", "tangrowthancient").learnset.poisonfang = ["9L1"];
		// Liluǒ
		this.modData("Learnsets", "liluǒ").learnset.agility = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.crosschop = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.hyperfang = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.jawforce = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.jawlock = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.poisonfang = ["9L1"];
		this.modData("Learnsets", "liluǒ").learnset.thunderfang = ["9L1"];
		// Flaruǒ
		this.modData("Learnsets", "flaruǒ").learnset.ember = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.firelash = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "flaruǒ").learnset.willowisp = ["9L1"];
		// Alohwo
		this.modData("Learnsets", "alohwo").learnset.ember = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.firelash = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "alohwo").learnset.willowisp = ["9L1"];
		// Wonkway
		this.modData("Learnsets", "wonkway").learnset.attract = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.electricterrain = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.ember = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.endure = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.facade = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.facade = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.howl = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.protect = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.rest = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.round = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.scorchedpebbles = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.snore = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.spark = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.swagger = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "wonkway").learnset.willowisp = ["9L1"];
		// Illusinogen
		this.modData("Learnsets", "illusinogen").learnset.attract = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.electricterrain = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.ember = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.endure = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.facade = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.facade = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.howl = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.protect = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.rest = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.roar = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.round = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.scorchedpebbles = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.snore = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.spark = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.swagger = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "illusinogen").learnset.willowisp = ["9L1"];
		// Robusteel
		this.modData("Learnsets", "robusteel").learnset.attract = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.circlethrow = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.electricterrain = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.ember = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.endure = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.facade = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.facade = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.howl = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.protect = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.rest = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.roar = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.round = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.scorchedpebbles = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.snore = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.spark = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.swagger = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.tarshot = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.volttackle = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.wildcharge = ["9L1"];
		this.modData("Learnsets", "robusteel").learnset.willowisp = ["9L1"];
		// Velovolt
		this.modData("Learnsets", "velovolt").learnset.allyswitch = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.attract = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.confusion = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.constrict = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.destinybond = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.dreameater = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.embargo = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.endure = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.expandingforce = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.extrasensory = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.facade = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.feintattack = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.fellstinger = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.flash = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.foulplay = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.gravity = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.imprison = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.magiccoat = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.magicroom = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.mimic = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.naturalgift = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.payback = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.powerswap = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.protect = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.psybeam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.psywave = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.quash = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.recycle = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.rest = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.return = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.round = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.secretpower = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.skillswap = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.snatch = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.snore = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.spite = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.swift = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.synchronoise = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.telekinesis = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.topsyturvy = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.torment = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.trickroom = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.wonderroom = ["9L1"];
		this.modData("Learnsets", "velovolt").learnset.zenheadbutt = ["9L1"];
		// Vishcaca
		this.modData("Learnsets", "vishcaca").learnset.allyswitch = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.attract = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.confusion = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.constrict = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.destinybond = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.dreameater = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.embargo = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.endure = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.expandingforce = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.extrasensory = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.facade = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.feintattack = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.fellstinger = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.fierydance = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.flash = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.foulplay = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.futuresight = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.gravity = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.imprison = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.magiccoat = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.magicroom = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.mimic = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.naturalgift = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.payback = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.powerswap = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.protect = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.psybeam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.psywave = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.quash = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.recycle = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.rest = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.round = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.secretpower = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.signalbeam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.skillswap = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.snatch = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.snore = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.spite = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.swift = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.synchronoise = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.telekinesis = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.topsyturvy = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.torment = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.trickroom = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.wonderroom = ["9L1"];
		this.modData("Learnsets", "vishcaca").learnset.zenheadbutt = ["9L1"];
		// Dracosaur
		this.modData("Learnsets", "dracosaur").learnset.acrobatics = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.airslash = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.autotomize = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.bulkup = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.defog = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.doomdesire = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.drillpeck = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.facade = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.haze = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.hurricane = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.irondefense = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.protect = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.rest = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.return = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.roost = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.tailwind = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "dracosaur").learnset.uturn = ["9L1"];
		// Gorlifross
		this.modData("Learnsets", "gorlifross").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.boltbeak = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.charge = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.charm = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.discharge = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.electroball = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.endure = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.extremespeed = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.facade = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.firespin = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.lowkick = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.megakick = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.megapunch = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.mistyexplosion = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.playrough = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.protect = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rest = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.risingvoltage = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.round = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.slam = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.snore = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.sweetkiss = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.thunderpunch = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.thundershock = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "gorlifross").learnset.wildcharge = ["9L1"];
		// Arctachoris
		this.modData("Learnsets", "arctachoris").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.bite = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.dive = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.facade = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.fishiousrend = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.leechlife = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.psychicfangs = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.superfang = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.waterfall = ["9L1"];
		this.modData("Learnsets", "arctachoris").learnset.zenheadbutt = ["9L1"];
		// Dreepy-Luminous
		this.modData("Learnsets", "dreepyluminous").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.endure = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.facade = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.lowkick = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.megakick = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.protect = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.rest = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.round = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.scaleshot = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.scorchingsands = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.snore = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.stomp = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.tackle = ["9L1"];
		this.modData("Learnsets", "dreepyluminous").learnset.tailspike = ["9L1"];
		delete this.modData('Learnsets', 'dreepyluminous').learnset.dracometeor;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.dragondarts;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.fireblast;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.hydropump;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.scald;
		delete this.modData('Learnsets', 'dreepyluminous').learnset.surf;
		// Drakloak-Luminous
		this.modData("Learnsets", "drakloakluminous").learnset.acrobatics = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.aircutter = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.airslash = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.aurorabeam = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.avalanche = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.blizzard = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.defog = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.dualwingbeat = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.endure = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.facade = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.featherdance = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.frostbreath = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.hail = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.haze = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.icepunch = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.iceshard = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.iciclespear = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.icywind = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.mirrormove = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.mist = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.peck = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.powdersnow = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.protect = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.rest = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.roost = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.round = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.skyattack = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.skydrop = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.snore = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.surf = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.tailwind = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.uturn = ["9L1"];
		this.modData("Learnsets", "drakloakluminous").learnset.wingattack = ["9L1"];
		delete this.modData('Learnsets', 'drakloakluminous').learnset.dracometeor;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.dragondarts;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.fireblast;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.hydropump;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.scald;
		delete this.modData('Learnsets', 'drakloakluminous').learnset.surf;
		// Dragapult-Luminous
		this.modData("Learnsets", "dragapultluminous").learnset.acrobatics = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.aircutter = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.airslash = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.ancientpower = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.aurorabeam = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.avalanche = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.blizzard = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.bravebird = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.defog = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.drillpeck = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.dualwingbeat = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.endure = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.facade = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.featherdance = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.freezedry = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.frostbreath = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.glacialgale = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.hail = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.haze = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.hurricane = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.hydropump = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.icefang = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.icepunch = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.iceshard = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.iciclespear = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.icywind = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.knockoffmeteorbeam = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.mirrormove = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.mist = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.powdersnow = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.peck = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.protect = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.rest = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.roost = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.round = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.sheercold = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.skyattack = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.skydrop = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.snore = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.surf = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.tailwind = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.tripleaxel = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.uturn = ["9L1"];
		this.modData("Learnsets", "dragapultluminous").learnset.wingattack = ["9L1"];
		delete this.modData('Learnsets', 'dragapultluminous').learnset.dracometeor;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.dragondarts;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.fireblast;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.hydropump;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.scald;
		delete this.modData('Learnsets', 'dragapultluminous').learnset.surf;
		// Larvitar-Nature
		this.modData("Learnsets", "larvitarnature").learnset.sludgebomb = ["9L1"];
		delete this.modData('Learnsets', 'larvitarnature').learnset.rockpolish;
		delete this.modData('Learnsets', 'larvitarnature').learnset.stealthrock;
		delete this.modData('Learnsets', 'larvitarnature').learnset.stoneedge;
		delete this.modData('Learnsets', 'larvitarnature').learnset.superpower;
		// Pupitar-Nature
		this.modData("Learnsets", "pupitarnature").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "pupitarnature").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "pupitarnature").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "pupitarnature").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "pupitarnature").learnset.voltswitch = ["9L1"];
		delete this.modData('Learnsets', 'pupitarnature').learnset.rockpolish;
		delete this.modData('Learnsets', 'pupitarnature').learnset.stealthrock;
		delete this.modData('Learnsets', 'pupitarnature').learnset.stoneedge;
		delete this.modData('Learnsets', 'pupitarnature').learnset.superpower;
		// Tyranitar-Nature
		this.modData("Learnsets", "tyranitarnature").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.luminousdarts = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.sludgewave = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "tyranitarnature").learnset.wildcharge = ["9L1"];
		delete this.modData('Learnsets', 'tyranitarnature').learnset.dragondance;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.fireblast;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.focusblast;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.rockpolish;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.stealthrock;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.stoneedge;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.superpower;
		delete this.modData('Learnsets', 'tyranitarnature').learnset.thunder;
		// Gible-Persistent
		this.modData("Learnsets", "giblepersistent").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "giblepersistent").learnset.seedbomb = ["9L1"];
		delete this.modData('Learnsets', 'giblepersistent').learnset.dracometeor;
		delete this.modData('Learnsets', 'giblepersistent').learnset.fireblast;
		// Gabite-Persistent
		this.modData("Learnsets", "gabitepersistent").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "gabitepersistent").learnset.seedbomb = ["9L1"];
		delete this.modData('Learnsets', 'gabitepersistent').learnset.dracometeor;
		delete this.modData('Learnsets', 'gabitepersistent').learnset.fireblast;
		// Garchomp-Persistent
		this.modData("Learnsets", "garchomppersistent").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "garchomppersistent").learnset.woodhammer = ["9L1"];
		delete this.modData('Learnsets', 'garchomppersistent').learnset.dracometeor;
		delete this.modData('Learnsets', 'garchomppersistent').learnset.fireblast;
		// Scorcharnia-Average
		this.modData("Learnsets", "scorcharniaaverage").learnset.astonish = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.counter = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.dive = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.phantomforce = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "scorcharniaaverage").learnset.skullbash = ["9L1"];
		// Listoxina
		this.modData("Learnsets", "listoxina").learnset.astonish = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.counter = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.dive = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.phantomforce = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "listoxina").learnset.skullbash = ["9L1"];
		// Spinollina
		this.modData("Learnsets", "spinollina").learnset.astonish = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.counter = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.dive = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.phantomforce = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "spinollina").learnset.skullbash = ["9L1"];
		// Plusle-Primal
		this.modData("Learnsets", "plusleprimal").learnset.absorb = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.aquajet = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.aquaring = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.attract = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.bind = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.brine = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.bubblebeam = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.camouflage = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.coil = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.confide = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.constrict = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.crabhammer = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.defog = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.dive = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.doubleteam = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.ember = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.encore = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.endure = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.facade = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.firelash = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.flameburst = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.flash = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.harden = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.healingwish = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.hydropump = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.ingrain = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.lavaplume = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.mimic = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.muddywater = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.powerwhip = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.protect = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.reflecttype = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.rest = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.return = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.round = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.round = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.scald = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.scorchingpebbles = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.snore = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.surf = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.takedown = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.waterfall = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.weatherball = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.willowisp = ["9L1"];
		this.modData("Learnsets", "plusleprimal").learnset.wringout = ["9L1"];
		// Minun-Primal
		this.modData("Learnsets", "minunprimal").learnset.acid = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.acidspray = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.aquaring = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.gastroacid = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.hail = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.hydropump = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.icebeam = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.leechlife = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.poisonsting = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.poisontail = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.recover = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.rest = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.return = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.scald = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.sleeptail = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.surf = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.tackle = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.toxicspikes = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.venomdrench = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.venoshock = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.whirlpool = ["9L1"];
		this.modData("Learnsets", "minunprimal").learnset.wish = ["9L1"];
		// Swalot-Primal
		this.modData("Learnsets", "swalotprimal").learnset.attract = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.babydolleyes = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.captivate = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.detect = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.discharge = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.ember = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.facade = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.highjumpkick = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.moonlight = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.mudshot = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.poltergeist = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.powergem = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.protect = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.rockthrow = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.rollingkick = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.spark = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.stickkick = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.superdrill = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.thief = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.thunderwave = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.thunderouskick = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.toxic = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.toxicthread = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.tripleaxel = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.triplekick = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "swalotprimal").learnset.zingzap = ["9L1"];
		delete this.modData('Learnsets', 'swalotprimal').learnset.gigadrain;
		// Hariyama-Primal
		this.modData("Learnsets", "hariyamaprimal").learnset.hex = ["9L1"];
		this.modData("Learnsets", "hariyamaprimal").learnset.shadowball = ["9L1"];
		this.modData("Learnsets", "hariyamaprimal").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "hariyamaprimal").learnset.willowisp = ["9L1"];
		// Grumpig-Primal
		this.modData("Learnsets", "grumpigprimal").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "grumpigprimal").learnset.gyroball = ["9L1"];
		this.modData("Learnsets", "grumpigprimal").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "grumpigprimal").learnset.photonball = ["9L1"];
		this.modData("Learnsets", "grumpigprimal").learnset.spikes = ["9L1"];
		// Trapinch
		this.modData("Learnsets", "trapinch").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "trapinch").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "trapinch").learnset.scald = ["9L1"];
		this.modData("Learnsets", "trapinch").learnset.tarpit = ["9L1"];
		// Vibrava-Classical
		this.modData("Learnsets", "vibravaclassical").learnset.playrough = ["9L1"];
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dracometeor;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragonbreath;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragonpulse;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragonrush;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.dragontail;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.outrage;
		delete this.modData('Learnsets', 'vibravaclassical').learnset.twister;
		// Flygon-Classical
		this.modData("Learnsets", "flygonclassical").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "flygonclassical").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "flygonclassical").learnset.wish = ["9L1"];
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
		this.modData("Learnsets", "sphealancient").learnset.trapinch = ["9L1"];
		delete this.modData('Learnsets', 'sphealancient').learnset.waterfall;
		// Sealeo-Ancient
		this.modData("Learnsets", "sealeoancient").learnset.aurasphere = ["9L1"];
		this.modData("Learnsets", "sealeoancient").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "sealeoancient").learnset.healbell = ["9L1"];
		delete this.modData('Learnsets', 'sealeoancient').learnset.waterfall;
		// Walrein-Ancient
		this.modData("Learnsets", "walreinancient").learnset.aurasphere = ["9L1"];
		this.modData("Learnsets", "walreinancient").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "walreinancient").learnset.healbell = ["9L1"];
		delete this.modData('Learnsets', 'walreinancient').learnset.hydropump;
		delete this.modData('Learnsets', 'walreinancient').learnset.liquidation;
		delete this.modData('Learnsets', 'walreinancient').learnset.waterfall;
		// Whismur-Ancient
		delete this.modData('Learnsets', 'whismurancient').learnset.raindance;
		delete this.modData('Learnsets', 'whismurancient').learnset.waterpulse;
		// Loudred-Ancient
		this.modData("Learnsets", "loudredancient").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "loudredancient").learnset.closecombat = ["9L1"];
		this.modData("Learnsets", "loudredancient").learnset.moonlight = ["9L1"];
		delete this.modData('Learnsets', 'loudredancient').learnset.raindance;
		delete this.modData('Learnsets', 'loudredancient').learnset.waterpulse;
		// Exploud-Ancient
		this.modData("Learnsets", "exploudancient").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.closecombat = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.furioustusks = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.iciclecrash = ["9L1"];
		this.modData("Learnsets", "exploudancient").learnset.moonlight = ["9L1"];
		delete this.modData('Learnsets', 'exploudancient').learnset.hydropump;
		delete this.modData('Learnsets', 'exploudancient').learnset.raindance;
		delete this.modData('Learnsets', 'exploudancient').learnset.surf;
		delete this.modData('Learnsets', 'exploudancient').learnset.waterpulse;
		delete this.modData('Learnsets', 'exploudancient').learnset.whirlpool;
		// Anklarmor
		this.modData("Learnsets", "anklarmor").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "anklarmor").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "anklarmor").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "anklarmor").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "anklarmor").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "anklarmor").learnset.stoneedge = ["9L1"];
		delete this.modData('Learnsets', 'anklarmor').learnset.basedonprobopassmovepool;
		// Drakabyssal
		this.modData("Learnsets", "drakabyssal").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "drakabyssal").learnset.stoneedge = ["9L1"];
		// Trobsidon
		this.modData("Learnsets", "trobsidon").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.primevalrock = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "trobsidon").learnset.overdrive = ["9L1"];
		// Dhelmise-Ancient
		this.modData("Learnsets", "dhelmiseancient").learnset.spikes = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.spikyshield = ["9L1"];
		this.modData("Learnsets", "dhelmiseancient").learnset.meteorbeam = ["9L1"];
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.anchorshot;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.block;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.flashcannon;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.gyroball;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.irondefense;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.metalsound;
		delete this.modData('Learnsets', 'dhelmiseancient').learnset.steelroller;
		// Honedge-Ancient
		this.modData("Learnsets", "honedgeancient").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.flipturn = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.icefangs = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.liquidation = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.moonlight = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.psychicfangs = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.suckerpunch = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "honedgeancient").learnset.waterfall = ["9L1"];
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
		this.modData("Learnsets", "doubladeancient").learnset.accelerock = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.attract = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.cut = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dig = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.dualchop = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.endure = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.facade = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.fakeout = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.fling = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.furycutter = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.harden = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.headbutt = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.highjumpkick = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.lowkick = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.megakick = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.metalclaw = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.poisonfang = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.powergem = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.protect = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.psychic = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.psyshock = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.rest = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.rockblast = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.rockpolish = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.rockthrow = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.round = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.screech = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.shockwave = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.smackdown = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.snore = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.stomp = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.strength = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.tackle = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.takedown = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.thunder = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.thunderbolt = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.uturn = ["9L1"];
		this.modData("Learnsets", "doubladeancient").learnset.zenheadbutt = ["9L1"];
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
		this.modData("Learnsets", "aegislashancient").learnset.acidarmor = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.bonerush = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.dig = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.shadowbone = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.sludgebomb = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.spiritshackle = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.toxicspikes = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.venomdrench = ["9L1"];
		this.modData("Learnsets", "aegislashancient").learnset.venoshock = ["9L1"];
		delete this.modData('Learnsets', 'aegislashancient').learnset.autotomize;
		delete this.modData('Learnsets', 'aegislashancient').learnset.falseswipe;
		delete this.modData('Learnsets', 'aegislashancient').learnset.flashcannon;
		delete this.modData('Learnsets', 'aegislashancient').learnset.furycutter;
		delete this.modData('Learnsets', 'aegislashancient').learnset.gyroball;
		delete this.modData('Learnsets', 'aegislashancient').learnset.irondefense;
		delete this.modData('Learnsets', 'aegislashancient').learnset.ironhead;
		delete this.modData('Learnsets', 'aegislashancient').learnset.king’sshield;
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
		this.modData("Learnsets", "baltoypremade").learnset.branchpoke = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.growth = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.woodhammer = ["9L1"];
		this.modData("Learnsets", "baltoypremade").learnset.worryseed = ["9L1"];
		// Claydol-Premade
		this.modData("Learnsets", "claydolpremade").learnset.branchpoke = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.drillrun = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.growth = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.woodhammer = ["9L1"];
		this.modData("Learnsets", "claydolpremade").learnset.worryseed = ["9L1"];
		// Paras-Ancient
		this.modData("Learnsets", "parasancient").learnset.branchpoke = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.drillrun = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.flintspear = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.foragerspoise = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.growth = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.poisonjab = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.strengthsap = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.woodhammer = ["9L1"];
		this.modData("Learnsets", "parasancient").learnset.worryseed = ["9L1"];
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
		this.modData("Learnsets", "parasectancient").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "parasectancient").learnset.meteorbeam = ["9L1"];
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
		this.modData("Learnsets", "parasinensis").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "parasinensis").learnset.meteorbeam = ["9L1"];
		// Girafarig-Ancient
		this.modData("Learnsets", "girafarigancient").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "girafarigancient").learnset.irondefense = ["9L1"];
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
		this.modData("Learnsets", "oligosogilo").learnset.bodypress = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.focusblast = ["9L1"];
		this.modData("Learnsets", "oligosogilo").learnset.irondefense = ["9L1"];
		// Poochyena-Ancient
		this.modData("Learnsets", "poochyenaancient").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.aurasphere = ["9L1"];
		this.modData("Learnsets", "poochyenaancient").learnset.strengthsap = ["9L1"];
		delete this.modData('Learnsets', 'poochyenaancient').learnset.astonish;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.confide;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.counter;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.doubleteam;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.mimic;
		delete this.modData('Learnsets', 'poochyenaancient').learnset.swagger;
		// Mightyena-Ancient
		this.modData("Learnsets", "mightyenaancient").learnset.dig = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.earthpower = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.mudshot = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.scorchingsands = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.smackdown = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.rapidspin = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "mightyenaancient").learnset.superpower = ["9L1"];
		delete this.modData('Learnsets', 'mightyenaancient').learnset.astonish;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.confide;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.counter;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.doubleteam;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.mimic;
		delete this.modData('Learnsets', 'mightyenaancient').learnset.swagger;
		// Matriaryena
		this.modData("Learnsets", "matriaryena").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.bulkup = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.crushclaw = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.firepunch = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.hammerarm = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.icehammer = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.icepunch = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.nightslash = ["9L1"];
		this.modData("Learnsets", "matriaryena").learnset.slash = ["9L1"];
		// Teenizino
		this.modData("Learnsets", "teenizino").learnset.burningjealousy = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.charm = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.flatter = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "teenizino").learnset.trick = ["9L1"];
		// Terrorzino
		this.modData("Learnsets", "terrorzino").learnset.burningjealousy = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.charm = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.flatter = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.gunkshot = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.partingshot = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.pursuit = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.switcheroo = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "terrorzino").learnset.trick = ["9L1"];
		// Sailad
		this.modData("Learnsets", "sailad").learnset.bonerush = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.jawlock = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.superpower = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "sailad").learnset.psychicfangs = ["9L1"];
		// Pharaocious
		this.modData("Learnsets", "pharaocious").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.attract = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.confide = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.counter = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.cut = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.detect = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dig = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.dualchop = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.endeavor = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.endure = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.facade = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.falseswipe = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.feint = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.firstimpression = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.fling = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.furycutter = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.furyswipes = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.guillotine = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.laserfocus = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.leer = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.payback = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.peck = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.protect = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.razorwind = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.rest = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.return = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.roar = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.round = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.scratch = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.shockwave = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.slash = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.snore = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.strength = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "pharaocious").learnset.voltswitch = ["9L1"];
		// Honkeri
		this.modData("Learnsets", "honkeri").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.aquatail = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.attract = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.breakingswipe = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.chargebeam = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.confide = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.counter = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.crosspoison = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.crushclaw = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.cut = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.detect = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dig = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dracometeor = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dragonbreath = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dragonrush = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.dualchop = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.endeavor = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.endure = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.facade = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.falseswipe = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.feint = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.firstimpression = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.flashcannon = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.fling = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.frustration = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.furycutter = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.furyswipes = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.guillotine = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.hiddenpower = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.ironhead = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.laserfocus = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.leer = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.metalclaw = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.nightslash = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.payback = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.peck = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.pluck = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.protect = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.psychocut = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.razorwind = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.rest = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.return = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.reversal = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.roar = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.round = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.scratch = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.shockwave = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.slash = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.smartstrike = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.snore = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.strength = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.surf = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.swordsdance = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.voltswitch = ["9L1"];
		this.modData("Learnsets", "honkeri").learnset.xscissor = ["9L1"];
		// Melophus
		this.modData("Learnsets", "melophus").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.attract = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.beatup = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.bite = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.confide = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.counter = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.curse = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.cut = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.dig = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.ember = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.endure = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.facade = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.firespin = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.inferno = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.leer = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.meanlook = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.nastyplot = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.payback = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.protect = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.rest = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.retaliate = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.roar = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.round = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.sandattack = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.snore = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.spite = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.thief = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.thrash = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.torment = ["9L1"];
		this.modData("Learnsets", "melophus").learnset.willowisp = ["9L1"];
		// Noibat-Ancient
		this.modData("Learnsets", "noibatancient").learnset.aerialace = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.assurance = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.attract = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.beatup = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.bite = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.block = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.bulldoze = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.burningjealousy = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.confide = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.counter = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.crunch = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.curse = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.cut = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.darkpulse = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.dig = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.doubleedge = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.dragonclaw = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.dragonpulse = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.earthquake = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.ember = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.endure = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.facade = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.firefang = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.firespin = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.flamethrower = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.focusenergy = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.foulplay = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.heatwave = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.honeclaws = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.incinerate = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.inferno = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.irontail = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.knockoff = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.lashout = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.leer = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.meanlook = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.mudslap = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.nastyplot = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.outrage = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.payback = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.powertrip = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.protect = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.rest = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.retaliate = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.revenge = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.roar = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.round = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.sandattack = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.sandtomb = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.sandstorm = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.scaleshot = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.scaryface = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.scorchingsands = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.shadowclaw = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.slackoff = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.smackdown = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.snarl = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.snore = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.spite = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.stealthrock = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.stompingtantrum = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.strength = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.taunt = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.thief = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.thrash = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.throatchop = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.thunderfang = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.torment = ["9L1"];
		this.modData("Learnsets", "noibatancient").learnset.willowisp = ["9L1"];
		delete this.modData('Learnsets', 'noibatancient').learnset.dragonpulse;
		delete this.modData('Learnsets', 'noibatancient').learnset.dragonrush;
		// Noivern-Ancient
		this.modData("Learnsets", "noivernancient").learnset.absorb = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.attract = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.boomburst = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.bubblebeam = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.bulletseed = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.confide = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.defog = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.disarmingvoice = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.dive = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.echoedvoice = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.endure = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.facade = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.grassyterrain = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.healingwish = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.hornattack = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.hypervoice = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.muddywater = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.payback = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.protect = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.rest = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.roar = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.round = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.snore = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.supersonic = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.vinewhip = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.whirlpool = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.workup = ["9L1"];
		this.modData("Learnsets", "noivernancient").learnset.worryseed = ["9L1"];
		delete this.modData('Learnsets', 'noivernancient').learnset.dragonclaw;
		delete this.modData('Learnsets', 'noivernancient').learnset.dragonpulse;
		delete this.modData('Learnsets', 'noivernancient').learnset.dragonrush;
		// Diancie-Cataclysm
		this.modData("Learnsets", "dianciecataclysm").learnset.absorb = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.aromatherapy = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.attract = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.bodyslam = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.boomburst = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.brickbreak = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.brutalswing = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.bubblebeam = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.bulletseed = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.calmmind = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.confide = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.dazzlinggleam = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.defog = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.disarmingvoice = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.dive = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.dragontail = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.echoedvoice = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.endure = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.energyball = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.facade = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.gigadrain = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.gigaimpact = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.grassknot = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.grassyglide = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.grassyterrain = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.guardswap = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.healingwish = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.highhorsepower = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.hornattack = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.hornleech = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.hyperbeam = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.hypervoice = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.leafstorm = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.leechseed = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.lightscreen = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.megadrain = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.megahorn = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.mistyexplosion = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.mistyterrain = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.moonblast = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.muddywater = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.mysticalfire = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.naturepower = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.payback = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.powerswap = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.protect = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.psychup = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.raindance = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.reflect = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.rest = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.revenge = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.roar = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.rockslide = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.rocksmash = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.rocktomb = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.round = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.safeguard = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.seedbomb = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.skullbash = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.sleeptalk = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.snore = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.solarbeam = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.stoneedge = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.storedpower = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.substitute = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.sunnyday = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.supersonic = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.synthesis = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.vinewhip = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.watergun = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.waterpulse = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.whirlpool = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.wish = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.workup = ["9L1"];
		this.modData("Learnsets", "dianciecataclysm").learnset.worryseed = ["9L1"];
		// Onix-Crystal
		this.modData("Learnsets", "onixcrystal").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "onixcrystal").learnset.willowisp = ["9L1"];
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
		this.modData("Learnsets", "steelixcrystal").learnset.fireblast = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.flamecharge = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.flareblitz = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.meteorbeam = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.overheat = ["9L1"];
		this.modData("Learnsets", "steelixcrystal").learnset.willowisp = ["9L1"];
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

	},
};
