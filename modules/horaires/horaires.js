/* Magic Mirror
 * Module: Horaires
 *
 * By Matthieu Petit
 * Not Licensed.
 */
Module.register("horaires", {
	// Default module config.
	defaults: {
		text: "Hello World!",
		refreshInterval: 30000, // timeout delay to get results
		noResultInterval: 10000, // send a request to get all results while no results
		intervalALL: null,
		timeoutBUS: null,
		timeoutRER: null,
		horairesBUS: [],
		horairesRER: {}
	},

	start: function () {
		Log.info("Starting module: " + this.name);
		this.sendSocketNotification("HORAIRES_FETCH_ALL");

		this.config.intervalALL = setInterval(() => {
			this.sendSocketNotification("HORAIRES_FETCH_ALL");
		}, this.config.noResultInterval);
	},

	getStyles: function () {
		return [
			"horaires.css", // will try to load it from the vendor folder, otherwise it will load is from the module folder.
			"font-awesome.css" // this file is available in the vendor folder, so it doesn't need to be available in the module folder.
		];
	},

	// Override dom generator.
	getDom: function () {
		const wrapper = document.createElement("div");
		wrapper.id = "horaires";

		if (this.config.horairesBUS.length === 0) {
			wrapper.innerHTML = this.translate("LOADING");
		}
		console.log(this.config.horairesBUS, this.config.horairesRER);
		this.config.horairesBUS.forEach((entry) => {
			const { stop, times } = entry;

			const div = document.createElement("div");
			const icon = document.createElement("i");
			icon.className = "fas fa-bus";
			div.appendChild(icon);
			div.innerHTML += ` ${stop} `;
			const span = document.createElement("span");
			if (times) {
				times.forEach((time) => {
					const date = new Date(time);
					const { hours, minutes } = this.helpers.getHoursMinutes(date);
					span.innerHTML += ` ${hours}:${minutes}`;
				});
			}
			div.appendChild(span);
			wrapper.appendChild(div);
		});

		if (Object.entries(this.config.horairesRER).length === 0) {
			wrapper.innerHTML += "<br>" + this.translate("LOADING");
		}
		Object.entries(this.config.horairesRER).forEach(([stop, times]) => {
			const div = document.createElement("div");
			const icon = document.createElement("i");
			icon.className = "fas fa-train";
			div.appendChild(icon);
			div.innerHTML += ` ${stop} `;
			const span = document.createElement("span");
			if (times) {
				times.forEach((time) => {
					span.innerHTML += ` ${time}`;
				});
			}
			div.appendChild(span);
			wrapper.appendChild(div);
		});
		return wrapper;
	},

	socketNotificationReceived: function (notification, payload) {
		if (["HORAIRES_FETCH_RESULT_BUS", "HORAIRES_FETCH_RESULT_RER"].includes(notification)) {
			clearInterval(this.config.intervalALL);
		}

		if (notification === "HORAIRES_FETCH_RESULT_BUS") {
			this.config.horairesBUS = payload;
			clearTimeout(this.config.timeoutBUS);
			this.updateDom();

			this.config.timeoutBUS = setTimeout(() => {
				this.sendSocketNotification("HORAIRES_FETCH_BUS");
			}, this.config.refreshInterval);
		} else if (notification === "HORAIRES_FETCH_RESULT_RER") {
			this.config.horairesRER = payload;
			clearTimeout(this.config.timeoutRER);
			this.updateDom();

			this.config.timeoutRER = setTimeout(() => {
				this.sendSocketNotification("HORAIRES_FETCH_RER");
			}, this.config.refreshInterval);
		}
	}
});
