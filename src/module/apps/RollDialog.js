import RollWUTC from "../dice/RollWUTC";

export class RollDialog extends FormApplication {
	constructor(object = {}, options = {}) {
		super(object, options);
		this.render(true);
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			template: "systems/wutc/templates/apps/roll-dialog.hbs",
			classes: ["roll-dialog"],
			width: 400,
			height: "auto",
		});
	}

	get title() {
		return this.object.title ?? game.i18n.localize("WUTC.RollDialog");
	}

	activateListeners(html) {
		super.activateListeners(html);
		html[0].querySelector("button#close")?.addEventListener("click", this.close.bind(this));
	}

	async getData() {
		let attribute;
		if (this.object.rollType === "test") {
			const key = this.object.key;
			attribute = this.object.data.characteristics[key];
		} else if (this.object.rollType === "save") {
			const key = this.object.key;
			attribute = this.object.data.saves[key];
		}
		attribute = mergeObject({ bonus: 0, penalty: 0 }, attribute);
		return {
			attribute,
			rollType: this.object.rollType,
		};
	}

	async _updateObject(ev, formData) {
		const expanded = foundry.utils.expandObject(formData);
		let term = `1d20`;
		if (this.object.rollType === "test") {
			term = `${expanded.difficulty}d6`;
		}

		if (expanded.bonus) {
			term += "+" + expanded.bonus;
		}
		if (expanded.penalty) {
			term += expanded.penalty;
		}
		if (expanded.additionalBonus.length) {
			const additionalBonus = expanded.additionalBonus;
			if (!/^(\+|-|\*|\/)/.test(additionalBonus)) {
				term += "+" + additionalBonus;
			} else {
				term += additionalBonus;
			}
		}

		const options = {
			rollUnder: false,
		};
		if (this.object.rollType === "test") {
			options.success = this.object.data.characteristics[this.object.key].value;
			options.rollUnder = true;
		} else if (this.object.rollType === "save") {
			options.success = this.object.data.saves[this.object.key].value;
		}
		//TODO add success against a target

		const roll = await new RollWUTC(term, this.object.data, options).evaluate({ async: true });
		roll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			flavor: this.title,
			rollMode: game.settings.get("core", "rollMode"),
		});
	}
}
