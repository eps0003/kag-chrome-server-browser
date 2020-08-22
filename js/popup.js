var servers = [];
var canReload = true;

$(function () {
	$("#slider").slider({
		range: true,
		values: [0, 100],
		create: function (e, ui) {
			updateSliderLabels([0, 100]);
		},
		change: function (e, ui) {
			updateSliderLabels(ui.values);
			updateServers();
		},
		slide: function (e, ui) {
			updateSliderLabels(ui.values);
			updateServers();
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
		getSelectedServer();
	});

	$("#sort, #gamemodes").change(function () {
		updateServers();
	});

	$("#modded").click(function () {
		const val = $("#modded").attr("value");
		$("#modded").attr("value", (val + 1) % 3);

		updateServers();
	});

	$("#password").click(function () {
		const val = $("#password").attr("value");
		$("#password").attr("value", (val + 1) % 3);

		updateServers();
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

			server.index = i;
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

	//filter servers
	let filteredServers = servers;
	filteredServers = filterOutdatedServers(filteredServers);
	filteredServers = filterLockedServers(filteredServers);
	filteredServers = filterModdedServers(filteredServers);
	filteredServers = filterOfficialServers(filteredServers);
	filteredServers = filterServerGamemode(filteredServers);
	filteredServers = filterServerPlayerCount(filteredServers);

	//update server and player count
	const serverCount = filteredServers.length;
	const playerCount = filteredServers.reduce((total, server) => (total += server.currentPlayers), 0);
	$("#count").text(`${serverCount} ${plural(serverCount, "server")} with ${playerCount} ${plural(playerCount, "player")}`);

	for (const server of filteredServers) {
		//clone template elemement
		const element = cloneTemplateElement("#server-template");

		element.attr("data-server-index", server.index);

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

	sortServers();
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

function filterOutdatedServers(servers) {
	return servers.filter((server) => !server.outdated);
}

function filterLockedServers(servers) {
	const val = $("#password").attr("value");

	switch (Number(val)) {
		case 1:
			return servers.filter((server) => !server.password);
		case 2:
			return servers.filter((server) => server.password);
	}

	return servers;
}

function filterModdedServers(servers) {
	const val = $("#modded").attr("value");

	switch (Number(val)) {
		case 1:
			return servers.filter((server) => !server.usingMods);
		case 2:
			return servers.filter((server) => server.usingMods);
	}

	return servers;
}

function filterOfficialServers(servers) {
	const val = $("#sort").val();

	if (val === "officials") {
		return servers.filter((server) => server.official);
	}

	return servers;
}

function filterServerGamemode(servers) {
	const val = $("#gamemodes").val();

	if (val === "All") {
		return servers;
	}

	return servers.filter((server) => server.gameMode === val);
}

function filterServerPlayerCount(servers) {
	const vals = $("#slider")
		.slider("values")
		.sort((a, b) => a - b);

	if (vals[1] === 100) {
		vals[1] = Infinity;
	}

	return servers.filter((server) => server.playerPercentage >= vals[0] * 0.01 && server.playerPercentage <= vals[1] * 0.01);
}

function cloneTemplateElement(id) {
	return $($(id).html());
}

function getSelectedServer() {
	return $(".server.selected");
}

function joinServer(server) {
	if (!server.outdated) {
		window.open(`kag://${server.address}/`);
	}
}

function getServerData(element) {
	if (!$(element).length) return;

	const index = $(element).data("server-index");
	return servers[index];
}

function plural(val, text, suffix = "s") {
	return val == 1 ? text : text + suffix;
}

function sortServers() {
	const val = $("#sort").val();

	$(".server")
		.sort(function (a, b) {
			const indexA = $(a).data("server-index");
			const indexB = $(b).data("server-index");

			const serverA = servers[indexA];
			const serverB = servers[indexB];

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
			return equalsCaseInsensitive(a.address, b.address);
		}
		return equalsCaseInsensitive(a.name, b.name);
	}
	return equalsCaseInsensitive(a.gameMode, b.gameMode);
}

function sortServerMapSize(a, b) {
	const mapSizeA = a.mapW * a.mapH;
	const mapSizeB = b.mapW * b.mapH;

	if (mapSizeA === mapSizeB) {
		if (a.name === b.name) {
			return equalsCaseInsensitive(a.address, b.address);
		}
		return equalsCaseInsensitive(a.name, b.name);
	}
	return mapSizeB - mapSizeA;
}

function sortServerName(a, b) {
	if (a.name === b.name) {
		return equalsCaseInsensitive(a.address, b.address);
	}
	return equalsCaseInsensitive(a.name, b.name);
}

function sortServerPlayerPercentage(a, b) {
	if (a.playerPercentage === b.playerPercentage) {
		if (a.name === b.name) {
			return equalsCaseInsensitive(a.address, b.address);
		}
		return equalsCaseInsensitive(a.name, b.name);
	}
	return b.playerPercentage - a.playerPercentage;
}

function sortServerPlayerCount(a, b) {
	if (a.currentPlayers === b.currentPlayers) {
		if (a.name === b.name) {
			return equalsCaseInsensitive(a.address, b.address);
		}
		return equalsCaseInsensitive(a.name, b.name);
	}
	return b.currentPlayers - a.currentPlayers;
}

function equalsCaseInsensitive(a, b) {
	return a.localeCompare(b, undefined, { sensitivity: "base" });
}
