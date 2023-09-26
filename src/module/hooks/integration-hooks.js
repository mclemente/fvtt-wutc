export default class IntegrationHooks {
	static async "item-piles-ready"() {
		game.itempiles.API.addSystemIntegration({
			VERSION: "1.0.6",

			// The actor class type is the type of actor that will be used for the default item pile actor that is created on first item drop.
			ACTOR_CLASS_TYPE: "container",

			// The item quantity attribute is the path to the attribute on items that denote how many of that item that exists
			ITEM_QUANTITY_ATTRIBUTE: "system.quantity",

			// The item price attribute is the path to the attribute on each item that determine how much it costs
			ITEM_PRICE_ATTRIBUTE: "system.price",

			// Item filters actively remove items from the item pile inventory UI that users cannot loot, such as spells, feats, and classes
			ITEM_FILTERS: [
				{
					path: "type",
					filters: "spell,trait",
				},
			],

			// Item similarities determines how item piles detect similarities and differences in the system
			ITEM_SIMILARITIES: ["name", "type", "system.armor.type", "system.type"],

			// Currencies in item piles is a versatile system that can accept actor attributes (a number field on the actor's sheet) or items (actual items in their inventory)
			// In the case of attributes, the path is relative to the "actor.system"
			// In the case of items, it is recommended you export the item with `.toObject()` and strip out any module data
			CURRENCIES: [
				{
					name: "Coins",
					type: "item",
					img: "icons/svg/coins.svg",
					abbreviation: "{#}C",
					data: {
						item: {
							_id: "item-piles-coins",
							name: "Coins",
							type: "equipment",
							img: "icons/svg/coins.svg",
							system: {
								description: "",
								gmNotes: "",
								notes: "",
								price: 1,
								quantity: 1,
								weight: 0.004,
								formula: "",
							},
						},
					},
					primary: true,
					exchangeRate: 1,
				},
			],
		});
	}

	static "polyglot.init"(LanguageProvider) {
		class WolvesUponTheCoastProvider extends LanguageProvider {
			get settings() {
				return {
					// System has a built-in setting to handle languages.
					replaceLanguages: {
						polyglotHide: true,
						...game.settings.settings.get("polyglot.replaceLanguages"),
					},
				};
			}

			addToConfig() {
				return;
			}

			removeFromConfig() {
				return;
			}

			getUserLanguages(actor) {
				let knownLanguages = new Set();
				let literateLanguages = new Set();
				const { languages } = actor.system.details || {};
				if (languages) {
					for (let lang of languages.spoken.split(/[,;]/)) knownLanguages.add(lang.toLowerCase());
					for (let lang of languages.written.split(/[,;]/)) literateLanguages.add(lang.toLowerCase());
				}
				return [knownLanguages, literateLanguages];
			}
		}
		game.polyglot.api.registerSystem(WolvesUponTheCoastProvider);
	}
}
