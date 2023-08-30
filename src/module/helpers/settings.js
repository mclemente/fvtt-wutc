// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT

export function registerSettings() {
	// Register any custom system settings here
	game.settings.register("wutc", "systemMigrationVersion", {
		name: "System Migration Version",
		scope: "world",
		config: false,
		type: String,
		default: "",
	});

	game.settings.register("wutc", "autoInit", {
		name: "WUTC.Settings.autoInit",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
	});
}
