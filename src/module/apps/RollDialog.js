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
		return {
			isSaveRoll: !!this.object.isSaveRoll,
			isTestRoll: !!this.object.isTestRoll,
		};
	}

	async _updateObject(ev, formData) {
		const expanded = foundry.utils.expandObject(formData);
		let term = `1d20`;
		if (this.object.isTestRoll) {
			term = `${expanded.difficulty}d6`;
		}

		if (expanded.bonus.length) {
			const bonus = expanded.bonus;
			if (!/^(\+|-|\*|\/)/.test(bonus)) {
				term += "+" + bonus;
			} else {
				term += bonus;
			}
		}

		const options = {
			rollUnder: false,
		};
		if (this.object.isTestRoll) {
			options.success = this.object.data.characteristics[this.object.key].value;
			options.rollUnder = true;
		} else if (this.object.isSaveRoll) {
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
