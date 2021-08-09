const background = chrome.extension.getBackgroundPage();
let servers = [];
let settings = {};
let canReload = true;
let selectedServer;

const REGEX_WEBSITE = /\b((?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?)\b/gi;
const REGEX_EMAIL = /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi;

$(function () {
	if (background.displayMessage) {
		if (background.displayMessage === "install") {
			let text = [
				//
				`Thanks for installing my extension! I hope it will be useful to you.`,
				`Be sure to leave a review on the <a href="https://chrome.google.com/webstore/detail/aipcclcgemecihikpdgfoonlfpjkekmp" target="_blank">store page</a> and share it with others.`,
				`The extension is open source on <a href="https://github.com/eps0003/kag-chrome-server-browser" target="_blank">GitHub</a>. Feel free to contribute or leave feedback and suggestions.`,
				`Please consider supporting my work by <a href="https://buymeacoffee.com/epsilul" target="_blank">buying me a coffee</a>.`,
			];
			InfoModal("install-modal", "KAG Server List", text.join("<br /><br />"), 500);
		} else if (background.displayMessage === "update") {
			let text = [
				//
				`Thanks for using my extension! I hope it's been useful to you.`,
				`The extension has been rewritten from scratch. As a result, you will most likely need to reset your settings from the options menu for the extension to work properly.`,
				`You can view a full changelog on the <a href="https://forum.thd.vg/threads/27522" target="_blank">forum thread</a>.`,
				`Be sure to leave a review on the <a href="https://chrome.google.com/webstore/detail/aipcclcgemecihikpdgfoonlfpjkekmp" target="_blank">store page</a> and share it with others.`,
				`The extension is now open source on <a href="https://github.com/eps0003/kag-chrome-server-browser" target="_blank">GitHub</a>. Feel free to contribute or leave feedback and suggestions.`,
				`Please consider supporting my work by <a href="https://buymeacoffee.com/epsilul" target="_blank">buying me a coffee</a>.`,
			];
			InfoModal("update-modal", "Extension update", text.join("<br /><br />"), 500);
		}

		$(".modal-close").click(function () {
			background.displayMessage = null;
		});
	}

	chrome.storage.sync.get(null, function (data) {
		settings = data;

		setDefaults();

		$("#slider").slider({
			range: true,
			values: settings.sliderValues,
			create: function (e, ui) {
				updateSliderLabels(settings.sliderValues);
			},
			change: function (e, ui) {
				updateSliderLabels(ui.values);
				filterServers();
			},
			slide: function (e, ui) {
				updateSliderLabels(ui.values);

				//manually set values so it doesnt use the previous values when filtering servers
				$("#slider").slider("values", ui.values);

				filterServers();
			},
			stop: function (e, ui) {
				chrome.storage.sync.set({ sliderValues: ui.values });
			},
		});

		$(document).keydown(function (e) {
			if (e.key === "Escape") {
				if (isContextMenuVisible()) {
					e.preventDefault();
					closeContextMenu();
				} else if (isModalOpen()) {
					e.preventDefault();
					closeTopmostModal();
				}
			}
		});

		$(document).on("click", ".button", function () {
			if ($(this).hasClass("disabled")) return;

			if (settings.buttonVolume) {
				const audio = new Audio("../audio/menuclick.ogg");
				audio.currentTime = 0;
				audio.volume = settings.buttonVolume / 100;
				audio.play();
			}
		});

		$("#reload").click(function () {
			reloadServers();
		});

		$("#play").click(function () {
			if ($(this).hasClass("disabled")) return;
			joinServer();
		});

		$("#sort, #gamemodes").change(function () {
			chrome.storage.sync.set({ sortDropdown: $("#sort").val() });

			filterServers();
			sortServers();
		});

		$(".toggle").click(function () {
			const currentVal = $(this).attr("data-value");
			const val = (currentVal + 1) % 3;
			const id = $(this).attr("id");

			$(this).attr("data-value", val);
			chrome.storage.sync.set({ [id + "Button"]: val });

			filterServers();
		});

		$("#search").on("input", function () {
			filterServers();

			//select only visible server
			if (settings.autoSelectServer && $(".server:visible").length === 1) {
				selectServer(".server:visible");
			}
		});

		$("#players").on("click", ".player", function () {
			if (isDragging("#info")) return;
			toggleFriend(this);
		});

		$("#options").click(function () {
			chrome.runtime.openOptionsPage();
		});

		$(document).keydown(function (e) {
			let usedKeybind = true;

			if (settings.keyboardNavigation) {
				if ((e.ctrlKey && e.key === "r") || e.key === "F5") {
					$("#reload").click();
				} else if (e.key === "Enter") {
					if ($(".modal input").is(":focus")) {
						//click modal ok button
						$(":focus").siblings(".modal-ok").click();
					} else {
						//click play button
						$("#play").click();
					}
				} else if (e.ctrlKey && e.key === "m") {
					$("#modded").click();
				} else if (e.ctrlKey && e.key === "p") {
					$("#password").click();
				} else if (e.ctrlKey && e.key === "o") {
					$("#officials").click();
				} else if (e.ctrlKey && e.key === "f") {
					$("#favorites").click();
				} else if (e.ctrlKey && e.key === " ") {
					toggleFavoriteServer(".server.selected");
				} else if (e.key === "Tab") {
					//cycle through sort options
					if (e.shiftKey) {
						//previous sort option
						if ($("#sort option:selected").prop("index") === 0) {
							//doesnt auto loop like .next() does for some reason
							$("#sort option:selected").prop("selected", false);
							$("#sort option:last").prop("selected", true);
						} else {
							$("#sort option:selected").prop("selected", false).prev().prop("selected", true);
						}
					} else {
						//next sort option
						$("#sort option:selected").prop("selected", false).next().prop("selected", true);
					}

					sortServers();
				} else if (e.key === "ArrowUp") {
					scrollUpList(e);
				} else if (e.key === "ArrowDown") {
					scrollDownList(e);
				} else {
					usedKeybind = false;
				}
			}

			if (!usedKeybind) {
				if (!$(".modal input").is(":focus")) {
					$("#search").focus();
				}
			} else {
				e.preventDefault();
			}
		});

		reloadServers();
	});
});

function scrollUpList(e) {
	let server;

	if (e.ctrlKey && e.shiftKey) {
		if ($(".server.favorite:visible").length) {
			//first favorite
			server = $(".server:visible.favorite:first");
		}
	} else if (e.shiftKey) {
		//first server
		server = $(".server:visible:first");
	} else if (e.ctrlKey) {
		if ($(".server.favorite:visible").length) {
			//prev favorite
			server = $(".server.selected").prevAll(".favorite:visible:first");
			if (!$(server).length) {
				server = $(".server.favorite:visible:last");
			}
		}
	} else {
		//prev server
		server = $(".server.selected").prevAll(":visible:first");
		if (!$(server).length) {
			server = $(".server:visible:last");
		}
	}

	selectServer(server);
	scrollToServer(server);
}

function scrollDownList(e) {
	let server;

	if (e.ctrlKey && e.shiftKey) {
		if ($(".server.favorite:visible").length) {
			//last favorite
			server = $(".server:visible.favorite:last");
		}
	} else if (e.shiftKey) {
		//last server
		server = $(".server:visible:last");
	} else if (e.ctrlKey) {
		if ($(".server.favorite:visible").length) {
			//next favorite
			server = $(".server.selected").nextAll(".favorite:visible:first");
			if (!$(server).length) {
				server = $(".server.favorite:visible:first");
			}
		}
	} else {
		//next server
		server = $(".server.selected").nextAll(":visible:first");
		if (!$(server).length) {
			server = $(".server:visible:first");
		}
	}

	selectServer(server);
	scrollToServer(server);
}

function scrollToServer(element) {
	element = $(element);
	if (!element.length || element.is(":hidden")) return;

	let container = $("#server-list");
	let scrollTop = $(container).scrollTop() + element.position().top - $(container).height() / 2 + 4;
	container.stop().animate({ scrollTop }, 300, "easeOutQuart");
}

function isDragging(element) {
	return $(element).hasClass("dragging");
}

function updateSliderLabels(values) {
	$("#min-players").text(Math.min(...values) + "%");
	$("#max-players").text(Math.max(...values) + "%");
}

function reloadServers() {
	if (!canReload) return;

	canReload = false;

	selectedServer = $(".server.selected").data("address");

	$("#server-grid").empty();
	$("#count").text("Loading servers...");

	getServers()
		.then((x) => {
			servers = x;
			updateServers();
		})
		.catch((err) => {
			console.warn(err);
			servers = [];
		})
		.finally(() => {
			canReload = true;
		});
}

function updateServers() {
	$("#server-grid").empty();

	for (const i in servers) {
		const server = servers[i];

		//clone template element
		const element = cloneTemplateElement("#server-template");

		element.attr("data-address", server.address);

		//select
		if (selectedServer === server.address) {
			selectServer(element);
		}

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
			passwordIcon.css("background-image", "url(../images/server_locked.png)");
			passwordIcon.attr("title", "Locked");
		}

		//favorite
		if (isFavoriteServer(server.address)) {
			$(element).addClass("favorite");
		}

		//gamemode
		const gamemodeIcon = element.find(".gamemode-icon");

		gamemodeIcon.attr("title", server.gameMode);

		if (server.gameMode.match(/ctf|capture the flag/gi)) {
			gamemodeIcon.css("background-image", "url(../images/server_ctf.png)");
		} else if (server.gameMode.match(/tdm|team deathmatch/gi)) {
			gamemodeIcon.css("background-image", "url(../images/server_tdm.png)");
		} else if (server.gameMode === "TTH") {
			gamemodeIcon.css("background-image", "url(../images/server_tth.png)");
		} else if (server.gameMode === "Challenge") {
			gamemodeIcon.css("background-image", "url(../images/server_challenge.png)");
		} else if (server.gameMode === "Sandbox") {
			gamemodeIcon.css("background-image", "url(../images/server_sandbox.png)");
		} else if (server.gameMode.match(/zombie|zf/gi)) {
			gamemodeIcon.css("background-image", "url(../images/server_zombies.png)");
		} else {
			gamemodeIcon.css("background-image", "url(../images/server_unknown.png)");
		}

		updateServerPlayersIcon(element, server);

		//verified
		if (server.modsVerified) {
			const verifiedIcon = element.find(".verified-icon");
			element.addClass("verified");
			verifiedIcon.attr("title", `Verified Mods`);
		}

		//flag
		if (settings.serverFlag && server.country) {
			const flag = $("<div>");
			flag.addClass(`flag flag-${server.countryCode.toLowerCase()}`);
			flag.attr("title", server.country);
			element.append(flag);
		}

		//add to server list
		$("#server-grid").append(element);
	}

	filterServers();
	sortServers();

	addGamemodesToDropdown();

	if (settings.autoSelectFirstServer) {
		selectServer($(".server:visible").first());
	}

	$(".server").click(function () {
		if (isDragging("#server-list")) return;
		selectServer(this);
	});

	$(".server").dblclick(function () {
		if (isDragging("#server-list")) return;
		$("#play").click();
	});

	$(".server .favorite-icon").click(function (e) {
		if (isDragging("#server-list")) return;
		toggleFavoriteServer($(this).parent());
		e.stopPropagation();
	});

	$(".server .flag").click(function (e) {
		if (isDragging("#server-list")) return;
		filterServersByCountry(this);
		scrollToServer(getSelectedServer());
		e.stopPropagation();
	});

	$(".server .gamemode-icon").click(function (e) {
		if (isDragging("#server-list")) return;
		filterServersByGamemode(this);
		scrollToServer(getSelectedServer());
		e.stopPropagation();
	});

	$(".server .players-icon").click(function (e) {
		if (isDragging("#server-list") || $(this).parent().hasClass("empty")) return;
		filterEmptyServers();
		scrollToServer(getSelectedServer());
		e.stopPropagation();
	});

	$(".server .password-icon").click(function (e) {
		if (isDragging("#server-list") || !$(this).parent().hasClass("locked")) return;
		filterLockedServers();
		scrollToServer(getSelectedServer());
		e.stopPropagation();
	});

	$(".server > *:not(.name)").dblclick(function (e) {
		e.stopPropagation();
	});
}

