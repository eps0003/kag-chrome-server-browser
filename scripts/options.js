const background = chrome.extension.getBackgroundPage();

$(function () {
	chrome.storage.sync.get(null, (data) => {
		settings = data;
		setDefaults();
	});

	$(".toggle").change(function () {
		const option = $(this).closest(".option");
		const property = option.attr("id");

		option.find("*:not(.toggle)").attr("disabled", !this.checked);

		settings[property] = this.checked;
		chrome.storage.sync.set({ [property]: this.checked });

		if (property === "badge") {
			background.updateBadge();
		}
	});

	$("input[type='radio']").change(function () {
		const name = $(this).attr("name");
		const selected = $(`input[name='${name}']:checked`);

		settings[name] = selected.val();
		chrome.storage.sync.set({ [name]: selected.val() });

		if (name === "badgeValue") {
			background.updateBadge();
		}
	});

	$("input[type='range']").on("input", function () {
		const value = $(this).val();
		$(this).closest(".option").find(".value").text(value);
	});

	$("input[type='range']").change(function () {
		const value = Number($(this).val());
		const property = $(this).closest(".option").attr("id");

		settings[property] = value;
		chrome.storage.sync.set({ [property]: value });
	});

	$("select").change(function () {
		const value = $(this).val();
		const property = $(this).attr("id");

		settings[property] = value;
		chrome.storage.sync.set({ [property]: value });
	});

	$("input, select").on("input", function () {
		$("#resetAll").prop("disabled", false);
		$("#resetAll").removeData("clicks");
		$("#resetAll").text("Reset everything!");
	});

	$("#clearFavorites").click(function () {
		chrome.storage.sync.set({ favorites: [] });

		$(this).prop("disabled", true);
		$(this).text("Favorites cleared");
	});

	$("#clearFriends").click(function () {
		chrome.storage.sync.set({ friends: [] });

		$(this).prop("disabled", true);
		$(this).text("Friends cleared");
	});

	$("#clearPasswords").click(function () {
		chrome.storage.sync.set({ passwords: {} });

		$(this).prop("disabled", true);
		$(this).text("Passwords cleared");
	});

	$("#resetAll").click(async function () {
		$(this).data("clicks", ($(this).data("clicks") || 0) + 1);

		const text = ["Are you sure?", "Are you really sure?"];
		const index = $(this).data("clicks") - 1;

		if (index === text.length) {
			settings = background.getDefaultSettings();
			chrome.storage.sync.set(settings, () => {
				setDefaults();

				$(this).removeData("clicks");
				$(this).siblings().prop("disabled", true);
				$(this).text("Everything is gone!");
			});
		} else {
			$(this).text(text[index]);
		}
	});

	$("#keyboardNavigation").attr(
		"title",
		[
			//
			"Up/Down: Select the prev/next server",
			"Shift Up/Down: Select the first/last server",
			"Ctrl Up/Down: Select the prev/next favourited server",
			"Ctrl Shift Up/Down: Select the first/last favourited server",
			"Ctrl Space: Favourite/unfavourite the selected server",
			"Ctrl R or F5: Reload servers",
			"Ctrl M: Click the modded filter button",
			"Ctrl P: Click the password filter button",
			"Ctrl O: Click the officials filter button",
			"Ctrl F: Click the favorites filter button",
			"Enter: Join the selected server",
			"Tab: Select the next sort dropdown option",
			"Shift Tab: Select the prev sort dropdown option",
			"Escape: Close all visible modal boxes or the extension window if none are visible",
			"(You can also bind a key to open the extension by going to chrome://extensions/shortcuts)",
		].join("\n")
	);
});

function setDefaults() {
	$(".toggleOption").each(function () {
		const id = $(this).attr("id");
		$(this).find(".toggle").prop("checked", settings[id]);

		const checked = $(this).find(".toggle").prop("checked");
		$(this).find("*:not(.toggle)").attr("disabled", !checked);
	});

	$("input[type='range']").each(function () {
		const option = $(this).closest(".option");
		const id = option.attr("id");
		const value = settings[id];

		option.find(".value").text(value);
		$(this).val(value);
	});

	$("input[type='radio']").each(function () {
		const name = $(this).attr("name");
		const value = settings[name];

		$(this).prop("checked", $(this).val() === value);
	});

	$("select").each(function () {
		const id = $(this).attr("id");
		$(this).val(settings[id]);
	});

	$("#clearFavorites").prop("disabled", !settings.favorites.length);
	$("#clearFriends").prop("disabled", !settings.friends.length);
	$("#clearPasswords").prop("disabled", jQuery.isEmptyObject(settings.passwords));
	$("#resetAll").prop("disabled", areSettingsDefault());
}

function areSettingsDefault() {
	return _.isEqual(settings, background.getDefaultSettings());
}
