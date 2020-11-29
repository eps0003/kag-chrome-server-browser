$(function () {
	setDefaults();

	$(".toggle").change(function () {
		const option = $(this).closest(".option");
		const property = option.attr("id");

		option.find("*:not(.toggle)").attr("disabled", !this.checked);

		chrome.storage.sync.set({ [property]: this.checked });
	});

	$("input[type='radio']").change(function () {
		const name = $(this).attr("name");
		const selected = $(`input[name='${name}']:checked`);

		chrome.storage.sync.set({ [name]: selected.val() });
	});

	$("input[type='range']").on("input", function () {
		const value = $(this).val();
		$(this).closest(".option").find(".value").text(value);
	});

	$("input[type='range']").change(function () {
		const value = Number($(this).val());
		const property = $(this).closest(".option").attr("id");
		chrome.storage.sync.set({ [property]: value });
	});

	$("input").on("input", function () {
		$("#resetSettings").prop("disabled", false);

		$("#resetAll").prop("disabled", false);
		$("#resetAll").text("Reset everything!");
	});

	$("select").change(function () {
		const value = $(this).val();
		const property = $(this).attr("id");
		chrome.storage.sync.set({ [property]: value });
	});

	$("#clearFavorites").click(function () {
		chrome.storage.sync.remove("favorites", () => {
			$(this).prop("disabled", true);
			$(this).text("Favorites cleared");
		});
	});

	$("#clearFriends").click(function () {
		chrome.storage.sync.remove("friends", () => {
			$(this).prop("disabled", true);
			$(this).text("Friends cleared");
		});
	});

	$("#resetAll").click(function () {
		$(this).data("clicks", ($(this).data("clicks") || 0) + 1);

		const text = ["Are you sure?", "Are you really sure?"];
		const index = $(this).data("clicks") - 1;

		if (index === text.length) {
			chrome.storage.sync.clear(() => {
				$(this).prop("disabled", true);
				$(this).removeData("clicks");
				$(this).siblings().prop("disabled", true);
				$(this).text("Everything is gone!");

				setDefaults();
			});
		} else {
			$(this).text(text[index]);
		}
	});
});

function setDefaults() {
	chrome.storage.sync.get(null, function (settings) {
		$(".toggleOption").each(function () {
			const id = $(this).attr("id");
			$(this)
				.find(".toggle")
				.prop("checked", settings[id] || false);

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
			console.log(id);
			$(this).val(settings[id]);
		});

		$("#clearFavorites").prop("disabled", $.isEmptyObject(settings.favorites));
		$("#clearFriends").prop("disabled", $.isEmptyObject(settings.friends));
		$("#resetAll").prop("disabled", $.isEmptyObject(settings));
	});
}
