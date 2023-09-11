import { preLocalize } from "../helpers/utils.js";

export const WUTC = {};

WUTC.armorTypes = {
	light: "WUTC.Armor.Light",
	medium: "WUTC.Armor.Medium",
	heavy: "WUTC.Armor.Heavy",
	shield: "WUTC.Armor.Shield",
};
preLocalize("armorTypes");

WUTC.weaponTypes = {
	light: "WUTC.Weapon.Light",
	medium: "WUTC.Weapon.Medium",
	heavy: "WUTC.Weapon.Heavy",
};
preLocalize("weaponTypes");

WUTC.weaponProperties = {
	disarm: {
		roll: "attack",
		toggleable: true,
	},
	stun: {
		roll: "attack",
		toggleable: true,
	},
	sneak: {},
	ignoreShields: {},
	cleave: {},
	bounce: {},
	guardian: {},
	piercing: {
		roll: "attack",
	},
	aiming: {
		roll: "attack",
	},
	shatter: {
		roll: "attack",
	},
	sentinel: {},
	freeMovement: {},
	riposte: {},
	lobber: {},
	holdAttack: {},
	explodingDice: {},
	pushing: {},
	throwable: {},
	reach: {},
	twoHanded: {},
	ranged: {},
};
for (let key of Object.keys(WUTC.weaponProperties)) {
	WUTC.weaponProperties[key].label = `WUTC.Weapon.Properties.${key.capitalize()}.label`;
	WUTC.weaponProperties[key].desc = `WUTC.Weapon.Properties.${key.capitalize()}.desc`;
}
preLocalize("weaponProperties", { keys: ["label", "desc"], sort: true });

WUTC.characteristics = {
	str: {
		label: "Strength",
	},
};
preLocalize("characteristics", { keys: ["label"] });
