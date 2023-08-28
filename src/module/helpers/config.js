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

WUTC.characteristics = {
	str: {
		label: "Strength",
	},
};
preLocalize("characteristics", { keys: ["label"] });
