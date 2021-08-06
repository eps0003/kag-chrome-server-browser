function PasswordModal(id, password, width = 0) {
	//clone template modal
	let element = cloneTemplateElement("#password-modal");

	//customise modal
	$(element).attr("id", id);
	$(element).find("input").val(password);
	if (width) $(element).width(width);

	//join server using password
	$(element)
		.find(".modal-ok")
		.click(function () {
			//ensure selected server is joinable
			let server = getSelectedServer();
			if ($(server).hasClass("outdated")) return;

			//get required info
			let address = $(server).data("address");
			let password = $(element).find("input").val();

			//remove saved password if textbox is empty
			if (password) {
				settings.passwords[address] = password;
			} else {
				delete settings.passwords[address];
			}

			//update saved password
			chrome.storage.sync.set({ passwords: settings.passwords });

			//close modal if no password was entered
			if (!password) {
				closeModal(element);
				return;
			}

			//open kag with password
			window.location = `kag://${address}/${password}`;
		});

	//initialise modal
	initModal(element);
}

function InfoModal(id, header, content, width = 0) {
	//clone template modal
	let element = cloneTemplateElement("#info-modal");

	//customise modal
	$(element).attr("id", id);
	$(element).find(".modal-header").html(header);
	$(element).find(".modal-content").html(content);
	if (width) $(element).width(width);

	//initialise modal
	initModal(element);
}

function initModal(element) {
	element = $(element);
	if (!element.length) return;

	closeModal(".password-modal");

	//append modal to page
	element.appendTo("body");

	focusModal(element);

	//make modal draggable
	element.draggable({
		containment: "parent",
		handle: ".modal-handle",
	});

	//hide modal when close button is clicked
	element.find(".modal-close").click(function (e) {
		closeModal(element);
	});

	//bring modal to front when clicked
	element.mousedown(function () {
		focusModal(element);
	});

	//show modal at centre of window
	element.css({
		transform: "scale(1)",
		opacity: 1,
		"pointer-events": "all",
		left: `calc(50% - ${$(element).outerWidth() / 2}px)`,
		top: `calc(50% - ${$(element).outerHeight() / 2}px)`,
	});
}

function focusModal(element) {
	element = $(element);
	if (!element.length) return;

	bringModalToFront(element);

	//focus textbox if one exists
	let textbox = element.find("input");
	if (textbox.length) {
		textbox.focus();
	}
}

function bringModalToFront(element) {
	element = $(element);
	if (!element.length || element.is(":last-child")) return;

	element.appendTo(element.parent());
}

function closeModal(element) {
	element = $(element);
	if (!element.length) return;

	element.addClass("closed");

	//hide modal
	element.css({
		transform: "scale(0)",
		opacity: 0,
		"pointer-events": "none",
	});

	element.each((i, ele) => {
		//delete modal when completely hidden
		//ensure the ms is the same as in css
		setTimeout(() => ele.remove(), 200);
	});

	//unfocus everything
	$("*").blur();
}

function closeTopmostModal() {
	closeModal($(".modal").last());
}

function isModalOpen() {
	return $(".modal:not(.closed)").length;
}
