// Route : /api/compliments
const fs = require("fs");
const path = "../../modules/default/compliments/compliments.json";

module.exports = (app) => {
	app.get("/", (req, res) => {
		const compliments = require(path);
		res.json(compliments);
	});

	app.post("/", async (req, res) => {
		const compliments = require(path);
		let { category, compliment } = req.body;
		compliment = compliment.trim();

		if (!compliments[category]) res.sendStatus(404);
		else if (!compliment) res.sendStatus(500);
		else if (compliments[category].includes(compliment)) res.sendStatus(500);
		else {
			compliments[category].push(compliment);

			writeFile(compliments)
				.then(() => res.sendStatus(200))
				.catch(() => res.sendStatus(500));
		}
	});

	app.put("/", async (req, res) => {
		const compliments = require(path);
		let { category, compliment, previous } = req.body;
		compliment = compliment.trim();

		if (!compliments[category]) res.sendStatus(404);
		else if (!compliment) res.sendStatus(500);
		else if (!compliments[category].includes(previous)) res.sendStatus(500);
		else {
			let index = compliments[category].indexOf(previous);
			if (index === -1) res.sendStatus(500);
			else {
				compliments[category][index] = compliment;
				writeFile(compliments)
					.then(() => res.sendStatus(200))
					.catch(() => res.sendStatus(500));
			}
		}
	});

	app.delete("/", async (req, res) => {
		const compliments = require(path);
		let { category, compliment } = req.body;
		compliment = compliment.trim();

		if (!compliments[category]) res.sendStatus(404);
		else if (!compliment && category) {
			// Delete entire category
			delete compliments[category];
			writeFile(compliments)
				.then(() => res.sendStatus(200))
				.catch(() => res.sendStatus(500));
		} else if (compliment && !compliments[category].includes(compliment)) res.sendStatus(500);
		else {
			// Delete compliment from category
			let index = compliments[category].indexOf(compliment);
			if (index === -1) res.sendStatus(500);
			else {
				compliments[category].splice(index, 1);
				writeFile(compliments)
					.then(() => res.sendStatus(200))
					.catch(() => res.sendStatus(500));
			}
		}
	});
};

const writeFile = (data) =>
	new Promise((resolve, reject) => {
		try {
			fs.writeFile(__dirname + "/../../.." + path, JSON.stringify(data), (err) => {
				if (err) {
					console.error(err);
					reject(err);
				} else {
					resolve();
				}
			});
		} catch (error) {
			reject();
		}
	});
