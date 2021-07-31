const API = `${window.location.origin}/api/compliments`;

const get = (url) => {
	return new Promise((resolve, reject) => {
		fetch(API + url, {
			method: "GET",
			mode: "cors"
		})
			.then((res) => {
				let contentType = res.headers.get("content-type");

				if (contentType && contentType.indexOf("application/json") !== -1) {
					resolve(res.json());
				} else {
					reject("JSON Parse Error " + contentType + res.json());
				}
			})
			.catch((err) => reject(err));
	});
};

const rest = (url, method, data) => {
	return new Promise((resolve, reject) => {
		fetch(API + url, {
			method: method,
			mode: "cors",
			headers: {
				"Content-type": "application/json; charset=UTF-8" // Indicates the content
			},
			body: JSON.stringify(data)
		})
			.then((res) => {
				if (res.ok) resolve();
				else reject(res);
			})
			.catch((err) => reject(err));
	});
};

const actionsArray = [{ action: "add" }, { action: "edit", icon: "pen" }, { action: "delete", icon: "trash" }].map((entry) => {
	let div = document.createElement("div");
	div.className = `gg-${entry.icon || entry.action}`;
	div.setAttribute("action", entry.action);
	return div;
});
const getAddActionNode = (key) => {
	const node = actionsArray[0].cloneNode();
	node.setAttribute("key", key);
	return node;
};
const getEditActionNode = (key, value) => {
	const node = actionsArray[1].cloneNode();
	node.setAttribute("key", key);
	node.setAttribute("value", value);
	return node;
};
const getDeleteActionNode = (key, value) => {
	const node = actionsArray[2].cloneNode();
	node.setAttribute("key", key);
	if (value) node.setAttribute("value", value);
	return node;
};
const categories = document.querySelector("#categories");

get("/").then((compliments) => {
	Object.keys(compliments).forEach((key) => {
		let category = document.createElement("div");
		category.className = "category";

		// Category header card
		let header = document.createElement("header");
		header.className = "header";
		let title = document.createElement("h3");
		title.innerText = key;
		let actions = document.createElement("div");
		actions.className = "actions";
		actions.appendChild(getAddActionNode(key));
		actions.appendChild(getDeleteActionNode(key));
		header.appendChild(title);
		header.appendChild(actions);
		category.appendChild(header);

		// Compliment
		compliments[key].forEach((compliment) => {
			let div = document.createElement("div");
			div.className = "compliment";
			div.appendChild(getEditActionNode(key, compliment));
			div.appendChild(getDeleteActionNode(key, compliment));
			let span = document.createElement("span");
			span.innerHTML += compliment;
			div.appendChild(span);
			category.appendChild(div);
		});

		categories.appendChild(category);
	});

	// Confirm Delete Modal
	const addDialog = document.getElementById("dialog-add");
	const editDialog = document.getElementById("dialog-edit");
	const deleteDialog = document.getElementById("dialog-delete");
	Array.from(document.querySelectorAll("div[action='add']")).forEach((el) => {
		el.addEventListener("click", () => {
			let key = el.getAttribute("key");
			document.querySelector("#dialog-add input[name='category'").value = key;
			addDialog.children[0].children[0].innerHTML = ` ${key}`;
			addDialog.showModal();
		});
	});
	Array.from(document.querySelectorAll("div[action='edit']")).forEach((el) => {
		el.addEventListener("click", () => {
			let key = el.getAttribute("key");
			editDialog.setAttribute("key", key);
			editDialog.setAttribute("value", el.getAttribute("value"));
			document.querySelector("#dialog-edit input[name='category'").value = key;
			document.querySelector("#dialog-edit input[name='compliment'").value = el.getAttribute("value");
			document.querySelector("#dialog-edit input[name='previous'").value = el.getAttribute("value");
			editDialog.children[0].children[0].innerHTML = ` ${editDialog.getAttribute("value")}`;
			editDialog.showModal();
		});
	});
	Array.from(document.querySelectorAll("div[action='delete']")).forEach((el) => {
		el.addEventListener("click", () => {
			let key = el.getAttribute("key");
			deleteDialog.setAttribute("key", key);
			if (el.hasAttribute("value")) deleteDialog.setAttribute("value", el.getAttribute("value"));
			else deleteDialog.removeAttribute("value");
			document.querySelector("#dialog-delete input[name='category'").value = key;
			document.querySelector("#dialog-delete input[name='compliment'").value = el.getAttribute("value");
			deleteDialog.children[0].children[0].innerHTML = ` ${
				deleteDialog.hasAttribute("value") ? deleteDialog.getAttribute("value") : deleteDialog.getAttribute("key")
			}`;
			deleteDialog.showModal();
		});
	});

	[addDialog, editDialog, deleteDialog].forEach((dialog) => {
		dialog.querySelector("form").addEventListener("reset", () => {
			dialog.close();
		});
	});

	addDialog.querySelector("form").addEventListener("submit", (event) => {
		event.preventDefault();
		const formData = new FormData(event.target);
		rest("/", "POST", {
			category: formData.get("category"),
			compliment: formData.get("compliment")
		}).then(() => {
			window.location.reload();
			event.target.reset();
		});
	});

	editDialog.querySelector("form").addEventListener("submit", (event) => {
		event.preventDefault();
		const formData = new FormData(event.target);
		rest("/", "PUT", {
			category: formData.get("category"),
			compliment: formData.get("compliment"),
			previous: formData.get("previous")
		}).then(() => {
			window.location.reload();
			event.target.reset();
		});
	});

	deleteDialog.querySelector("form").addEventListener("submit", (event) => {
		event.preventDefault();
		const formData = new FormData(event.target);
		rest("/", "DELETE", {
			category: formData.get("category"),
			compliment: formData.get("compliment")
		}).then(() => {
			window.location.reload();
			event.target.reset();
		});
	});
});
