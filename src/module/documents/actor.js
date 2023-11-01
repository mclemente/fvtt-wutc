import { RollDialog } from "../apps/RollDialog";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export default class ActorWUTC extends Actor {
	static getDefaultArtwork(actorData) {
		if (actorData.type === "character") return super.getDefaultArtwork(actorData);
		const img = {
			npc: "systems/wutc/assets/icons/svg/orc-head.svg",
			container: "icons/svg/chest.svg",
			ship: "systems/wutc/assets/icons/svg/sailboat.svg",
		};
		return {
			img: img[actorData.type],
			texture: {
				src: img[actorData.type],
			},
		};
	}

	/**
	 * @override
	 */
	prepareDerivedData() {
		this._prepareCharacterData();
		this._prepareNpcData();

		if (["character", "npc"].includes(this.type)) {
			this._prepareArmorClass();
		}

		this._prepareEncumbrance();
		this._prepareSaves();
	}

	async _preCreate(data, options, user) {
		await super._preCreate(data, options, user);

		// Configure prototype token settings
		const changes = {};
		if (this.type === "character") {
			changes.prototypeToken = {
				sight: { enabled: true },
				actorLink: true,
				disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
			};
		}
		this.updateSource(changes);
	}

	/**
	 * Prepare Character type specific data
	 */
	_prepareCharacterData() {
		if (this.type !== "character") return;
		const attack = this.system.attributes.attack;
		if (!attack) return;
		if (this.system.characteristics.str.value >= 15) {
			attack.value += 1;
		}
	}

	/**
	 * Prepare NPC type specific data.
	 */
	_prepareNpcData() {
		if (this.type !== "npc") return;
	}

	_prepareArmorClass() {
		const ac = this.system.attributes.ac;
		if (!ac) return;
		if (!ac.bonus) ac.bonus = 0;
		if (!ac.penalty) ac.penalty = 0;

		// Identify Equipped Items
		const armorTypes = new Set(Object.keys(CONFIG.WUTC.armorTypes));
		const { armors, shields } = this.items.reduce(
			(obj, equip) => {
				const armor = equip.system.armor;
				if (!equip.system.equipped || !armorTypes.has(armor?.type)) return obj;
				if (armor.type === "shield") obj.shields.push(equip);
				else if (armor.type !== "ward") obj.armors.push(equip);
				return obj;
			},
			{ armors: [], shields: [] },
		);

		// Determine base AC
		if (armors.length) {
			// if (armors.length > 1) {
			// 	this._preparationWarnings.push({
			// 		message: game.i18n.localize("WUTC.WarnMultipleArmor"),
			// 		type: "warning",
			// 	});
			// }
			const armorData = armors[0].system.armor;
			ac.armor = armorData.value ?? ac.armor;
			ac.equippedArmor = armors[0];
		} else {
			ac.armor = 9;
		}

		// Equipped Shield
		if (shields.length) {
			if (shields.length > 1) {
				// this._preparationWarnings.push({
				// 	message: game.i18n.localize("DND5E.WarnMultipleShields"),
				// 	type: "warning",
				// });
			}
			ac.shield = shields[0].system.armor.value ?? 0;
			ac.equippedShield = shields[0];
		}

		if (this.type !== "npc") {
			const rollData = this.getRollData({ deterministic: true });
			rollData.attributes.ac = ac;
			const formula = "@attributes.ac.armor + @attributes.ac.bonus + @attributes.ac.penalty";
			const replaced = Roll.replaceFormulaData(formula, rollData);
			ac.base = Roll.safeEval(replaced);

			// Compute total AC and return
			ac.value = ac.base + (ac.shield ?? 0) + (ac.bonus ?? 0) + (ac.cover ?? 0);
		}
	}

	_prepareEncumbrance() {
		const encumbrance = this.system.attributes.encumbrance;
		if (!encumbrance) return;

		const { total } = this.items.reduce(
			(obj, equip) => {
				if (!equip.system.quantity || equip.system.equipped || equip.system.ignoreWeight) return obj;
				else {
					if (Number.isNumeric(equip.system.weight)) {
						if (equip.system.weight !== 0) {
							obj.total += Math.ceil(equip.system.quantity * equip.system.weight);
						}
					} else {
						obj.total += equip.system.quantity ?? 1;
					}
				}
				return obj;
			},
			{ total: 0 },
		);
		encumbrance.value = total;
		const ac = this.system.attributes.ac;
		if (ac && this.type !== "ship") {
			encumbrance.max = ac.value + 5;
		}
	}

	_prepareSaves() {
		if (!["character", "npc"].includes(this.type)) return;
		const saves = this.system.saves;
		Object.keys(saves).forEach((save) => {
			saves[save].bonus ??= 0;
			saves[save].penalty ??= 0;
		});
		const equippedArmor = this.system.attributes.ac.equippedArmor;
		if (!equippedArmor) {
			saves.dodging.bonus += 4;
		} else if (equippedArmor.system.armor.type === "light") {
			saves.dodging.bonus += 2;
		} else if (equippedArmor.system.armor.type === "heavy") {
			saves.dodging.penalty -= 2;
		}

		if (this.system.characteristics.agi.value >= 15) {
			saves.dodging.bonus += 1;
		}
		if (this.system.characteristics.con.value >= 15) {
			saves.physique.bonus += 1;
		}

		if (this.type === "npc") {
			// Add modifiers (pg. 7)
		}
	}

	/**
	 * Override getRollData() that's supplied to rolls.
	 */
	getRollData() {
		const data = super.getRollData();

		// Prepare character roll data.
		this._getCharacterRollData(data);
		this._getNpcRollData(data);

		return data;
	}

	/**
	 * Prepare character roll data.
	 */
	_getCharacterRollData(data) {
		if (this.type !== "character") return;

		// Add level for easier access, or fall back to 0.
		if (data.attributes.hd) {
			data.lvl = data.attributes.hd.value ?? 1;
		}
	}

	/**
	 * Prepare NPC roll data.
	 */
	// eslint-disable-next-line no-unused-vars
	_getNpcRollData(data) {
		if (this.type !== "npc") return;

		// Process additional NPC data here.
	}

	async rollTest(key, event) {
		const title = game.i18n.localize(`WUTC.Characteristics.${key}`) ?? "";
		return new RollDialog({
			title,
			actor: this,
			data: this.getRollData(),
			key,
			rollType: "test",
			event,
		});
	}

	async rollSave(key, event) {
		const title = game.i18n.localize(`WUTC.Saves.${key}`) ?? "";
		return new RollDialog({
			title,
			actor: this,
			data: this.getRollData(),
			key,
			rollType: "save",
			event,
		});
	}

	async rollMorale(event) {
		const title = game.i18n.localize(`WUTC.MoraleCheck`) ?? "";
		return new RollDialog({
			title,
			actor: this,
			data: this.getRollData(),
			rollType: "morale",
			event,
		});
	}

	// eslint-disable-next-line no-unused-vars
	async rollRam(event) {
		const messages = [];
		const selfDamage = await new Roll("1d6").evaluate({ async: true });
		const hp = this.system.attributes.hp.value;
		const remainingHP = hp - selfDamage.total;
		if (hp <= 0) {
			ui.notifications.warn(game.i18n.localize("WUTC.RammingZeroHP"));
			return;
		}
		await this.update({ "system.attributes.hp.value": remainingHP });

		messages.push(
			await selfDamage.toMessage(
				{
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					flavor: game.i18n.localize(`WUTC.RammingSelfDamage`),
					rollMode: game.settings.get("core", "rollMode"),
				},
				{ create: false },
			),
		);

		if (remainingHP <= 0) {
			return;
		}

		const numOfDice = Math.max(1, Math.ceil(remainingHP / 6));

		const ramDamage = await new Roll(`${numOfDice}d6`).evaluate({ async: true });
		messages.push(
			await ramDamage.toMessage(
				{
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					flavor: game.i18n.localize(`WUTC.RammingDamage`),
					rollMode: game.settings.get("core", "rollMode"),
				},
				{ create: false },
			),
		);

		await ChatMessage.implementation.create(messages);
	}

	// eslint-disable-next-line no-unused-vars
	async rollSink(event) {
		const sinkRoll = await new Roll("1d6").evaluate({ async: true });

		await sinkRoll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			flavor: game.i18n.localize(`WUTC.SinkingRoll`),
			rollMode: game.settings.get("core", "rollMode"),
		});
	}
}
