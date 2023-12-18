import { AttackDialog } from "../apps/RollDialog";
import RollWUTC from "../dice/roll";
import { getTargets, getToken } from "../helpers/utils";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export default class ItemWUTC extends Item {
	static getDefaultArtwork(actorData) {
		if (actorData.type === "equipment") return super.getDefaultArtwork(actorData);
		const img = {
			armor: "systems/wutc/assets/icons/svg/armor-vest.svg",
			weapon: "icons/svg/sword.svg",
			spell: "systems/wutc/assets/icons/svg/scroll-unfurled.svg",
			trait: "systems/wutc/assets/icons/svg/skills.svg",
		};
		return {
			img: img[actorData.type],
			texture: {
				src: img[actorData.type],
			},
		};
	}

	get hasAttack() {
		return this.type === "weapon";
	}

	get hasDamage() {
		return this.hasAttack && !!this.system.formula;
	}

	prepareDerivedData() {
		super.prepareDerivedData();
		if (this.type === "weapon") {
			this._prepareWeaponFormula();
		}
	}

	_prepareWeaponFormula() {
		const type = this.system.type;
		if (!type || this.system.customizeFormula) return;
		switch (type) {
			case "light":
				this.system.formula = "2d6kl";
				break;
			case "heavy":
				this.system.formula = "2d6kh";
				break;
			case "medium":
			default:
				this.system.formula = "1d6";
		}
		if (this.system.properties?.explodingDice) {
			this.system.formula += "x";
		}
	}

	/**
	 * Prepare a data object which is passed to any Roll formulas which are created related to this Item
	 * @private
	 */
	getRollData() {
		// If present, return the actor's roll data.
		if (!this.actor) return null;
		const rollData = this.actor.getRollData();
		rollData.item = foundry.utils.deepClone(this);
		if (!rollData.flags) rollData.flags = {};

		return rollData;
	}

	/* ----------------- */

	/**
	 * Handle clickable rolls.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	async roll(event = {}, options = {}) {
		// If there's no roll data, send a chat message.
		if (!this.system.formula) return this.displayCard(options);
		// Otherwise, create a roll and send a chat message from it.
		else {
			let title = game.i18n.format(`WUTC.AttackWithWeapon`, { weapon: this.name }) ?? "";
			const data = this.getRollData();
			data.flags["wutc.itemData"] = this.toObject();
			if (event.altKey || event.ctrlKey || event.shiftKey) {
				event.preventDefault();
				let term = "1d20";
				let bonus = this.actor.system?.attributes?.attack?.value ?? 0;
				const target = getToken(game.user.targets.ids[0]) ?? "";
				if (target && target.actor?.system.attributes.ac) {
					title = game.i18n.format("WUTC.AttackAgainstTarget", { target: target.name });
					bonus += target.actor.system.attributes.ac.value;
					if (bonus) {
						term += `+ ${bonus}`;
					}
				}

				const flags = {
					wutc: {
						rollType: "attack",
					},
				};
				if (target?.id) {
					flags.wutc.target = target.id;
				}
				mergeObject(flags, data.flags);
				const roll = await new RollWUTC(term, data, {}).evaluate({ async: true });

				return roll.toMessage({
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					flavor: title,
					rollMode: game.settings.get("core", "rollMode"),
				});
			}
			return new AttackDialog({
				title,
				actor: this,
				data,
				rollType: "attack",
				event,
			});
		}
	}

	async displayCard(options = {}) {
		const token = this.actor.token;
		const templateData = {
			actor: this.actor,
			tokenId: token?.uuid || null,
			item: this,
			data: await this.getChatData(),
		};
		const html = await renderTemplate("systems/wutc/templates/chat/item-card.hbs", templateData);

		// Create the ChatMessage data object
		const chatData = {
			user: game.user.id,
			type: CONST.CHAT_MESSAGE_TYPES.OTHER,
			content: html,
			flavor: this.system.chatFlavor || this.name,
			speaker: ChatMessage.getSpeaker({ actor: this.actor, token }),
			flags: { "core.canPopout": true },
		};

		// Apply the roll mode to adjust message visibility
		ChatMessage.applyRollMode(chatData, options.rollMode ?? game.settings.get("core", "rollMode"));

		// Create the Chat Message or return its data
		const card = options.createMessage !== false ? await ChatMessage.create(chatData) : chatData;
		return card;
	}

	async getChatData(htmlOptions = {}) {
		const data = this.toObject().system;

		// Rich text description
		data.description = await TextEditor.enrichHTML(data.description, {
			async: true,
			relativeTo: this,
			rollData: this.getRollData(),
			...htmlOptions,
		});

		return data;
	}

	/* -------------------------------------------- */
	/*  Item Rolls - Attack, Damage, Saves, Checks  */
	/* -------------------------------------------- */

	/**
	 * Apply listeners to chat messages.
	 * @param {HTML} html  Rendered chat message.
	 */
	static chatListeners(html) {
		html.on("click", ".card-buttons button", this._onChatCardAction.bind(this));
	}

	/* -------------------------------------------- */

	/**
	 * Get the Actor which is the author of a chat card
	 * @param {HTMLElement} message    The chat card being used
	 * @returns {Actor|null}        The Actor document or null
	 * @private
	 */
	static async _getChatCardActor(message) {
		const actorId = message.speaker.actor;
		return game.actors.get(actorId) || null;
	}

	/* -------------------------------------------- */

	/**
	 * Handle execution of a chat card action via a click event on one of the card buttons
	 * @param {Event} event       The originating click event
	 * @returns {Promise}         A promise which resolves once the handler workflow is complete
	 * @private
	 */
	static async _onChatCardAction(event) {
		event.preventDefault();

		// Extract card data
		const button = event.currentTarget;
		button.disabled = true;
		const card = button.closest(".message");
		const messageId = card.dataset.messageId;
		const message = game.messages.get(messageId);
		const action = button.dataset.action;

		// Recover the actor for the chat card
		const actor = await this._getChatCardActor(message);
		if (!actor) return;

		// Validate permission to proceed with the roll
		if (!(game.user.isGM || actor.isOwner)) return;

		// Get the Item from stored flag data or by the item ID on the Actor
		const storedData = message.getFlag("wutc", "itemData");
		const itemId = message.getFlag("wutc", "roll").itemId;
		const item = storedData ? new this(storedData, { parent: actor }) : actor.items.get(itemId);
		if (!item) {
			const err = game.i18n.format("WUTC.ActionWarningNoItem", { item: card.dataset.itemId, name: actor.name });
			return ui.notifications.error(err);
		}

		// Handle different actions
		let targets;
		if (action === "damage") {
			const damage = message.rolls[0].total;
			targets = getTargets();
			for (let tokenData of targets) {
				const token = getToken(tokenData.id);
				if (token) {
					const hp = token.actor.system.attributes.hp.value;
					await token.actor.update({ "system.attributes.hp.value": hp - damage });
				}
			}
		}

		// Re-enable the button
		button.disabled = false;
	}
}
