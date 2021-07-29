/* Magic Mirror
 * Module: Horaires
 *
 * By Matthieu Petit
 * Not Licensed.
 */

Module.register("horaires", {
	// Default module config.
	defaults: {
		text: "Hello World!"
	},

	start: function () {
		Log.info("Starting module: " + this.name);
	},

	// Override dom generator.
	getDom: function () {
		var wrapper = document.createElement("div");
		wrapper.innerHTML = this.config.text;
		return wrapper;
	}
});
