$(function () {
	$(document).on("mousedown", function (e) {
		if (isContextMenu(e.toElement)) return;
		closeContextMenu();
	});

	$(document).contextmenu(function (e) {
		if (!isContextMenuVisible()) {
			let server = $(e.target).closest(".server");
			if (server.length) {
				if ($(e.target).hasClass("gamemode-icon")) {
					createGamemodeContextMenu(server);
				} else if ($(e.target).hasClass("favorite-icon")) {
					createFavoriteContextMenu(server);
				} else if ($(e.target).hasClass("flag")) {
					createCountryContextMenu(server);
				} else if ($(e.target).hasClass("players-icon")) {
					createPlayerCountContextMenu();
				} else if ($(e.target).hasClass("password-icon")) {
					createLockedContextMenu();
				} else if ($(e.target).parent().hasClass("name")) {
					createServerNameContextMenu();
				} else {
					createServerContextMenu(server);
				}
			}

			if ($(e.target).hasClass("player")) {
				createPlayerContextMenu(e.target);
			}

			if ($(e.target).attr("id") === "creator") {
				createCreatorContextMenu();
			}

			if ($(e.target).attr("id") === "extension-name") {
				createHeaderContextMenu();
			}

			if ($(e.target).parent().attr("id") === "minimap" && !isDragging($(e.target).parent())) {
				createMinimapContextMenu(e.target);
			}
		}
		return false;
	});
});

function isContextMenu(element) {
	return $(element).closest("#context-menu").length;
}

function isContextMenuVisible() {
	return $("#context-menu").length;
}

function closeContextMenu() {
	$("#context-menu").remove();
}

function getListElement(element, item) {
	let ele = null;

	//element is item
	if ($(element).hasClass(item)) {
		ele = element;
	}

	//element is child of item
	let parents = $(element).parents(`.${item}`);
	if (parents.length) {
		ele = parents.first();
	}

	return ele;
}

function initContextMenu() {
	return $('<div id="context-menu"></div>');
}

function addContextButton(element, text, callback) {
	let button = $(`<div class="button">${text}</div>`);
	$(button).click(function () {
		callback();
		closeContextMenu();
	});
	$(element).append(button);
}

function setupContextMenu(element) {
	$(element).appendTo("body");

	//get values
	let mouseX = window.event.clientX;
	let mouseY = window.event.clientY;
	let docWidth = $(document).width();
	let docHeight = $(document).height();
	let menuWidth = $(element).width();
	let menuHeight = $(element).height();

	//initialize origin
	let originY = "top";
	let originX = "left";

	//calculate position and origin
	let left = Math.min(mouseX, docWidth - menuWidth);
	if (mouseX > docWidth - menuWidth) {
		let x = mouseX - (docWidth - menuWidth);
		originX = x + "px";
	}
	let top = mouseY;
	if (mouseY > docHeight - menuHeight) {
		top -= menuHeight;
		originY = "bottom";
	}

	//apply css
	$(element).css({
		transform: "scale(1)",
		opacity: 1,
		"pointer-events": "all",
		"transform-origin": `${originX} ${originY}`,
		left: left,
		top: top,
	});

	//disable click
	$(element).click(function (e) {
		e.stopPropagation();
	});
}

function createServerNameContextMenu() {
	let element = initContextMenu();

	addContextButton(element, "Sort by server name", function () {
		if ($("#sort").val() !== "name") {
			settings.sortDropdown = "name";
		} else {
			settings.sortDropdown = "count";
		}

		$("#sort").val(settings.sortDropdown);
		chrome.storage.sync.set({ sortDropdown: settings.sortDropdown });

		sortServers();
	});

	setupContextMenu(element);
}