function updateServerPlayersIcon(element, server) {
	if (!$(element).length || !server) return;

	//players
	const friendsOnline = settings.friends.filter((username) => server.playerList.includes(username)).length;
	const friendsPercentage = friendsOnline / Math.max(server.maxPlayers, 1);
	const playersIcon = $(element).find(".players-icon");

	if (server.playerPercentage >= 1) {
		const friendsIndex = Math.min(friendsOnline, 1);
		playersIcon.css("background-image", `url(../images/server_full_${friendsIndex}.png)`);
	} else if (server.playerPercentage > 0) {
		const index = Math.min(3, Math.ceil(server.playerPercentage * 3));
		const friendsIndex = Math.min(Math.ceil(friendsPercentage * 3), 3);
		playersIcon.css("background-image", `url(../images/server_players_${index}${friendsIndex}.png)`);
	}

	if (server.currentPlayers > 0) {
		const friendCount = friendsOnline ? ` (${friendsOnline})` : "";
		playersIcon.attr("title", `${server.currentPlayers}/${server.maxPlayers}${friendCount}`);
	} else {
		$(element).addClass("empty");
	}
}

function addGamemodesToDropdown() {
	//remember selected gamemode
	const gamemodesVal = $("#gamemodes").val();

	//remove all gamemodes
	$("#gamemodes option").slice(1).remove();

	//add gamemodes
	servers
		.map((server) => server.gameMode)
		.filter(filterUnique)
		.sort()
		.forEach((gamemode) =>
			$("#gamemodes").append(
				$("<option>", {
					value: gamemode,
					text: gamemode,
				})
			)
		);

	//reselect selected gamemode
	$("#gamemodes").val(gamemodesVal);
}

