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
		},
		slide: function (e, ui) {
			updateSliderLabels(ui.values);
		},
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

	$.get('https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true}]&' + new Date().valueOf(), function (data) {
		servers = data.serverList;
		// for (const server of data.serverList) {
		// 	const address = getServerAddress(server);
		// 	servers[address] = server;
		// }
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

function getServerAddress(server) {
	return `${server.IPv4Address}:${server.port}`;
}

function updateServers() {
	//no servers
	if (!servers.length) {
		$("#server-grid").empty();
		return;
	}

	//filter servers
	let filteredServers = servers;
	filteredServers = filterOutdatedServers(servers);
	filteredServers = filterLockedServers(servers);
	filteredServers = filterModdedServers(servers);
	filteredServers = filterServerGamemode(servers);

	for (const server of filteredServers) {
		//clone template elemement
		const element = cloneTemplateElement("#server-template");

		element.attr("data-address", getServerAddress(server));
		element.find(".name").text(server.name);

		//official
		if (isOfficialServer(server)) {
			element.addClass("official");
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
		switch (server.gameMode) {
			case "CTF":
				gamemodeIcon.css("background-image", "url(images/server_ctf.png)");
				break;
			case "Team Deathmatch":
				gamemodeIcon.css("background-image", "url(images/server_tdm.png)");
				break;
			case "TTH":
				gamemodeIcon.css("background-image", "url(images/server_tth.png)");
				break;
			case "Challenge":
				gamemodeIcon.css("background-image", "url(images/server_challenge.png)");
				break;
			case "Sandbox":
				gamemodeIcon.css("background-image", "url(images/server_sandbox.png)");
				break;
			default:
				if (server.gameMode.match(/zombie|zf/gi)) {
					gamemodeIcon.css("background-image", "url(images/server_zombies.png)");
				} else {
					gamemodeIcon.css("background-image", "url(images/server_unknown.png)");
				}
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
	let currentBuild = getCurrentBuild();
	return servers.filter((server) => server.build === currentBuild);
}

function filterLockedServers(servers) {
	let val = $("#password").attr("value");

	switch (val) {
		case 1:
			return servers.filter((server) => !server.password);
		case 2:
			return servers.filter((server) => server.password);
	}

	return servers;
}

function filterModdedServers(servers) {
	let val = $("#modded").attr("value");

	switch (val) {
		case 1:
			return servers.filter((server) => !server.usingMods);
		case 2:
			return servers.filter((server) => server.usingMods);
	}

	return servers;
}

function filterServerGamemode(servers) {
	let val = $("#gamemodes").val();

	if (val === "All") {
		return servers;
	}

	return servers.filter((server) => server.gameMode === val);
}

function isOfficialServer(server) {
	return server.name.match(/(?=^KAG Official( Small)? \w+ (AUS?|EU|USA?)\b)|(?=^Official Modded Server (AUS?|EU|USA?)\b)/g);
}

function cloneTemplateElement(id) {
	return $($(id).html());
}
