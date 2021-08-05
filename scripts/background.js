let servers;
let previousPlayers = {};

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
	processNotifications();
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

function processNotifications() {
	chrome.notifications.getAll((ids) => {
		for (const id in ids) {
			chrome.notifications.clear(id);
		}
	});

	chrome.storage.sync.get(["favorites", "notificationInterval", "notificationVolume"], ({ favorites, notificationInterval, notificationVolume }) => {
		if (notificationInterval === "0") return;

		const notifications = [];

		for (const fav of favorites) {
			//previous players haven't been stored
			if (previousPlayers[fav] === undefined) continue;

			//find server
			const server = servers.find((x) => fav === x.address);
			if (!server) continue;

			const floor = Math.floor(server.currentPlayers / notificationInterval) * notificationInterval;

			if (previousPlayers[fav] < floor && server.currentPlayers >= floor) {
				notifications.push(server);
			}
		}

		if (notifications.length) {
			notifications.sort((a, b) => b.currentPlayers - a.currentPlayers);

			chrome.notifications.create(notifications[0].address, {
				type: "list",
				title: "KAG Server Browser",
				message: "test",
				items: notifications.map((x) => ({ title: `${x.currentPlayers}/${x.maxPlayers}`, message: x.name })),
				iconUrl: "images/kag_icon_128.png",
				silent: true,
			});

			if (notificationVolume) {
				const audio = new Audio("audio/spawn.ogg");
				audio.currentTime = 0;
				audio.volume = notificationVolume / 100;
				audio.play();
			}
		}
	});
}

chrome.notifications.onClicked.addListener((id) => {
	chrome.storage.sync.get("notificationClick", ({ notificationClick }) => {
		if (notificationClick) {
			window.open("kag://" + id);
		}
	});
});

loop();
function loop() {
	getServers()
		.then((x) => {
			if (servers) {
				previousPlayers = {};
				for (const server of servers) {
					previousPlayers[server.address] = server.currentPlayers;
				}
			}

			servers = x;

			receivedServers();
		})
		.catch(errorReceivingServers);

	chrome.storage.sync.get("refreshInterval", ({ refreshInterval }) => {
		const ms = 1000 * refreshInterval;
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
