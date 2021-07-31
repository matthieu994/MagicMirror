const NodeHelper = require("node_helper");
const fs = require("fs");
const path = "./compliments.json";

module.exports = NodeHelper.create({
	start: function () {
		this.expressApp.get("/api/compliments", (req, res) => {
			const compliments = require(path);
			res.json(compliments);
		});

		this.expressApp.post("/api/compliments", async (req, res, next) => {
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
				next();
			}
		});

		this.expressApp.put("/api/compliments", async (req, res, next) => {
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
					next();
				}
			}
		});

		this.expressApp.delete("/api/compliments", async (req, res, next) => {
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
					next();
				}
			}
		});

		// After Edit or Delete
		const self = this;
		this.expressApp.use(function (req, res) {
			self.sendSocketNotification("UPDATE_COMPLIMENTS");
		});
	}
});

const writeFile = (data) =>
	new Promise((resolve, reject) => {
		try {
			fs.writeFile(__dirname + path.substring(1), JSON.stringify(data), (err) => {
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
