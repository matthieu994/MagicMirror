/* global Class, cloneObject, Loader, MMSocket, nunjucks, Translator */

/* Magic Mirror
 * Module Blueprint.
 * @typedef {Object} Module
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 */
var Module = Class.extend({
	/*********************************************************
	 * All methods (and properties) below can be subclassed. *
	 *********************************************************/

	// Set the minimum MagicMirror module version for this module.
	requiresVersion: "2.0.0",

	// Module config defaults.
	defaults: {},

	// Timer reference used for showHide animation callbacks.
	showHideTimer: null,

	// Array to store lockStrings. These strings are used to lock
	// visibility when hiding and showing module.
	lockStrings: [],

	// Storage of the nunjuck Environment,
	// This should not be referenced directly.
	// Use the nunjucksEnvironment() to get it.
	_nunjucksEnvironment: null,

	/**
	 * Called when the module is instantiated.
	 */
	init: function () {
		//Log.log(this.defaults);
	},

	/**
	 * Called when the module is started.
	 */
	start: function () {
		Log.info("Starting module: " + this.name);
	},

	/**
	 * Returns a list of scripts the module requires to be loaded.
	 *
	 * @returns {string[]} An array with filenames.
	 */
	getScripts: function () {
		return [];
	},

	/**
	 * Returns a list of stylesheets the module requires to be loaded.
	 *
	 * @returns {string[]} An array with filenames.
	 */
	getStyles: function () {
		return [];
	},

	/**
	 * Returns a map of translation files the module requires to be loaded.
	 *
	 * return Map<String, String> -
	 *
	 * @returns {*} A map with langKeys and filenames.
	 */
	getTranslations: function () {
		return false;
	},

	/**
	 * Generates the dom which needs to be displayed. This method is called by the Magic Mirror core.
	 * This method can to be subclassed if the module wants to display info on the mirror.
	 * Alternatively, the getTemplate method could be subclassed.
	 *
	 * @returns {HTMLElement|Promise} The dom or a promise with the dom to display.
	 */
	getDom: function () {
		return new Promise((resolve) => {
			const div = document.createElement("div");
			const template = this.getTemplate();
			const templateData = this.getTemplateData();

			// Check to see if we need to render a template string or a file.
			if (/^.*((\.html)|(\.njk))$/.test(template)) {
				// the template is a filename
				this.nunjucksEnvironment().render(template, templateData, function (err, res) {
					if (err) {
						Log.error(err);
					}

					div.innerHTML = res;

					resolve(div);
				});
			} else {
				// the template is a template string.
				div.innerHTML = this.nunjucksEnvironment().renderString(template, templateData);

				resolve(div);
			}
		});
	},

	/**
	 * Generates the header string which needs to be displayed if a user has a header configured for this module.
	 * This method is called by the Magic Mirror core, but only if the user has configured a default header for the module.
	 * This method needs to be subclassed if the module wants to display modified headers on the mirror.
	 *
	 * @returns {string} The header to display above the header.
	 */
	getHeader: function () {
		return this.data.header;
	},

	/**
	 * Returns the template for the module which is used by the default getDom implementation.
	 * This method needs to be subclassed if the module wants to use a template.
	 * It can either return a template sting, or a template filename.
	 * If the string ends with '.html' it's considered a file from within the module's folder.
	 *
	 * @returns {string} The template string of filename.
	 */
	getTemplate: function () {
		return '<div class="normal">' + this.name + '</div><div class="small dimmed">' + this.identifier + "</div>";
	},

	/**
	 * Returns the data to be used in the template.
	 * This method needs to be subclassed if the module wants to use a custom data.
	 *
	 * @returns {object} The data for the template
	 */
	getTemplateData: function () {
		return {};
	},

	/**
	 * Called by the Magic Mirror core when a notification arrives.
	 *
	 * @param {string} notification The identifier of the notification.
	 * @param {*} payload The payload of the notification.
	 * @param {Module} sender The module that sent the notification.
	 */
	notificationReceived: function (notification, payload, sender) {
		if (sender) {
			// Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name);
		} else {
			// Log.log(this.name + " received a system notification: " + notification);
		}
	},

	/**
	 * Returns the nunjucks environment for the current module.
	 * The environment is checked in the _nunjucksEnvironment instance variable.
	 *
	 * @returns {object} The Nunjucks Environment
	 */
	nunjucksEnvironment: function () {
		if (this._nunjucksEnvironment !== null) {
			return this._nunjucksEnvironment;
		}

		this._nunjucksEnvironment = new nunjucks.Environment(new nunjucks.WebLoader(this.file(""), { async: true }), {
			trimBlocks: true,
			lstripBlocks: true
		});

		this._nunjucksEnvironment.addFilter("translate", (str, variables) => {
			return nunjucks.runtime.markSafe(this.translate(str, variables));
		});

		return this._nunjucksEnvironment;
	},

	/**
	 * Called when a socket notification arrives.
	 *
	 * @param {string} notification The identifier of the notification.
	 * @param {*} payload The payload of the notification.
	 */
	socketNotificationReceived: function (notification, payload) {
		Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
	},

	/**
	 * Called when the module is hidden.
	 */
	suspend: function () {
		Log.log(this.name + " is suspended.");
	},

	/**
	 * Called when the module is shown.
	 */
	resume: function () {
		Log.log(this.name + " is resumed.");
	},

	/*********************************************
	 * The methods below don"t need subclassing. *
	 *********************************************/

	/**
	 * Set the module data.
	 *
	 * @param {object} data The module data
	 */
	setData: function (data) {
		this.data = data;
		this.name = data.name;
		this.identifier = data.identifier;
		this.hidden = false;

		this.setConfig(data.config, data.configDeepMerge);
	},

	/**
	 * Set the module config and combine it with the module defaults.
	 *
	 * @param {object} config The combined module config.
	 * @param {boolean} deep Merge module config in deep.
	 */
	setConfig: function (config, deep) {
		this.config = deep ? configMerge({}, this.defaults, config) : Object.assign({}, this.defaults, config);
	},

	/**
	 * Returns a socket object. If it doesn't exist, it's created.
	 * It also registers the notification callback.
	 *
	 * @returns {MMSocket} a socket object
	 */
	socket: function () {
		if (typeof this._socket === "undefined") {
			this._socket = new MMSocket(this.name);
		}

		this._socket.setNotificationCallback((notification, payload) => {
			this.socketNotificationReceived(notification, payload);
		});

		return this._socket;
	},

	/**
	 * Retrieve the path to a module file.
	 *
	 * @param {string} file Filename
	 * @returns {string} the file path
	 */
	file: function (file) {
		return (this.data.path + "/" + file).replace("//", "/");
	},

	/**
	 * Load all required stylesheets by requesting the MM object to load the files.
	 *
	 * @param {Function} callback Function called when done.
	 */
	loadStyles: function (callback) {
		this.loadDependencies("getStyles", callback);
	},

	/**
	 * Load all required scripts by requesting the MM object to load the files.
	 *
	 * @param {Function} callback Function called when done.
	 */
	loadScripts: function (callback) {
		this.loadDependencies("getScripts", callback);
	},

	/**
	 * Helper method to load all dependencies.
	 *
	 * @param {string} funcName Function name to call to get scripts or styles.
	 * @param {Function} callback Function called when done.
	 */
	loadDependencies: function (funcName, callback) {
		let dependencies = this[funcName]();

		const loadNextDependency = () => {
			if (dependencies.length > 0) {
				const nextDependency = dependencies[0];
				Loader.loadFile(nextDependency, this, () => {
					dependencies = dependencies.slice(1);
					loadNextDependency();
				});
			} else {
				callback();
			}
		};

		loadNextDependency();
	},

	/**
	 * Load all translations.
	 *
	 * @param {Function} callback Function called when done.
	 */
	loadTranslations(callback) {
		const translations = this.getTranslations() || {};
		const language = config.language.toLowerCase();

		const languages = Object.keys(translations);
		const fallbackLanguage = languages[0];

		if (languages.length === 0) {
			callback();
			return;
		}

		const translationFile = translations[language];
		const translationsFallbackFile = translations[fallbackLanguage];

		if (!translationFile) {
			Translator.load(this, translationsFallbackFile, true, callback);
			return;
		}

		Translator.load(this, translationFile, false, () => {
			if (translationFile !== translationsFallbackFile) {
				Translator.load(this, translationsFallbackFile, true, callback);
			} else {
				callback();
			}
		});
	},

	/**
	 * Request the translation for a given key with optional variables and default value.
	 *
	 * @param {string} key The key of the string to translate
	 * @param {string|object} [defaultValueOrVariables] The default value or variables for translating.
	 * @param {string} [defaultValue] The default value with variables.
	 * @returns {string} the translated key
	 */
	translate: function (key, defaultValueOrVariables, defaultValue) {
		if (typeof defaultValueOrVariables === "object") {
			return Translator.translate(this, key, defaultValueOrVariables) || defaultValue || "";
		}
		return Translator.translate(this, key) || defaultValueOrVariables || "";
	},

	/**
	 * Request an (animated) update of the module.
	 *
	 * @param {number} [speed] The speed of the animation.
	 */
	updateDom: function (speed) {
		MM.updateDom(this, speed);
	},

	/**
	 * Send a notification to all modules.
	 *
	 * @param {string} notification The identifier of the notification.
	 * @param {*} payload The payload of the notification.
	 */
	sendNotification: function (notification, payload) {
		MM.sendNotification(notification, payload, this);
	},

	/**
	 * Send a socket notification to the node helper.
	 *
	 * @param {string} notification The identifier of the notification.
	 * @param {*} payload The payload of the notification.
	 */
	sendSocketNotification: function (notification, payload) {
		this.socket().sendNotification(notification, payload);
	},

	/**
	 * Hide this module.
	 *
	 * @param {number} speed The speed of the hide animation.
	 * @param {Function} callback Called when the animation is done.
	 * @param {object} [options] Optional settings for the hide method.
	 */
	hide: function (speed, callback, options) {
		if (typeof callback === "object") {
			options = callback;
			callback = function () {};
		}

		callback = callback || function () {};
		options = options || {};

		MM.hideModule(
			this,
			speed,
			() => {
				this.suspend();
				callback();
			},
			options
		);
	},

	/**
	 * Show this module.
	 *
	 * @param {number} speed The speed of the show animation.
	 * @param {Function} callback Called when the animation is done.
	 * @param {object} [options] Optional settings for the show method.
	 */
	show: function (speed, callback, options) {
		if (typeof callback === "object") {
			options = callback;
			callback = function () {};
		}

		callback = callback || function () {};
		options = options || {};

		MM.showModule(
			this,
			speed,
			() => {
				this.resume();
				callback();
			},
			options
		);
	},

	helpers: {
		getHoursMinutes: (date) => {
			return { hours: new String(date.getHours()).padStart(2, "0"), minutes: new String(date.getMinutes()).padStart(2, "0") };
		}
	}
});

