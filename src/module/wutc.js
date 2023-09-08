// Import sheet classes.
import { ActorSheetWUTC } from "./sheets/actor-sheet.js";
import { ItemSheetWUTC } from "./sheets/item-sheet.js";
import { default as CombatTrackerWUTC } from "./sidebar/combat-tracker.js";
// Import helper/utility classes and constants.
import { WUTC } from "./helpers/config.js";
import { registerSettings } from "./helpers/settings.js";
import { preloadHandlebarsTemplates } from "./helpers/templates.js";

import * as dice from "./dice/_module.js";
import * as documents from "./documents/_module.js";
import * as utils from "./helpers/utils.js";

/* -------------------------------------------- */
/*  Define Module Structure                     */
/* -------------------------------------------- */

globalThis.wutc = {
	config: WUTC,
	dice,
	documents,
	rollItemMacro,
};

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", async () => {
	globalThis.wutc = game.wutc = Object.assign(game.system, globalThis.wutc);

	// Add custom constants for configuration.
	CONFIG.WUTC = WUTC;
	CONFIG.Dice.WUTCRoll = dice.RollWUTC;
	CONFIG.Dice.rolls.push(dice.RollWUTC);

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
		formula: "1d10 - @attributes.ac.value",
		decimals: 2,
	};

	// Define custom Document classes
	CONFIG.Actor.documentClass = documents.ActorWUTC;
	CONFIG.Item.documentClass = documents.ItemWUTC;
	CONFIG.Combat.documentClass = documents.CombatWUTC;

	CONFIG.ui.combat = CombatTrackerWUTC;

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("wutc", ActorSheetWUTC, { makeDefault: true });
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("wutc", ItemSheetWUTC, { makeDefault: true });

	// Register custom system settings
	registerSettings();

	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

Hooks.once("i18nInit", () => utils.performPreLocalization(CONFIG.WUTC));

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper("times", function (n, block) {
	let accum = "";
	for (let i = 0; i < n; ++i) accum += block.fn(i);
	return accum;
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
	// Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
	Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", documents.chat.onRenderChatMessage);

// eslint-disable-next-line no-unused-vars
Hooks.on("renderChatLog", (app, html, data) => documents.ItemWUTC.chatListeners(html));

// eslint-disable-next-line no-unused-vars
Hooks.on("renderChatPopout", (app, html, data) => documents.ItemWUTC.chatListeners(html));

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
	// First, determine if this is a valid owned item.
	if (data.type !== "Item") return;
	if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
		return ui.notifications.warn("You can only create macro buttons for owned Items");
	}
	// If it is, retrieve it based on the uuid.
	const item = await Item.fromDropData(data);

	// Create the macro command using the uuid.
	const command = `game.wutc.rollItemMacro("${data.uuid}");`;
	let macro = game.macros.find((m) => m.name === item.name && m.command === command);
	if (!macro) {
		macro = await Macro.create({
			name: item.name,
			type: "script",
			img: item.img,
			command: command,
			flags: { "wutc.itemMacro": true },
		});
	}
	game.user.assignHotbarMacro(macro, slot);
	return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
	// Reconstruct the drop data so that we can load the item.
	const dropData = {
		type: "Item",
		uuid: itemUuid,
	};
	// Load the item from the uuid.
	Item.fromDropData(dropData).then((item) => {
		// Determine if the item loaded and if it's an owned item.
		if (!item || !item.parent) {
			const itemName = item?.name ?? itemUuid;
			return ui.notifications.warn(
				`Could not find item ${itemName}. You may need to delete and recreate this macro.`,
			);
		}

		// Trigger the item roll
		item.roll();
	});
}
