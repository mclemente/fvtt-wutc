import { RollDialog } from "../apps/RollDialog";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export default class ActorWUTC extends Actor {
	/** @override */
	prepareData() {
		// Prepare data for the actor. Calling the super version of this executes
		// the following, in order: data reset (to clear active effects),
		// prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
		// prepareDerivedData().
		super.prepareData();
	}

	/** @override */
	prepareBaseData() {
		// Data modifications in this step occur before processing embedded
		// documents or derived data.
	}

	/**
	 * @override
	 * Augment the basic actor data with additional dynamic data. Typically,
	 * you'll want to handle most of your calculated/derived data in this step.
	 * Data calculated in this step should generally not exist in template.json
	 * (such as ability modifiers rather than ability scores) and should be
	 * available both inside and outside of character sheets (such as if an actor
	 * is queried and has a roll executed directly from it).
	 */
	prepareDerivedData() {
		const actorData = this;
		// const systemData = actorData.system;
		// const flags = actorData.flags.wutc || {};

		// Make separate methods for each Actor type (character, npc, etc.) to keep
		// things organized.
		this._prepareCharacterData(actorData);
		this._prepareNpcData(actorData);
		this._prepareArmorClass();
	}

	/**
	 * Prepare Character type specific data
	 */
	_prepareCharacterData(actorData) {
		if (actorData.type !== "character") return;

		// Make modifications to data here. For example:
		// const systemData = actorData.system;
	}

	/**
	 * Prepare NPC type specific data.
	 */
	_prepareNpcData(actorData) {
		if (actorData.type !== "npc") return;

		// Make modifications to data here. For example:
		const systemData = actorData.system;
		systemData.xp = systemData.cr * systemData.cr * 100;
	}

	_prepareArmorClass() {
		const ac = this.system.attributes.ac;
		if (!ac) return;

		let cfg = CONFIG.WUTC.armorClasses[ac.calc];

		// Identify Equipped Items
		// const armorTypes = new Set(Object.keys(CONFIG.WUTC.armorTypes));
		// const { armors, shields } = this.itemTypes.equipment.reduce(
		// 	(obj, equip) => {
		// 		const armor = equip.system.armor;
		// 		if (!equip.system.equipped || !armorTypes.has(armor?.type)) return obj;
		// 		if (armor.type === "shield") obj.shields.push(equip);
		// 		else obj.armors.push(equip);
		// 		return obj;
		// 	},
		// 	{ armors: [], shields: [] },
		// );
		const armors = [];
		const shields = [];

		// Determine base AC
		if (ac.calc === "default") {
			let formula = ac.calc === "custom" ? ac.formula : cfg.formula;
			if (armors.length) {
				if (armors.length > 1)
					this._preparationWarnings.push({
						message: game.i18n.localize("DND5E.WarnMultipleArmor"),
						type: "warning",
					});
				const armorData = armors[0].system.armor;
				// const isHeavy = armorData.type === "heavy";
				ac.armor = armorData.value ?? ac.armor;
				// ac.dex = isHeavy ? 0 : Math.min(armorData.dex ?? Infinity, this.system.abilities.dex?.mod ?? 0);
				ac.equippedArmor = armors[0];
			} else {
				ac.armor = 9;
			}

			const rollData = this.getRollData({ deterministic: true });
			rollData.attributes.ac = ac;
			try {
				const replaced = Roll.replaceFormulaData(formula, rollData);
				ac.base = Roll.safeEval(replaced);
			} catch (err) {
				this._preparationWarnings.push({
					message: game.i18n.localize("DND5E.WarnBadACFormula"),
					link: "armor",
					type: "error",
				});
				const replaced = Roll.replaceFormulaData(CONFIG.DND5E.armorClasses.default.formula, rollData);
				ac.base = Roll.safeEval(replaced);
			}
		}

		// Equipped Shield
		if (shields.length) {
			if (shields.length > 1)
				this._preparationWarnings.push({
					message: game.i18n.localize("DND5E.WarnMultipleShields"),
					type: "warning",
				});
			ac.shield = shields[0].system.armor.value ?? 0;
			ac.equippedShield = shields[0];
		}

		// Compute total AC and return
		ac.value = ac.base + (ac.shield ?? 0) + (ac.bonus ?? 0) + (ac.cover ?? 0);
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
			isTestRoll: true,
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
			isSaveRoll: true,
			event,
		});
	}
}
