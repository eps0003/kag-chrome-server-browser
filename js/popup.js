var servers = [];
var canReload = true;

const REGEX_WEBSITE = /\b((?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?)\b/gi;
const REGEX_EMAIL = /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi;

$(function () {
	$("#slider").slider({
		range: true,
		values: [0, 100],
		create: function (e, ui) {
			updateSliderLabels([0, 100]);
		},
		change: function (e, ui) {
			updateSliderLabels(ui.values);
			filterServers();
		},
		slide: function (e, ui) {
			updateSliderLabels(ui.values);
			filterServers();
		},
	});

	$(".button").click(function () {
		if ($(this).hasClass("disabled")) return;

		const audio = new Audio("audio/menuclick.ogg");
		audio.currentTime = 0;
		audio.play();
	});

	$("#reload").click(function () {
		getServers();
	});

	$("#play").click(function () {
		if ($(this).hasClass("disabled")) return;
		joinServer();
	});

	$("#sort, #gamemodes").change(function () {
		filterServers();
		sortServers();
	});

	$("#modded").click(function () {
		const val = $("#modded").attr("value");
		$("#modded").attr("value", (val + 1) % 3);

		filterServers();
	});

	$("#password").click(function () {
		const val = $("#password").attr("value");
		$("#password").attr("value", (val + 1) % 3);

		filterServers();
	});

	getServers();
});

function updateSliderLabels(values) {
	$("#min-players").text(Math.min(...values) + "%");
	$("#max-players").text(Math.max(...values) + "%");
}

function getServers() {
	canReload = false;

	$("#server-grid").empty();
	$("#count").text("Loading servers...");

	$.get('https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true}]&' + new Date().valueOf(), function (data) {
		servers = data.serverList;

		const currentBuild = getCurrentBuild();
		for (const i in data.serverList) {
			const server = data.serverList[i];

			server.outdated = server.build !== currentBuild;
			server.address = `${server.IPv4Address}:${server.port}`;
			server.official = server.name.match(/(?=^KAG Official( Small)? \w+ (AUS?|EU|USA?)\b)|(?=^Official Modded Server (AUS?|EU|USA?)\b)/g);
		}
	})
		.fail(function () {
			servers = [];
			console.warn("Unable to retrieve servers");
		})
		.always(function () {
			canReload = true;
			updateServers();
		});
}

function updateServers() {
	$("#server-grid").empty();

	for (const server of servers) {
		//clone template elemement
		const element = cloneTemplateElement("#server-template");

		element.data("address", server.address);

		//name
		const nameSpan = element.find(".name span");
		nameSpan.text(server.name);
		nameSpan.attr("title", server.name);

		//official
		if (server.official) {
			element.addClass("official");
		}

		//outdated
		if (server.outdated) {
			element.addClass("outdated");
		}

		//modded
		if (server.usingMods) {
			element.addClass("modded");
		}

		//locked
		if (server.password) {
			element.addClass("locked");

			const passwordIcon = element.find(".password-icon");
			passwordIcon.css("background-image", "url(images/server_locked.png)");
			passwordIcon.attr("title", "Locked");
		}

		//gamemode
		const gamemodeIcon = element.find(".gamemode-icon");

		gamemodeIcon.attr("title", server.gameMode);

		if (server.gameMode.match(/ctf|capture the flag/gi)) {
			gamemodeIcon.css("background-image", "url(images/server_ctf.png)");
		} else if (server.gameMode.match(/tdm|team deathmatch/gi)) {
			gamemodeIcon.css("background-image", "url(images/server_tdm.png)");
		} else if (server.gameMode === "TTH") {
			gamemodeIcon.css("background-image", "url(images/server_tth.png)");
		} else if (server.gameMode === "Challenge") {
			gamemodeIcon.css("background-image", "url(images/server_challenge.png)");
		} else if (server.gameMode === "Sandbox") {
			gamemodeIcon.css("background-image", "url(images/server_sandbox.png)");
		} else if (server.gameMode.match(/zombie|zf/gi)) {
			gamemodeIcon.css("background-image", "url(images/server_zombies.png)");
		} else {
			gamemodeIcon.css("background-image", "url(images/server_unknown.png)");
		}

		//players
		const playersIcon = element.find(".players-icon");
		if (server.playerPercentage >= 1) {
			playersIcon.css("background-image", "url(images/server_full.png)");
		} else if (server.playerPercentage > 0) {
			const index = Math.min(3, Math.ceil(server.playerPercentage * 3));
			playersIcon.css("background-image", `url(images/server_players_${index}.png)`);
		}

		if (server.currentPlayers > 0) {
			playersIcon.attr("title", `${server.currentPlayers}/${server.maxPlayers}`);
		}

		//verified
		if (server.modsVerified) {
			const verifiedIcon = element.find(".verified-icon");
			verifiedIcon.css("background-image", "url(images/server_verified.png)");
			verifiedIcon.attr("title", `Verified Mods`);
		}

		//add to server list
		$("#server-grid").append(element);
	}

	filterServers();
	sortServers();

	//add gamemodes to dropdown
	const gamemodesVal = $("#gamemodes").val();
	$("#gamemodes option").slice(1).remove();
	servers
		.map((server) => server.gameMode)
		.filter((x, i, a) => a.indexOf(x) === i)
		.sort()
		.forEach((gamemode) =>
			$("#gamemodes").append(
				$("<option>", {
					value: gamemode,
					text: gamemode,
				})
			)
		);
	$("#gamemodes").val(gamemodesVal);

	$(".server").click(function () {
		selectServer(this);
	});

	$(".server").dblclick(function () {
		$("#play").click();
	});
}

function mode(arr) {
	const freq = {};
	for (const item of arr) {
		freq[item] = (freq[item] || 0) + 1;
	}

	let compare = 0;
	let mode;
	for (const item in freq) {
		if (freq[item] > compare) {
			compare = freq[item];
			mode = item;
		}
	}

	return Number(mode);
}

function getCurrentBuild() {
	return mode(servers.map((server) => server.build));
}

function filterServers() {
	let serverCount = 0;
	let playerCount = 0;

	$(".server").each((i, element) => {
		const server = getServerData(element);
		const visible = [filterOutdatedServer, filterLockedServer, filterModdedServer, filterOfficialServer, filterServerGamemode, filterServerPlayerCount].every((func) => func(server));

		if (visible) {
			$(element).show();

			serverCount++;
			playerCount += server.currentPlayers;
		} else {
			$(element).hide();
		}
	});

	//update server and player count
	$("#count").text(`${serverCount} ${plural(serverCount, "server")} with ${playerCount} ${plural(playerCount, "player")}`);
}

function filterOutdatedServer(server) {
	return !server.outdated;
}

function filterLockedServer(server) {
	const val = $("#password").attr("value");

	switch (Number(val)) {
		case 1:
			return !server.password;
		case 2:
			return server.password;
	}

	return true;
}

function filterModdedServer(server) {
	const val = $("#modded").attr("value");

	switch (Number(val)) {
		case 1:
			return !server.usingMods;
		case 2:
			return server.usingMods;
	}

	return true;
}

function filterOfficialServer(server) {
	const val = $("#sort").val();

	if (val === "officials") {
		return server.official;
	}

	return true;
}

function filterServerGamemode(server) {
	const val = $("#gamemodes").val();

	if (val === "All") {
		return true;
	}

	return server.gameMode === val;
}

function filterServerPlayerCount(server) {
	const vals = $("#slider")
		.slider("values")
		.sort((a, b) => a - b);

	if (vals[1] === 100) {
		vals[1] = Infinity;
	}

	return server.playerPercentage >= vals[0] * 0.01 && server.playerPercentage <= vals[1] * 0.01;
}

function cloneTemplateElement(id) {
	return $($(id).html());
}

function getSelectedServer() {
	return $(".server.selected");
}

function joinServer() {
	const address = $("#play").data("address");
	let url = `kag://${address}/`;

	if ($(".server.selected").hasClass("locked")) {
		const password = prompt("Enter server password");
		if (!password) return;
		url += password;
	}

	window.open(url);
}

function getServerData(element) {
	if (!$(element).length) return;

	const address = $(element).data("address");
	return servers.find((server) => server.address === address);
}

function plural(val, text, suffix = "s") {
	return val == 1 ? text : text + suffix;
}

function sortServers() {
	const val = $("#sort").val();

	$(".server")
		.sort((a, b) => {
			const serverA = getServerData(a);
			const serverB = getServerData(b);

			switch (val) {
				case "percentage":
					return sortServerPlayerPercentage(serverA, serverB);
				case "gamemode":
					return sortServerGamemode(serverA, serverB);
				case "size":
					return sortServerMapSize(serverA, serverB);
				case "name":
					return sortServerName(serverA, serverB);
				default:
					return sortServerPlayerCount(serverA, serverB);
			}
		})
		.appendTo("#server-grid");
}

function sortServerGamemode(a, b) {
	if (a.gameMode === b.gameMode) {
		if (a.name === b.name) {
			return compareCaseInsensitive(a.address, b.address);
		}
		return compareCaseInsensitive(a.name, b.name);
	}
	return compareCaseInsensitive(a.gameMode, b.gameMode);
}

function sortServerMapSize(a, b) {
	const mapSizeA = a.mapW * a.mapH;
	const mapSizeB = b.mapW * b.mapH;

	if (mapSizeA === mapSizeB) {
		if (a.name === b.name) {
			return compareCaseInsensitive(a.address, b.address);
		}
		return compareCaseInsensitive(a.name, b.name);
	}
	return mapSizeB - mapSizeA;
}

function sortServerName(a, b) {
	if (a.name === b.name) {
		return compareCaseInsensitive(a.address, b.address);
	}
	return compareCaseInsensitive(a.name, b.name);
}

function sortServerPlayerPercentage(a, b) {
	if (a.playerPercentage === b.playerPercentage) {
		if (a.name === b.name) {
			return compareCaseInsensitive(a.address, b.address);
		}
		return compareCaseInsensitive(a.name, b.name);
	}
	return b.playerPercentage - a.playerPercentage;
}

function sortServerPlayerCount(a, b) {
	if (a.currentPlayers === b.currentPlayers) {
		if (a.name === b.name) {
			return compareCaseInsensitive(a.address, b.address);
		}
		return compareCaseInsensitive(a.name, b.name);
	}
	return b.currentPlayers - a.currentPlayers;
}

function compareCaseInsensitive(a, b) {
	return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function selectServer(element) {
	if (!$(element).length || isServerSelected(element)) return;

	//select server
	$(".server").removeClass("selected");
	$(element).addClass("selected");

	updateServerInfo();

	//hide extension info
	$("#extension-info-grid").hide();

	//enable play button
	if (!$(element).hasClass("outdated")) {
		$("#play").removeClass("disabled");
		$("#play").data("address", $(element).data("address"));
	} else {
		$("#play").addClass("disabled");
		$("#play").removeData("address");
	}
}

function isServerSelected(element) {
	return $(element).hasClass("selected");
}

function updateServerInfo() {
	const server = getServerData(getSelectedServer());
	if (!server) return;

	//player count
	let players = `${server.currentPlayers} / ${server.maxPlayers}`;
	if (server.currentPlayers >= server.maxPlayers) players += " (FULL)";

	//reserved slots
	const reservedSlots = server.reservedPlayers ? `${Math.max(0, server.currentPlayers - server.maxPlayers)} / ${server.reservedPlayers}` : "(NONE)";

	//game state
	const gameState = server.gameState ? "GAME IN PROGRESS" : "BUILDING TIME";

	//spectators
	const spectators = server.spectatorPlayers ? `Spectators: ${server.spectatorPlayers}\n` : "";

	//description
	const description = server.description.trim().replace(REGEX_WEBSITE, `<a href="$1" target="_blank">$1</a>`).replace(REGEX_EMAIL, `<a href="mailto:$1" target="_blank">$1</a>`);

	//player list
	const playerList = server.playerList.length ? `Players: ${server.playerList.sort((a, b) => compareCaseInsensitive(a, b)).join(", ")}` : "";

	//add to panel
	$("#gamemode span").text(server.gameMode);
	$("#gamemode span").attr("title", server.gameMode);

	$("#key-info").html(`Players: ${players}<br />Reserved Slots: ${reservedSlots}<br />Map Size: ${server.mapW} x ${server.mapH}<br />${spectators}`);
	$("#game-state").text(gameState);
	$("#description").html(description);
	$("#players").text(playerList);

	getMinimap(server, function (img) {
		if ($(img).data("address") !== $(".server.selected").data("address")) return;
		$("#minimap img").replaceWith(img);

		let divW = $("#minimap").width();
		let divH = $("#minimap").height();
		let imgW = $(img).width();
		let imgH = $(img).height();

		//scroll or move minimap to center depending on size compared to container
		$("#minimap").scrollLeft((imgW - divW) / 2);
		$("#minimap").scrollTop((imgH - divH) / 2);
		if (divW > imgW) $(img).css("left", (divW - imgW) / 2);
		if (divH > imgH) $(img).css("top", (divH - imgH) / 2);
	});
}

function getMinimap(server, callback) {
	let img = new Image();
	$(img).data("address", server.address);
	$(img).attr("src", getMinimapURL(server));
	img.onload = function () {
		callback(this);
	};
	img.onerror = function () {
		img.src = "";
		callback(this);
	};
}

function getMinimapURL(server) {
	return `https://api.kag2d.com/v1/game/thd/kag/server/${server.IPv4Address}/${server.port}/minimap?${new Date().valueOf()}`;
}
