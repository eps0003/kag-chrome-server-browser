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

function plural(val, text, suffix = "s") {
	return Number(val) === 1 ? text : text + suffix;
}

function compareCaseInsensitive(a, b) {
	return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function filterUnique(x, i, a) {
	return i === a.indexOf(x);
}
