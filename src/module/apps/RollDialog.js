import RollWUTC from "../dice/roll";
import { getTargets, getToken } from "../helpers/utils";

class BaseRollDialog extends FormApplication {
	constructor(object = {}, options = {}) {
		super(object, options);
		this.render(true);
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			template: "systems/wutc/templates/apps/roll-dialog.hbs",
			classes: ["roll-dialog", "wutc"],
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
}

export class RollDialog extends BaseRollDialog {
	async getData() {
		const { data, key, rollType } = this.object;
		let attribute = {};
		if (rollType === "test") {
			attribute = data.characteristics[key];
		} else if (rollType === "save") {
			attribute = data.saves[key];
		}
		attribute = mergeObject({ bonus: 0, penalty: 0 }, attribute);
		return {
			attribute,
			rollType,
		};
	}

	async _updateObject(ev, formData) {
		const { data, key, rollType } = this.object;
		const expanded = foundry.utils.expandObject(formData);
		const options = {
			rollUnder: false,
			type: rollType,
		};

		let term = `1d20`;
		let flavor = this.title;
		if (rollType === "test") {
			term = `${expanded.difficulty}d6`;
			options.success = data.characteristics[key].value;
			options.rollUnder = true;
		} else if (rollType === "save") {
			options.success = data.saves[key].value;
		} else if (rollType === "morale") {
			term = `2d6`;
			options.success = 7;
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

		const roll = await new RollWUTC(term, data, options).evaluate({ async: true });

		roll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			flavor,
			rollMode: game.settings.get("core", "rollMode"),
		});
	}
}

export class AttackDialog extends BaseRollDialog {
	async getData() {
		const { data, rollType } = this.object;
		const targets = getTargets();
		const attribute = {
			bonus: data.attributes.attack.value,
			penalty: 0,
			targets,
		};
		return {
			attribute,
			rollType,
		};
	}

	async _updateObject(ev, formData) {
		const { rollType, data } = this.object;
		const weapon = data.item.name;
		const expanded = foundry.utils.expandObject(formData);
		const options = {
			success: 20,
			rollUnder: false,
			type: rollType,
		};

		let term = `1d20`;
		let flavor = this.title;
		const targetId = expanded.target;
		let target = "";
		if (targetId) {
			const token = getToken(targetId);
			const actor = token.actor;
			if (actor) {
				target = token.name;
				flavor = game.i18n.format("WUTC.AttackAgainstTarget", { target, weapon });
				const ac = actor.system.attributes.ac;
				if (ac) {
					expanded.bonus += ac.value;
				}
			}
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

		const item = this.object.actor;
		let flags = mergeObject(data.flags, {
			wutc: {
				roll: {
					itemId: item.id,
					target: targetId,
					type: rollType,
				},
			},
		});
		const rollData = {
			actor: item.actor,
			data,
			flags,
		};
		flags = rollData.flags;

		const messages = [];

		const roll = await new RollWUTC(term, data, options).evaluate({ async: true });

		if (roll.isSuccess && target) {
			flavor += `<br>${game.i18n.localize("WUTC.AttackHit")}`;
		} else if (target) {
			flavor += `<br>${game.i18n.localize("WUTC.AttackMiss")}`;
		}

		messages.push(
			await roll.toMessage(
				{
					speaker: ChatMessage.getSpeaker({ actor: this.actor }),
					flavor,
					rollMode: game.settings.get("core", "rollMode"),
					flags,
				},
				{ create: false },
			),
		);

		if (roll.isSuccess || !target) {
			const damageRoll = await new Roll(data.item.system.formula, data, {}).evaluate({ async: true });
			flavor = target
				? game.i18n.format("WUTC.DamageAgainstTarget", { target, weapon })
				: game.i18n.format("WUTC.DamageWithWeapon", { target, weapon });
			flags.wutc.roll.type = "damage";
			messages.push(
				await damageRoll.toMessage(
					{
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						flavor,
						rollMode: game.settings.get("core", "rollMode"),
						flags,
					},
					{ create: false },
				),
			);
		}

		await ChatMessage.implementation.create(messages);
	}
}
