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
});

function updateSliderLabels(values) {
	$("#min-players").text(Math.min(...values) + "%");
	$("#max-players").text(Math.max(...values) + "%");
}