/**
 * Merging MagicMirror (or other) default/config script by @bugsounet
 * Merge 2 objects or/with array
 *
 * Usage:
 * -------
 * this.config = configMerge({}, this.defaults, this.config)
 * -------
 * arg1: initial object
 * arg2: config model
 * arg3: config to merge
 * -------
 * why using it ?
 * Object.assign() function don't to all job
 * it don't merge all thing in deep
 * -> object in object and array is not merging
 * -------
 *
 * Todo: idea of Mich determinate what do you want to merge or not
 *
 * @param {object} result the initial object
 * @returns {object} the merged config
 */
function configMerge(result) {
	const stack = Array.prototype.slice.call(arguments, 1);
	let item, key;

	while (stack.length) {
		item = stack.shift();
		for (key in item) {
			if (item.hasOwnProperty(key)) {
				if (typeof result[key] === "object" && result[key] && Object.prototype.toString.call(result[key]) !== "[object Array]") {
					if (typeof item[key] === "object" && item[key] !== null) {
						result[key] = configMerge({}, result[key], item[key]);
					} else {
						result[key] = item[key];
					}
				} else {
					result[key] = item[key];
				}
			}
		}
	}
	return result;
}

Module.definitions = {};

Module.create = function (name) {
	// Make sure module definition is available.
	if (!Module.definitions[name]) {
		return;
	}

	const moduleDefinition = Module.definitions[name];
	const clonedDefinition = cloneObject(moduleDefinition);

	// Note that we clone the definition. Otherwise the objects are shared, which gives problems.
	const ModuleClass = Module.extend(clonedDefinition);

	return new ModuleClass();
};

