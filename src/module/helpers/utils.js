/* -------------------------------------------- */
/*  Object Helpers                              */
/* -------------------------------------------- */

/**
 * Sort the provided object by its values or by an inner sortKey.
 * @param {object} obj        The object to sort.
 * @param {string} [sortKey]  An inner key upon which to sort.
 * @returns {object}          A copy of the original object that has been sorted.
 */
export function sortObjectEntries(obj, sortKey) {
	let sorted = Object.entries(obj);
	if (sortKey) sorted = sorted.sort((a, b) => a[1][sortKey].localeCompare(b[1][sortKey]));
	else sorted = sorted.sort((a, b) => a[1].localeCompare(b[1]));
	return Object.fromEntries(sorted);
}

/* -------------------------------------------- */
/*  Config Pre-Localization                     */
/* -------------------------------------------- */

/**
 * Storage for pre-localization configuration.
 * @type {object}
 * @private
 */
const _preLocalizationRegistrations = {};

/**
 * Mark the provided config key to be pre-localized during the init stage.
 * @param {string} configKeyPath          Key path within `CONFIG.DND5E` to localize.
 * @param {object} [options={}]
 * @param {string} [options.key]          If each entry in the config enum is an object,
 *                                        localize and sort using this property.
 * @param {string[]} [options.keys=[]]    Array of localization keys. First key listed will be used for sorting
 *                                        if multiple are provided.
 * @param {boolean} [options.sort=false]  Sort this config enum, using the key if set.
 */
export function preLocalize(configKeyPath, { key, keys = [], sort = false } = {}) {
	if (key) keys.unshift(key);
	_preLocalizationRegistrations[configKeyPath] = { keys, sort };
}

/* -------------------------------------------- */

/**
 * Execute previously defined pre-localization tasks on the provided config object.
 * @param {object} config  The `CONFIG.DND5E` object to localize and sort. *Will be mutated.*
 */
export function performPreLocalization(config) {
	for (const [keyPath, settings] of Object.entries(_preLocalizationRegistrations)) {
		const target = foundry.utils.getProperty(config, keyPath);
		_localizeObject(target, settings.keys);
		if (settings.sort) foundry.utils.setProperty(config, keyPath, sortObjectEntries(target, settings.keys[0]));
	}
}

/* -------------------------------------------- */

/**
 * Localize the values of a configuration object by translating them in-place.
 * @param {object} obj       The configuration object to localize.
 * @param {string[]} [keys]  List of inner keys that should be localized if this is an object.
 * @private
 */
function _localizeObject(obj, keys) {
	for (const [k, v] of Object.entries(obj)) {
		const type = typeof v;
		if (type === "string") {
			obj[k] = game.i18n.localize(v);
			continue;
		}

		if (type !== "object") {
			console.error(
				new Error(
					`Pre-localized configuration values must be a string or object, ${type} found for "${k}" instead.`,
				),
			);
			continue;
		}
		if (!keys?.length) {
			console.error(new Error("Localization keys must be provided for pre-localizing when target is an object."));
			continue;
		}

		for (const key of keys) {
			if (!v[key]) continue;
			v[key] = game.i18n.localize(v[key]);
		}
	}
}

export function getTargets() {
	return game.user.targets.ids
		.filter((id) => {
			return getToken(id);
		})
		.map((id) => {
			const token = getToken(id);
			return {
				id,
				name: token.name,
			};
		});
}

export function getToken(targetId) {
	return canvas.tokens.placeables.find((t) => t.id === targetId);
}
