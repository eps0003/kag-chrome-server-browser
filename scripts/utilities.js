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

function getCurrentBuild(servers) {
	return mode(servers.map((server) => server.build));
}

function getServers() {
	return new Promise(function (resolve, reject) {
		$.get('https://api.kag2d.com/v1/game/thd/kag/servers?filters=[{"field":"current","op":"eq","value":"true"},{"field":"connectable","op":"eq","value":true}]&' + new Date().valueOf(), async function (data) {
			let servers = data.serverList;
			const currentBuild = getCurrentBuild(servers);

			for (const i in servers) {
				const server = servers[i];

				server.outdated = server.build !== currentBuild;
				server.address = `${server.IPv4Address}:${server.port}`;
				server.official = /(?=^KAG Official( Small)? \w+ (AUS?|EU|USA?)\b)|(?=^Official Modded Server (AUS?|EU|USA?)\b)/g.test(server.name);
			}

			getServerCountries(servers)
				.catch(console.warn)
				.finally(() => resolve(servers));
		}).fail(function () {
			reject("Unable to retrieve servers");
		});
	});
}

function getServerCountries(servers) {
	return new Promise(function (resolve, reject) {
		//get unique ips
		const ips = servers.map((server) => server.IPv4Address).filter(filterUnique);

		//get country data
		$.get(`https://get.geojs.io/v1/ip/country.json?ip=${ips.join(",")}`, (data) => {
			for (const entry of data) {
				//add country info to servers with the same ip
				servers
					.filter((server) => server.IPv4Address === entry.ip)
					.forEach((server) => {
						server.country = entry.name;
						server.countryCode = entry.country;
					});
			}

			resolve(servers);
		}).fail(function () {
			reject("Unable to retrieve country of each server");
		});
	});
}
