import { WutcAttackDialog } from "../apps/RollDialog";
import RollWUTC from "../dice/roll";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export default class ItemWUTC extends Item {
	/**
	 * Augment the basic Item data model with additional dynamic data.
	 */
	prepareData() {
		// As with the actor class, items are documents that can have their data
		// preparation methods overridden (such as prepareBaseData()).
		super.prepareData();
	}

	prepareDerivedData() {
		if (this.type === "weapon") {
			this._prepareWeaponFormula();
		}
	}

	_prepareWeaponFormula() {
		const type = this.system.type;
		if (!type) return;

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

		return rollData;
	}

	/**
	 * Handle clickable rolls.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	async roll(event) {
		const item = this;

		// Initialize chat data.
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const rollMode = game.settings.get("core", "rollMode");
		const label = `[${item.type}] ${item.name}`;

		// If there's no roll data, send a chat message.
		if (!this.system.formula) {
			ChatMessage.create({
				speaker: speaker,
				rollMode: rollMode,
				flavor: label,
				content: item.system.description ?? "",
			});
		}
		// Otherwise, create a roll and send a chat message from it.
		else {
			let title = game.i18n.format(`WUTC.Attack`, { weapon: this.name }) ?? "";
			const data = this.getRollData();
			if (event.altKey || event.ctrlKey || event.shiftKey) {
				event.preventDefault();
				let term = "1d20";
				let bonus = this.actor.system?.attributes?.attack?.value ?? 0;
				const target = canvas.tokens.placeables.find((t) => t.id === game.user.targets.ids[0]) ?? "";
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
			return new WutcAttackDialog({
				title,
				actor: this,
				data,
				rollType: "attack",
				event,
			});
		}
	}
}