function filterServers() {
	let serverCount = 0;
	let playerCount = 0;

	$(".server").each((i, element) => {
		const server = getServerData(element);
		const visible = [filterOutdatedServer, filterLockedServer, filterModdedServer, filterOfficialServer, filterServerGamemode, filterServerPlayerCount, filterFavoriteServer, filterServerSearch].every((func) => func(element, server));

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

function filterOutdatedServer(element, server) {
	return settings.displayOutdatedServers || !$(element).hasClass("outdated");
}

function filterLockedServer(element, server) {
	const val = $("#password").attr("data-value");

	switch (Number(val)) {
		case 1:
			return !$(element).hasClass("locked");
		case 2:
			return $(element).hasClass("locked");
	}

	return true;
}

function filterModdedServer(element, server) {
	const val = $("#modded").attr("data-value");

	switch (Number(val)) {
		case 1:
			return !$(element).hasClass("modded");
		case 2:
			return $(element).hasClass("modded");
	}

	return true;
}

function filterOfficialServer(element, server) {
	const val = $("#officials").attr("data-value");

	switch (Number(val)) {
		case 1:
			return !$(element).hasClass("official");
		case 2:
			return $(element).hasClass("official");
	}

	return true;
}

function filterServerGamemode(element, server) {
	const val = $("#gamemodes").val();
	return val === "All" || server.gameMode === val;
}

function filterServerPlayerCount(element, server) {
	const vals = $("#slider")
		.slider("values")
		.sort((a, b) => a - b);

	if (vals[1] === 100) {
		vals[1] = Infinity;
	}

	return server.playerPercentage >= vals[0] * 0.01 && server.playerPercentage <= vals[1] * 0.01;
}

function filterFavoriteServer(element, server) {
	const val = $("#favorites").attr("data-value");

	switch (Number(val)) {
		case 1:
			return !$(element).hasClass("favorite");
		case 2:
			return $(element).hasClass("favorite");
	}

	return true;
}

function filterServerSearch(element, server) {
	const andCheck = $("#search").val().toUpperCase().split(/\s+/).filter(Boolean);
	return andCheck.every((word) => {
		const orCheck = word.split(/\/+/).filter(Boolean);
		return orCheck.some((word) => foundSearchTerm(word, server));
	});
}

function foundSearchTerm(word, server) {
	return (
		//server name
		server.name.toUpperCase().includes(word) ||
		//player name
		server.playerList.some((player) => player.toUpperCase().includes(word)) ||
		//server gamemode
		server.gameMode.toUpperCase().includes(word) ||
		//allow tdm acronym
		(server.gameMode === "Team Deathmatch" && "TDM".includes(word)) ||
		//ip address
		(word.match(/[:\.]/) && server.address.includes(word)) ||
		//server description
		server.description.toUpperCase().includes(word) ||
		//server country
		(server.country && server.country.toUpperCase().includes(word))
	);
}

function cloneTemplateElement(id) {
	return $($(id).html());
}

function getSelectedServer() {
	return $(".server.selected");
}

function getIDFromIP(ip) {
	return ip.replace(/\./g, "-").replace(":", "_");
}

function joinServer() {
	const address = $(".server.selected").data("address");

	if ($(".server.selected").hasClass("locked")) {
		let password = settings.passwords[address];
		PasswordModal(`password-modal-${getIDFromIP(address)}`, password);
	} else {
		window.location = "kag://" + address;
	}
}

function getServerData(element) {
	if (!$(element).length) return;

	const address = $(element).data("address");
	return servers.find((server) => server.address === address);
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
				case "country":
					return sortServerCountry(serverA, serverB);
				default:
					return sortServerPlayerCount(serverA, serverB);
			}
		})
		.appendTo("#server-grid");
}

