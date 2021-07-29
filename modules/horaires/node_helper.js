var NodeHelper = require("node_helper");
module.exports = NodeHelper.create({
	start: function () {
		this.expressApp.get(`/api/${this.name}`, function (req, res) {
			res.send("GET request to /foobar");
		});
	}
});
