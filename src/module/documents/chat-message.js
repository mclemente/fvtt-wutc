// eslint-disable-next-line no-unused-vars
export function highlightSuccessFailure(message, html, data) {
	if (!message.isRoll || !message.isContentVisible || !message.rolls.length) return;

	// Highlight rolls where the first part is a d20 roll
	let rollResult = message.rolls.find((r) => {
		return r.options.success;
	});
	if (!rollResult) return;

	// Highlight successes and failures
	if (rollResult.isSuccess) {
		html.find(".dice-total").addClass("success");
	} else {
		html.find(".dice-total").addClass("failure");
	}
}

function displayChatActionButtons(message, html, data) {
	const roll = message.getFlag("wutc", "roll");
	if (roll?.type === "damage" && roll?.target) {
		const diceRoll = html.find(".dice-roll");
		if (diceRoll.length > 0) {
			// If the user is the message author or the actor owner, proceed
			let actor = game.actors.get(data.message.speaker.actor);
			if ((actor && actor.isOwner) || game.user.isGM || data.author.id === game.user.id) {
				const buttons = diceRoll.find("button[data-action]");
				if (!buttons.length) {
					const newButton = `
					<div class="wutc card-buttons">
						<button data-action="damage">
							${game.i18n.localize("WUTC.Damage")}
						</button>
					</div>`;
					diceRoll.after($(newButton));
				}
			}
		}
	}
	const chatCard = html.find(".wutc.chat-card");
	if (chatCard.length > 0) {
		const flavor = html.find(".flavor-text");
		if (flavor.text() === html.find(".item-name").text()) flavor.remove();

		// If the user is the message author or the actor owner, proceed
		let actor = game.actors.get(data.message.speaker.actor);
		if (actor && actor.isOwner) return;
		else if (game.user.isGM || data.author.id === game.user.id) return;

		// Otherwise conceal action buttons except for saving throw
		const buttons = chatCard.find("button[data-action]");
		buttons.each((i, btn) => {
			if (btn.dataset.action === "save") return;
			btn.style.display = "none";
		});
	}
}

export function onRenderChatMessage(app, html, data) {
	displayChatActionButtons(app, html, data);
	highlightSuccessFailure(app, html, data);
}
