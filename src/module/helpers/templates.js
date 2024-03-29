/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
	return loadTemplates([
		// Actor partials.
		"systems/wutc/templates/actor/parts/actor-notes.html",
		"systems/wutc/templates/actor/parts/actor-features.html",
		"systems/wutc/templates/actor/parts/actor-items.html",
		"systems/wutc/templates/actor/parts/actor-spells.html",
		"systems/wutc/templates/actor/parts/actor-effects.html",

		// Item partials.
		"systems/wutc/templates/item/parts/item-notes.html",

		// Apps
		"systems/wutc/templates/apps/item-card.hbs",
		"systems/wutc/templates/apps/roll-dialog.hbs",

		// Sidebar
		"systems/wutc/templates/sidebar/combat-tracker.hbs",
	]);
};