function sortServerGamemode(a, b) {
	if (a.gameMode === b.gameMode) {
		return sortServerName(a, b);
	}
	return compareCaseInsensitive(a.gameMode, b.gameMode);
}

function sortServerMapSize(a, b) {
	const mapSizeA = a.mapW * a.mapH;
	const mapSizeB = b.mapW * b.mapH;

	if (mapSizeA === mapSizeB) {
		return sortServerName(a, b);
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
		return sortServerName(a, b);
	}
	return b.playerPercentage - a.playerPercentage;
}

function sortServerPlayerCount(a, b) {
	if (a.currentPlayers === b.currentPlayers) {
		return sortServerName(a, b);
	}
	return b.currentPlayers - a.currentPlayers;
}

function sortServerCountry(a, b) {
	if (a.country === b.country) {
		return sortServerName(a, b);
	}
	return compareCaseInsensitive(a.country, b.country);
}

function selectServer(element) {
	if (!$(element).length || isServerSelected(element)) return;

	closeModal(".password-modal");

	//select server
	$(".server").removeClass("selected");
	$(element).addClass("selected");

	updateServerInfo();

	//hide extension info
	$("#extension-info-grid").hide();

	//enable play button
	if (!$(element).hasClass("outdated")) {
		$("#play").removeClass("disabled");
	} else {
		$("#play").addClass("disabled");
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

	//add to panel
	$("#gamemode span").text(server.gameMode);
	$("#gamemode span").attr("title", server.gameMode);

	$("#key-info").html(`Players: ${players}<br />Reserved Slots: ${reservedSlots}<br />Map Size: ${server.mapW} x ${server.mapH}<br />${spectators}`);
	$("#game-state").text(gameState);
	$("#description").html(description);

	updatePlayerList(server);

	if (server.minimap) {
		setMinimap(server.minimap);
	} else {
		getMinimap(server, function (img) {
			server.minimap = img;

			if ($(img).data("address") === $(".server.selected").data("address")) {
				setMinimap(img);
			}
		});
	}
}

function setMinimap(image) {
	$("#minimap img").replaceWith(image);

	let divW = $("#minimap").width();
	let divH = $("#minimap").height();
	let imgW = $(image).width();
	let imgH = $(image).height();

	//scroll or move minimap to center depending on size compared to container
	$("#minimap").scrollLeft((imgW - divW) / 2);
	$("#minimap").scrollTop((imgH - divH) / 2);
	if (divW > imgW) $(image).css("left", (divW - imgW) / 2);
	if (divH > imgH) $(image).css("top", (divH - imgH) / 2);
}

function updatePlayerList(server) {
	server = server || getServerData(getSelectedServer());
	if (!server) return;

	let playerList = "";

	if (server.playerList.length) {
		playerList =
			"Players: " +
			server.playerList
				.sort((a, b) => compareCaseInsensitive(a, b))
				.map((username) => {
					const element = $(`<span class='player'>${username}</span>`);
					if (isFriend(username)) {
						element.addClass("friend");
					}
					return element[0].outerHTML;
				})
				.join(", ");
	}

	$("#players").html(playerList);
}

function getMinimap(server, callback) {
	let img = new Image();
	$(img).attr("data-address", server.address);
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

function toggleFavoriteServer(element) {
	if (!$(element).length) return;

	$(element).toggleClass("favorite");

	const address = $(element).data("address");

	if ($(element).hasClass("favorite")) {
		//add to favorites
		if (!isFavoriteServer(address)) {
			settings.favorites.push(address);
		}
	} else {
		//remove from favorites
		const index = settings.favorites.findIndex((fav) => fav === address);
		if (index > -1) {
			settings.favorites.splice(index, 1);
		}
	}

	chrome.storage.sync.set({ favorites: settings.favorites });

	if (settings.badgeValue === "favorites" || settings.badgeValue === "friendsFavorites") {
		background.updateBadge();
	}

	filterServers();
}

function isFavoriteServer(address) {
	return settings.favorites.some((fav) => fav === address);
}

function toggleFriend(element) {
	if (!$(element).length) return;

	$(element).toggleClass("friend");

	const username = $(element).text();

	if ($(element).hasClass("friend")) {
		//add to favorites
		if (!isFriend(username)) {
			settings.friends.push(username);
		}
	} else {
		//remove from favorites
		const index = settings.friends.findIndex((fav) => fav === username);
		if (index > -1) {
			settings.friends.splice(index, 1);
		}
	}

	chrome.storage.sync.set({ friends: settings.friends });

	if (settings.badgeValue === "friends" || settings.badgeValue === "friendsFavorites") {
		background.updateBadge();
	}

	const serverElement = getSelectedServer();
	const serverData = getServerData(serverElement);
	updateServerPlayersIcon(serverElement, serverData);
}

function isFriend(username) {
	return settings.friends.some((fav) => fav === username);
}

function setDefaults() {
	$("#sort").val(settings.sortDropdown);
	$("#modded").attr("data-value", settings.moddedButton);
	$("#password").attr("data-value", settings.passwordButton);
	$("#officials").attr("data-value", settings.officialsButton);
	$("#favorites").attr("data-value", settings.favoritesButton);
	$("#min-players").text(Math.min(...settings.sliderValues) + "%");
	$("#max-players").text(Math.max(...settings.sliderValues) + "%");

	if (settings.drag) {
		$("#server-list").addClass("dragscroll");
		$("#info").addClass("dragscroll");
		dragscroll.reset();
	}
}
