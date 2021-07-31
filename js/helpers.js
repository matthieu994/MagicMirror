module.exports = {
	getHoursMinutes: (date) => {
		return { hours: new String(date.getHours()).padStart(2, "0"), minutes: new String(date.getMinutes()).padStart(2, "0") };
	}
};