Module.register = function (name, moduleDefinition) {
	if (moduleDefinition.requiresVersion) {
		Log.log(
			"Check MagicMirror version for module '" +
				name +
				"' - Minimum version:  " +
				moduleDefinition.requiresVersion +
				" - Current version: " +
				window.version
		);
		if (cmpVersions(window.version, moduleDefinition.requiresVersion) >= 0) {
			Log.log("Version is ok!");
		} else {
			Log.warn("Version is incorrect. Skip module: '" + name + "'");
			return;
		}
	}
	Log.log("Module registered: " + name);
	Module.definitions[name] = moduleDefinition;
};

/**
 * Compare two semantic version numbers and return the difference.
 *
 * @param {string} a Version number a.
 * @param {string} b Version number b.
 * @returns {number} A positive number if a is larger than b, a negative
 * number if a is smaller and 0 if they are the same
 */
function cmpVersions(a, b) {
	const regExStrip0 = /(\.0+)+$/;
	const segmentsA = a.replace(regExStrip0, "").split(".");
	const segmentsB = b.replace(regExStrip0, "").split(".");
	const l = Math.min(segmentsA.length, segmentsB.length);

	for (let i = 0; i < l; i++) {
		let diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
		if (diff) {
			return diff;
		}
	}
	return segmentsA.length - segmentsB.length;
}
