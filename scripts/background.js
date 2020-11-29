chrome.runtime.onInstalled.addListener(function (details) {
	const thisVersion = chrome.runtime.getManifest().version;
	if (details.reason === "install") {
		installedExtension(thisVersion);
	} else if (details.reason === "update") {
		const prevVersion = details.previousVersion;
		updatedExtension(prevVersion, thisVersion);
	}
});

function installedExtension(version) {
	initSettings();
}

function updatedExtension(prevVersion, thisVersion) {}

function initSettings() {
	chrome.storage.sync.set({
		favorites: [],
		friends: [],

		sortDropdown: "count",

		moddedButton: 0,
		passwordButton: 0,
		officialsButton: 0,
		favoritesButton: 0,
		buttonVolume: 20,

		serverFlag: true,
		drag: false,

		sliderValues: [0, 100],

		autoSelectServer: false,
		autoSelectTopServer: false,
		displayOutdatedServers: false,

		badge: true,
		badgeValue: "all",

		notificationInterval: 6,
		notificationVolume: 0,

		refreshInterval: 1,
	});
}
