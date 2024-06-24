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
		const { actor, data, key, rollType } = this.object;
		let attribute = {};
		let reminders = [];
		if (rollType === "test") {
			attribute = data.characteristics[key];
		} else if (rollType === "save") {
			attribute = data.saves[key];
			if (key === "warding") {
				for (let item of actor.items) {
					if (item.type === "armor" && item.system.armor.type === "ward") {
						reminders.push({ name: item.name, reminder: item.system.armor.value });
					}
				}
			}
		}
		attribute = foundry.utils.mergeObject({ bonus: 0, penalty: 0 }, attribute);
		return {
			attribute,
			reminders,
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
		const properties = {
			toggleable: {},
			reminder: {},
		};
		for (const [key, value] of Object.entries(CONFIG.WUTC.weaponProperties)) {
			if (data.item.system.properties[key]) {
				if (value.toggleable) {
					properties.toggleable[key] = CONFIG.WUTC.weaponProperties[key];
				} else if (value.reminder !== false) {
					properties.reminder[key] = CONFIG.WUTC.weaponProperties[key];
				}
			}
		}
		return {
			attribute,
			config: CONFIG.WUTC.weaponProperties,
			hasProperties: {
				toggleable: Object.keys(properties.toggleable).length,
				reminder: Object.keys(properties.reminder).length,
			},
			properties,
			rollType,
		};
	}

	async _updateObject(ev, formData) {
		const { rollType, data } = this.object;
		const weapon = data.item.name;
		let { properties, target: targetId, bonus, penalty, additionalBonus } = foundry.utils.expandObject(formData);
		if (!properties) properties = {};
		const options = {
			success: 20,
			rollUnder: false,
			type: rollType,
		};
		const reasons = [];

		let term = `1d20`;
		let flavor = this.title;
		const targetToken = targetId ? getToken(targetId) : {};
		if (targetId) {
			const actor = targetToken.actor;
			if (actor) {
				targetId = targetToken.name;
				flavor = game.i18n.format("WUTC.AttackAgainstTarget", { target: targetId, weapon });
				if (actor.statuses.has("prone")) {
					options.success = 0;
					reasons.push(game.i18n.format("WUTC.AttackReasons.AutoHitProne", { target: targetId }));
				} else {
					const ac = actor.system.attributes.ac;
					if (ac) {
						if (properties.ignoreShields && ac.shield) {
							bonus += ac.value - ac.shield;
							reasons.push(
								game.i18n.format("WUTC.AttackReasons.IgnoreShields", {
									target: targetId,
									bonus: Math.abs(ac.shield),
								}),
							);
						}
						if (properties.piercing) {
							bonus += 7;
							reasons.push(
								game.i18n.format("WUTC.AttackReasons.Piercing", {
									target: targetId,
									bonus: Math.abs(ac.shield),
								}),
							);
						} else {
							bonus += ac.value;
						}
					}
				}
			}
		}

		if (bonus) {
			term += "+" + bonus;
		}
		if (penalty) {
			term += penalty;
		}
		if (additionalBonus.length) {
			if (!/^(\+|-|\*|\/)/.test(additionalBonus)) {
				term += "+" + additionalBonus;
			} else {
				term += additionalBonus;
			}
		}

		const item = this.object.actor;
		let flags = foundry.utils.mergeObject(data.flags, {
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
			target: targetToken,
			term: [term],
			properties,
			reasons,
			flags,
		};
		Hooks.call("wutc.preRollAttack", rollData, {});
		flags = rollData.flags;

		const roll = await new RollWUTC(rollData.term.join(""), rollData.data, options).evaluate({ async: true });
		Hooks.call("wutc.rollAttack", roll, rollData, {});

		if (roll.isSuccess && targetId) {
			flavor += `<br>${game.i18n.localize("WUTC.AttackHit")}`;
		} else if (targetId) {
			flavor += `<br>${game.i18n.localize("WUTC.AttackMiss")}`;
		}
		if (reasons.length) {
			flavor += "<br>" + reasons.join("<br>");
		}

		const messages = [];
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

		if (!properties.stunning && (roll.isSuccess || !targetId)) {
			let rollData = {
				actor: item.actor,
				data,
				target: targetToken,
				term: [data.item.system.formula],
				properties,
				reasons: [],
				flags,
			};
			Hooks.call("wutc.preRollDamage", rollData, {});
			const damageRoll = await new Roll(rollData.term.join(""), rollData.data, {}).evaluate({ async: true });
			Hooks.call("wutc.rollDamage", damageRoll, rollData, {});

			flavor = targetId
				? game.i18n.format("WUTC.DamageAgainstTarget", { target: targetId, weapon })
				: game.i18n.format("WUTC.DamageWithWeapon", { target: targetId, weapon });
			if (rollData.reasons.length) {
				flavor += "<br>" + rollData.reasons.join("<br>");
			}
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