function createFavoriteContextMenu(server) {
	let contextMenu = initContextMenu();

	let favoriteLabel = isFavoriteServer(server.data("address")) ? "Unfavorite" : "Favorite";
	addContextButton(contextMenu, favoriteLabel, function () {
		toggleFavoriteServer(server);
	});

	addContextButton(contextMenu, "Filter favorites", function () {
		if ($("#favorites").attr("data-value") != 2) {
			settings.favoritesButton = 2;
		} else {
			settings.favoritesButton = 0;
		}

		$("#favorites").attr("data-value", settings.favoritesButton);
		chrome.storage.sync.set({ favoritesButton: settings.favoritesButton });

		filterServers();
	});

	addContextButton(contextMenu, "Filter non-favorites", function () {
		if ($("#favorites").attr("data-value") != 1) {
			settings.favoritesButton = 1;
		} else {
			settings.favoritesButton = 0;
		}

		$("#favorites").attr("data-value", settings.favoritesButton);
		chrome.storage.sync.set({ favoritesButton: settings.favoritesButton });

		filterServers();
	});

	setupContextMenu(contextMenu);
}

function createLockedContextMenu() {
	let element = initContextMenu();

	addContextButton(element, "Filter locked", function () {
		filterLockedServers();
	});

	addContextButton(element, "Filter unlocked", function () {
		if ($("#password").attr("data-value") != 1) {
			settings.passwordButton = 1;
		} else {
			settings.passwordButton = 0;
		}

		$("#password").attr("data-value", settings.passwordButton);
		chrome.storage.sync.set({ passwordButton: settings.passwordButton });

		filterServers();
	});

	setupContextMenu(element);
}

function filterLockedServers() {
	if ($("#password").attr("data-value") != 2) {
		settings.passwordButton = 2;
	} else {
		settings.passwordButton = 0;
	}

	$("#password").attr("data-value", settings.passwordButton);
	chrome.storage.sync.set({ passwordButton: settings.passwordButton });

	filterServers();
}

function createPlayerCountContextMenu() {
	let element = initContextMenu();

	addContextButton(element, "Sort by player count", function () {
		settings.sortDropdown = "count";

		$("#sort").val(settings.sortDropdown);
		chrome.storage.sync.set({ sortDropdown: settings.sortDropdown });

		sortServers();
	});

	addContextButton(element, "Sort by player percentage", function () {
		if ($("#sort").val() !== "percentage") {
			settings.sortDropdown = "percentage";
		} else {
			settings.sortDropdown = "count";
		}

		$("#sort").val(settings.sortDropdown);
		chrome.storage.sync.set({ sortDropdown: settings.sortDropdown });

		sortServers();
	});

	addContextButton(element, "Filter empty servers", function () {
		filterEmptyServers();
	});

	addContextButton(element, "Filter full servers", function () {
		let index = settings.sliderValues.indexOf(Math.max(...settings.sliderValues));

		if (settings.sliderValues[index] !== 99) {
			settings.sliderValues[index] = 99;
		} else {
			settings.sliderValues[index] = 100;
		}

		$("#slider").slider({ values: settings.sliderValues });
		chrome.storage.sync.set({ sliderValues: settings.sliderValues });

		filterServers();
	});

	setupContextMenu(element);
}

function filterEmptyServers() {
	var index = settings.sliderValues.indexOf(Math.min(...settings.sliderValues));

	if (settings.sliderValues[index] !== 1) {
		settings.sliderValues[index] = 1;
	} else {
		settings.sliderValues[index] = 0;
	}

	$("#slider").slider({ values: settings.sliderValues });
	chrome.storage.sync.set({ sliderValues: settings.sliderValues });

	filterServers();
}

function createMinimapContextMenu(minimap) {
	let element = initContextMenu();

	addContextButton(element, "View", function () {
		open($(minimap).attr("src"));
	});

	setupContextMenu(element);
}

