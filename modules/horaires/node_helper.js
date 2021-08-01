const NodeHelper = require("../../js/node_helper");
const axios = require("axios");
const oauth = require("axios-oauth-client");
const puppet = require("puppeteer");
const helpers = require("../../js/helpers");

const config = {
	urlOAuth: "https://as.api.iledefrance-mobilites.fr/api/oauth/token",
	client_id: "f328931c-6bd6-4c6b-809f-e4124d9046b8",
	client_secret: "10a03ea6-35e0-4b3b-bedc-897ecbe8d2d2",
	stops: { 23: "STIF:StopPoint:Q:20173:", I: "STIF:StopPoint:Q:17202:" },
	urlRERBoissy:
		"https://www.transilien.com/fr/les-fiches-horaires/resultats/?departure=Boissy-Saint-L%C3%A9ger&destination=Gare%20de%20Lyon%20(Paris)&idStopPointDestination=stop_point%3AIDFM%3AmonomodalStopPlace%3A470195&idUic7Departure=stop_area%3AIDFM%3A72881&completeDayResearch=false&startTimeSlot=",
	urlRERYerres:
		"https://www.transilien.com/fr/les-fiches-horaires/resultats/?departure=Yerres&destination=Gare%20de%20Lyon%20(Paris)&errors=&idStopPointDestination=stop_point%3AIDFM%3AmonomodalStopPlace%3A470195&idUic7Departure=stop_area%3AIDFM%3A63044&completeDayResearch=false&startTimeSlot="
};

let access_token;

module.exports = NodeHelper.create({
	start: function () {
		this.login();
	},

	login: function () {
		const getAuthorizationCode = oauth.client(axios.create(), {
			url: config.urlOAuth,
			grant_type: "client_credentials",
			scope: "read-data",
			client_id: config.client_id,
			client_secret: config.client_secret
		});
		getAuthorizationCode().then((res) => {
			access_token = res.access_token;
			// Start fetch
			this.getAllBUSPassages();
			this.getAllRERPassages();
		});
	},

	getAllBUSPassages: function () {
		const self = this;

		let requests = Object.entries(config.stops).map(([stop, code]) => {
			return new Promise((resolve, reject) => {
				axios
					.get(`https://traffic.api.iledefrance-mobilites.fr/v1/tr-unitaire/stop-monitoring?MonitoringRef=${code}`, {
						headers: {
							Authorization: `Bearer ${access_token}`
						}
					})
					.then((res) => {
						let stops = res.data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit;
						if (stops.length) {
							let times = stops.map((item) => new Date(item.MonitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime).getTime());
							resolve({ stop, times });
						} else {
							resolve({ stop });
						}
					})
					.catch((error) => {
						console.log(error);
						reject(error);
					});
			});
		});

		Promise.all(requests)
			.then((res) => {
				self.sendSocketNotification("HORAIRES_FETCH_RESULT_BUS", res);
			})
			.catch((error) => console.error(error));
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "HORAIRES_FETCH_ALL") {
			this.getAllBUSPassages();
			this.getAllRERPassages();
		} else if (notification === "HORAIRES_FETCH_BUS") {
			this.getAllBUSPassages();
		} else if (notification === "HORAIRES_FETCH_RER") {
			this.getAllRERPassages();
		}
	},

	getAllRERPassages: async function () {
		let results = { Boissy: null, Yerres: null };
		results.Boissy = await this.getRERPassages(config.urlRERBoissy);
		results.Yerres = await this.getRERPassages(config.urlRERYerres);
		this.sendSocketNotification("HORAIRES_FETCH_RESULT_RER", results);
	},

	getRERPassages: async function (urlRER) {
		try {
			const browser =
				process.platform === "linux"
					? await puppet.launch({
							executablePath: "/snap/bin/chromium",
							args: ["--no-sandbox"],
							headless: true
					  })
					: await puppet.launch();
			const page = await browser.newPage();
			const date = new Date();
			const { hours, minutes } = helpers.getHoursMinutes(date);
			await page.goto(
				`${urlRER}${hours}%3A${minutes}&date=${date.toISOString().substring(0, 10)}&endTimeSlot=${parseInt(hours) + 1}%3A${minutes}`
			);
			await page.waitForSelector(".timetable-sheets-row");
			const divs = await page.evaluate(() =>
				Array.from(document.querySelectorAll(".timetable-sheets-row__time--item"), (element) => element.textContent)
			);
			await browser.close();
			return divs.filter((_, index) => index % 2 === 0);
		} catch (e) {
			return [];
		}
	}
});
