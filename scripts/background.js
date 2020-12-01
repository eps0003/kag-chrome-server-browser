let servers;

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

function receivedServers() {
	updateBadge();
}

function errorReceivingServers(err) {
	console.warn(err);

	chrome.storage.sync.get("badge", ({ badge }) => {
		if (badge) {
			chrome.browserAction.setBadgeText({ text: " " });
		}
	});
}

function countPlayersInServer(servers, friends = null) {
	return servers.reduce((t, server) => {
		if (friends) {
			t += server.playerList.reduce((t, friend) => (t += friends.includes(friend)), 0);
		} else {
			t += server.currentPlayers;
		}
		return t;
	}, 0);
}

function updateBadge() {
	chrome.storage.sync.get(["badge", "badgeValue", "favorites", "friends"], ({ badge, badgeValue, favorites, friends }) => {
		let players = "";

		if (badge) {
			const favoriteServers = servers.filter((server) => favorites.includes(server.address));

			if (badgeValue === "favorites") {
				players = countPlayersInServer(favoriteServers);
			} else if (badgeValue === "friendsAll") {
				players = countPlayersInServer(servers, friends);
			} else if (badgeValue === "friendsFavorites") {
				players = countPlayersInServer(favoriteServers, friends);
			} else {
				players = countPlayersInServer(servers);
			}
		}

		chrome.browserAction.setBadgeText({ text: players.toString() });
	});
}

loop();
function loop() {
	getServers()
		.then((x) => {
			servers = x;
			receivedServers();
		})
		.catch(errorReceivingServers);

	chrome.storage.sync.get("refreshInterval", ({ refreshInterval }) => {
		const ms = 60000 * refreshInterval;
		const delay = ms - (new Date() % ms);
		setTimeout(loop, delay);
	});
}

function getDefaultSettings() {
	return {
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

		notificationInterval: "6",
		notificationVolume: 0,

		refreshInterval: 1,
	};
}

function initSettings() {
	chrome.storage.sync.set(getDefaultSettings());
}
