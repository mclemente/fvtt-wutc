/* eslint-disable no-unused-vars */
export default class CoreHooks {
	static "wutc.preRollAttack"({ actor, data, target, term, properties, reasons, flags }) {
		const item = data.item;
	}

	static "wutc.rollAttack"(roll, { actor, data, target, term, properties, reasons, flags }) {
		const item = data.item;
		if (roll.isSuccess && properties.stunning) {
			reasons.push(game.i18n.format("WUTC.AttackReasons.Stunning", { target: target.name }));
		}
	}

	static "wutc.preRollDamage"({ actor, data, target, term, properties, reasons, flags }) {
		const item = data.item;
		if (target?.actor?.statuses.has("prone") && properties.sneak) {
			term[0] = "2d6kh";
			reasons.push(game.i18n.localize("WUTC.DamageReasons.Sneak"));
		}
		if (properties.disarm) {
			term.push("-3");
			reasons.push(game.i18n.localize("WUTC.DamageReasons.Disarm"));
		}
	}

	static "wutc.rollDamage"(roll, { actor, data, target, term, properties, reasons, flags }) {
		const item = data.item;
		if (properties.bounce && roll.total >= 4) {
			reasons.push(game.i18n.localize("WUTC.DamageReasons.Bounce"));
		}
	}
}