function createCountryContextMenu(server) {
	let element = initContextMenu();

	addContextButton(element, "Sort by country", function () {
		if ($("#sort").val() !== "country") {
			settings.sortDropdown = "country";
		} else {
			settings.sortDropdown = "count";
		}

		$("#sort").val(settings.sortDropdown);
		chrome.storage.sync.set({ sortDropdown: settings.sortDropdown });

		sortServers();
	});

	addContextButton(element, "Filter this country", function () {
		let flag = $(server).children(".flag");
		filterServersByCountry(flag);
	});

	addContextButton(element, "Hide flags", function () {
		settings.serverFlag = false;
		chrome.storage.sync.set({ serverFlag: settings.serverFlag });
		$(".server .flag").remove();
	});

	setupContextMenu(element);
}

function filterServersByCountry(flag) {
	let search = $("#search").val();
	let country = $(flag).attr("title");
	let regex = new RegExp(`\\s?\\b${country}\\b`, "gi");

	if (search.match(regex)) {
		$("#search").val(search.replace(regex, "").trim());
	} else {
		$("#search").val(`${search.trimEnd()} ${country}`.trim());
	}

	filterServers();
}

function createGamemodeContextMenu(server) {
	let contextMenu = initContextMenu();

	addContextButton(contextMenu, "Sort by gamemode", function () {
		if ($("#sort").val() !== "gamemode") {
			settings.sortDropdown = "gamemode";
		} else {
			settings.sortDropdown = "count";
		}

		$("#sort").val(settings.sortDropdown);
		chrome.storage.sync.set({ sortDropdown: settings.sortDropdown });

		sortServers();
	});

	addContextButton(contextMenu, "Filter this gamemode", function () {
		let gamemodeIcon = $(server).children(".gamemode-icon");
		filterServersByGamemode(gamemodeIcon);
	});

	setupContextMenu(contextMenu);
}

function filterServersByGamemode(gamemodeIcon) {
	let gamemode = $(gamemodeIcon).attr("title");

	if ($("#gamemodes").val() !== gamemode) {
		$("#gamemodes").val(gamemode);
	} else {
		$("#gamemodes").val("All");
	}

	filterServers();
}

function createHeaderContextMenu() {
	let contextMenu = initContextMenu();

	addContextButton(contextMenu, "Chrome", function () {
		open("https://chrome.google.com/webstore/detail/aipcclcgemecihikpdgfoonlfpjkekmp");
	});

	addContextButton(contextMenu, "Forum", function () {
		open("https://forum.thd.vg/threads/27522");
	});

	addContextButton(contextMenu, "GitHub", function () {
		open("https://github.com/eps0003/kag-chrome-server-browser");
	});

	setupContextMenu(contextMenu);
}

function createCreatorContextMenu() {
	let contextMenu = initContextMenu();

	addContextButton(contextMenu, "Forum", function () {
		open("https://forum.thd.vg/members/16800");
	});

	addContextButton(contextMenu, "GitHub", function () {
		open("https://github.com/eps0003");
	});

	addContextButton(contextMenu, "Twitter", function () {
		open("https://twitter.com/epsilul");
	});

	addContextButton(contextMenu, "Discord", function () {
		open("https://discordapp.com/users/193177252815568897");
	});

	// addContextButton(contextMenu, "Donate", function () {
	// 	open("");
	// });

	setupContextMenu(contextMenu);
}

function createServerContextMenu(server) {
	let element = initContextMenu();

	if (!$(server).hasClass("outdated")) {
		addContextButton(element, "Play", function () {
			selectServer(server);
			$("#play").click();
		});
	}

	let favoriteLabel = isFavoriteServer(server.data("address")) ? "Unfavorite" : "Favorite";
	addContextButton(element, favoriteLabel, function () {
		toggleFavoriteServer(server);
	});

	setupContextMenu(element);
}

function createPlayerContextMenu(element) {
	let contextMenu = initContextMenu();
	let username = $(element).text();

	addContextButton(contextMenu, "Join", function () {
		$("#play").click();
	});

	let friendLabel = isFriend(username) ? "Unfriend" : "Friend";
	addContextButton(contextMenu, friendLabel, function () {
		toggleFriend(element);
	});

	setupContextMenu(contextMenu);
}
