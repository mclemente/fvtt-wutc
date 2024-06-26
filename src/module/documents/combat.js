export default class CombatWUTC extends Combat {
	async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
		// Structure input data
		ids = typeof ids === "string" ? [ids] : ids;
		const currentId = this.combatant?.id;
		const chatRollMode = game.settings.get("core", "rollMode");

		// Iterate over Combatants, performing an initiative roll for each
		const updates = [];
		const messages = [];
		for (let [i, id] of ids.entries()) {
			// Get Combatant data (non-strictly)
			const combatant = this.combatants.get(id);
			if (!combatant?.isOwner) continue;

			if (combatant.actor.type !== "character") {
				updates.push({ _id: id, initiative: 0.5 });
			} else {
				// Produce an initiative roll for the Combatant
				const roll = combatant.getInitiativeRoll(formula);
				await roll.evaluate({ async: true });
				updates.push({ _id: id, initiative: roll.total });

				// Construct chat message data
				let messageData = foundry.utils.mergeObject(
					{
						speaker: ChatMessage.getSpeaker({
							actor: combatant.actor,
							token: combatant.token,
							alias: combatant.name,
						}),
						flavor: game.i18n.format("COMBAT.RollsInitiative", { name: combatant.name }),
						flags: { "core.initiativeRoll": true },
					},
					messageOptions,
				);
				const chatData = await roll.toMessage(messageData, { create: false });

				// If the combatant is hidden, use a private roll unless an alternative rollMode was explicitly requested
				chatData.rollMode =
					"rollMode" in messageOptions
						? messageOptions.rollMode
						: combatant.hidden
						? CONST.DICE_ROLL_MODES.PRIVATE
						: chatRollMode;

				// Play 1 sound for the whole rolled set
				if (i > 0) chatData.sound = null;
				messages.push(chatData);
			}
		}
		if (!updates.length) return this;

		// Update multiple combatants
		await this.updateEmbeddedDocuments("Combatant", updates);

		// Ensure the turn order remains with the same combatant
		if (updateTurn && currentId) {
			await this.update({ turn: this.turns.findIndex((t) => t.id === currentId) });
		}

		// Create multiple chat messages
		await ChatMessage.implementation.create(messages);
		return this;
	}

	async createEmbeddedDocuments(embeddedName, data = [], context = {}) {
		const createData = data.filter((datum) => {
			const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.id === datum.tokenId);
			if (!token) return false;

			const { actor } = token;
			if (!actor) {
				ui.notifications.warn(`${token.name} has no associated actor.`);
				return false;
			}

			if (actor.type === "container") {
				const type = game.i18n.localize(`TYPES.Actor.${actor.type}`);
				ui.notifications.info(
					game.i18n.format("WUTC.Combat.ExcludingFromInitiative", { type, actor: actor.name }),
				);
				return false;
			}
			return true;
		});

		return super.createEmbeddedDocuments(embeddedName, createData, context);
	}

	_sortCombatants(a, b) {
		const initA = Number.isNumeric(a.initiative) ? a.initiative : Infinity;
		const initB = Number.isNumeric(b.initiative) ? b.initiative : Infinity;
		return initA - initB || (a.id > b.id ? 1 : -1);
	}
	async startCombat() {
		//Init autoroll
		if (game.settings.get("wutc", "autoInit")) {
			const combatantIds = this.combatants.filter((c) => c.initiative === null).map((c) => c.id);
			await this.rollInitiative(combatantIds);
		}
		return super.startCombat();
	}
	async nextRound() {
		const PlayerCombatants = this.combatants.filter((c) => c.actor.type === "character");
		for (const combatant of PlayerCombatants) {
			combatant.updateSource({ initiative: null });
		}
		if (game.settings.get("wutc", "autoInit")) {
			const combatantIds = PlayerCombatants.map((c) => c.id);
			await this.rollInitiative(combatantIds);
		} else {
			await this.update({ combatants: PlayerCombatants.toObject() }, { diff: false });
		}
		await super.nextRound();
	}
}
