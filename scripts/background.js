var servers;
var displayMessage;
let previousPlayers = {};

chrome.runtime.onInstalled.addListener(function (details) {
	const thisVersion = chrome.runtime.getManifest().version;
	if (details.reason === "install") {
		installedExtension(thisVersion);
	} else if (details.reason === "update") {
		updatedExtension(details.previousVersion, thisVersion);
	}

	displayMessage = details.reason;
});

function installedExtension(version) {
	initSettings();
}

function updatedExtension(prevVersion, thisVersion) {
	//reset settings on major release
	if (thisVersion.charAt(0) !== prevVersion.charAt(0)) {
		chrome.storage.sync.clear();
		initSettings();
	}
}

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
			} else if (badgeValue === "friends") {
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

	chrome.storage.sync.get(["favorites", "notificationInterval", "notificationVolume", "passwords"], ({ favorites, notificationInterval, notificationVolume, passwords }) => {
		if (notificationInterval == 0) return;

		const notifications = [];

		for (const fav of favorites) {
			//get server
			const server = servers.find((x) => fav === x.address);
			if (!server) continue;

			const floor = Math.floor(server.currentPlayers / notificationInterval) * notificationInterval;

			//initialize previous players if not set yet
			if (previousPlayers[fav] === undefined) {
				previousPlayers[fav] = floor;
				continue;
			}

			//check if notification should be made
			if (server.currentPlayers >= Math.ceil(previousPlayers[fav] / notificationInterval + 1) * notificationInterval) {
				notifications.push(server);
				previousPlayers[fav] = floor;
			}

			//reset previous players if server becomes empty
			if (server.currentPlayers === 0) {
				previousPlayers[fav] = 0;
			} else if (server.currentPlayers < previousPlayers[fav] - notificationInterval) {
				previousPlayers[fav] = Math.ceil(server.currentPlayers / notificationInterval) * notificationInterval;
			}
		}

		if (notifications.length) {
			notifications.sort((a, b) => b.currentPlayers - a.currentPlayers);

			let id = notifications[0].address;
			let password = passwords[id];
			if (password) id += `/${password}`;

			chrome.notifications.create(id, {
				type: "list",
				title: "KAG Server Browser",
				message: "",
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
			open("kag://" + id);
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
		const ms = 60000 * refreshInterval;
		const delay = ms - (new Date() % ms);
		setTimeout(loop, delay);
	});
}

function getDefaultSettings() {
	return {
		favorites: [],
		friends: [],
		passwords: {},

		sortDropdown: "count",

		moddedButton: 0,
		passwordButton: 0,
		officialsButton: 0,
		favoritesButton: 0,
		buttonVolume: 20,

		serverFlag: true,
		drag: false,

		keyboardNavigation: true,

		sliderValues: [0, 100],

		autoSelectServer: false,
		autoSelectFirstServer: false,
		displayOutdatedServers: false,

		badge: true,
		badgeValue: "all",

		notificationInterval: "0",
		notificationVolume: 20,
		notificationClick: true,

		refreshInterval: 1,
	};
}

function initSettings() {
	chrome.storage.sync.set(getDefaultSettings());
}
