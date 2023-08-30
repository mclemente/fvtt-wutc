export default class CombatTrackerWUTC extends CombatTracker {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			template: "systems/wutc/templates/sidebar/combat-tracker.hbs",
			classes: ["tab", "sidebar-tab", "wutc"],
		});
	}
	async getData(options) {
		const data = await super.getData(options);
		for (const turn of data.turns) {
			const combatant = this.viewed?.combatants.get(turn.id, { strict: true });
			foundry.utils.mergeObject(turn, {
				type: combatant?.actor.type,
			});
		}
		return data;
	}
}
