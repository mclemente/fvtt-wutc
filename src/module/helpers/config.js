import { preLocalize } from "../helpers/utils.js";

export const WUTC = {};

WUTC.armorTypes = {
	light: "WUTC.Armor.Light",
	medium: "WUTC.Armor.Medium",
	heavy: "WUTC.Armor.Heavy",
	shield: "WUTC.Armor.Shield",
	ward: "WUTC.Armor.Ward",
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
		toggleable: true,
	},
	stunning: {
		toggleable: true,
	},
	sneak: {},
	ignoreShields: {},
	cleave: {},
	bounce: {},
	guardian: {},
	piercing: {},
	aiming: {},
	shatter: {},
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
