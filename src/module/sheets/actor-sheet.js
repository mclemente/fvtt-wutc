import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ActorSheetWUTC extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["wutc", "sheet", "actor"],
			width: 600,
			height: 600,
			tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }],
		});
	}

	/** @override */
	get template() {
		const path = "systems/wutc/templates/actor";
		if (!game.user.isGM && this.actor.limited) {
			return `${path}/limited-sheet.html`;
		}
		if (this.actor.type === "npc") {
			return `${path}/character-sheet.html`;
		}
		return `${path}/${this.actor.type}-sheet.html`;
	}

	/* -------------------------------------------- */

	/** @override */
	getData() {
		// Retrieve the data structure from the base sheet. You can inspect or log
		// the context variable to see the structure, but some key properties for
		// sheets are the actor object, the data object, whether or not it's
		// editable, the items array, and the effects array.
		const context = super.getData();

		// Use a safe clone of the actor data for further operations.
		const actorData = this.actor.toObject(false);

		// Add the actor's data to context.data for easier access, as well as flags.
		context.system = actorData.system;
		context.flags = actorData.flags;
		context.isNpc = actorData.type === "npc";

		// Prepare character data and items.
		this._prepareItems(context);

		// Prepare NPC data and items.
		// if (actorData.type == "npc") {
		// }

		// Add roll data for TinyMCE editors.
		context.rollData = context.actor.getRollData();

		// Prepare active effects
		context.effects = prepareActiveEffectCategories(this.actor.effects);

		context.isGM = game.user.isGM;

		return context;
	}

	/**
	 * Organize and classify Items for Character sheets.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareItems(context) {
		// Initialize containers.
		const gear = {
			weapon: {
				label: game.i18n.localize("WUTC.WeaponPl"),
				items: [],
				attr: game.i18n.localize("WUTC.RollFormula"),
				dataset: "weapon",
			},
			equipment: {
				label: game.i18n.localize("WUTC.Equipment"),
				items: [],
				attr: game.i18n.localize("WUTC.RollFormula"),
				dataset: "equipment",
			},
			armor: {
				label: game.i18n.localize("WUTC.ArmorPl"),
				items: [],
				attr: game.i18n.localize("WUTC.ArmorClass"),
				dataset: "armor",
			},
		};
		const features = [];
		const spells = [];

		// Iterate through items, allocating to containers
		for (let i of context.items) {
			i.img = i.img || DEFAULT_TOKEN;
			// Append to gear.
			if (["armor", "equipment", "weapon"].includes(i.type)) {
				gear[i.type].items.push(i);
			}
			// Append to features.
			else if (i.type === "trait") {
				features.push(i);
			}
			// Append to spells.
			else if (i.type === "spell") {
				spells.push(i);
			}
		}

		// Assign and return
		const encumbrance = context.system.attributes.encumbrance;
		encumbrance.diff = encumbrance.max - encumbrance.value;
		context.gear = gear;
		context.features = features;
		context.spells = spells;
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		// Render the item sheet for viewing/editing prior to the editable check.
		html.find(".item-edit").click((ev) => {
			const li = $(ev.currentTarget).parents(".item");
			const item = this.actor.items.get(li.data("itemId"));
			item.sheet.render(true);
		});

		// -------------------------------------------------------------
		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) return;

		// Add Inventory Item
		html.find(".item-create").click(this._onItemCreate.bind(this));

		html.find(".item-toggle").click((ev) => {
			ev.preventDefault();
			const li = $(ev.currentTarget).parents(".item");
			const item = this.actor.items.get(li.data("itemId"));
			return item.update({ ["system.equipped"]: !foundry.utils.getProperty(item, "system.equipped") });
		});

		html.find(".item-weight").click((ev) => {
			ev.preventDefault();
			const li = $(ev.currentTarget).parents(".item");
			const item = this.actor.items.get(li.data("itemId"));
			return item.update({ ["system.ignoreWeight"]: !foundry.utils.getProperty(item, "system.ignoreWeight") });
		});

		// Delete Inventory Item
		html.find(".item-delete").click((ev) => {
			const li = $(ev.currentTarget).parents(".item");
			const item = this.actor.items.get(li.data("itemId"));
			item.delete();
			li.slideUp(200, () => this.render(false));
		});

		// Active Effect management
		html.find(".effect-control").click((ev) => onManageActiveEffect(ev, this.actor));

		// Rollable abilities.
		html.find(".item .rollable").click(this._onRoll.bind(this));

		html.find(".ability .rollable").click(this._onRollTest.bind(this));

		html.find(".save .rollable").click(this._onRollSave.bind(this));

		html.find(".morale .rollable").click(this._onMoraleCheck.bind(this));

		html.find(".ramming .rollable").click(this._onRammingCheck.bind(this));

		html.find(".sinking .rollable").click(this._onSinkingCheck.bind(this));

		// Drag events for macros.
		if (this.actor.owner) {
			let handler = (ev) => this._onDragStart(ev);
			html.find("li.item").each((i, li) => {
				if (li.classList.contains("inventory-header")) return;
				li.setAttribute("draggable", true);
				li.addEventListener("dragstart", handler, false);
			});
		}
	}

	/**
	 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
	 * @param {Event} event   The originating click event
	 * @private
	 */
	async _onItemCreate(event) {
		event.preventDefault();
		const header = event.currentTarget;
		// Get the type of item to create.
		const type = header.dataset.type;
		// Grab any data associated with this control.
		const data = foundry.utils.duplicate(header.dataset);
		// Initialize a default name.
		const name = game.i18n.format("WUTC.NewItem", {
			new: game.i18n.localize("WUTC.New"),
			item: type.capitalize(),
		});
		// Prepare the item object.
		const itemData = {
			name: name,
			type: type,
			system: data,
		};
		// Remove the type from the dataset since it's in the itemData.type prop.
		delete itemData.system["type"];

		// Finally, create the item!
		return await Item.create(itemData, { parent: this.actor });
	}

	_onMoraleCheck(event) {
		event.preventDefault();
		this.actor.rollMorale({ event });
	}

	_onRammingCheck(event) {
		event.preventDefault();
		this.actor.rollRam({ event });
	}

	_onSinkingCheck(event) {
		event.preventDefault();
		this.actor.rollSink({ event });
	}

	/**
	 * Handle clickable rolls.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	_onRoll(event) {
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;

		if (dataset.rollType == "item") {
			const itemId = element.closest(".item").dataset.itemId;
			const item = this.actor.items.get(itemId);
			if (item) {
				return item.roll(event);
			}
		}
	}

	_onRollTest(event) {
		event.preventDefault();
		const key = event.currentTarget.dataset.key;
		this.actor.rollTest(key, { event });
	}

	_onRollSave(event) {
		event.preventDefault();
		const key = event.currentTarget.dataset.key;
		this.actor.rollSave(key, { event });
	}
}
