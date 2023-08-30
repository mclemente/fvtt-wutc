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

export function onRenderChatMessage(app, html, data) {
	highlightSuccessFailure(app, html, data);
	// if (game.settings.get("wutc", "autoCollapseItemCards")) html.find(".card-content").hide();
}
