var cards = {};
var totalcolumns = 0;
var columns = [];
var requiredPassword = null;
var passwordAttempts = 0;
var MaxPasswordAttempts = 5;
var currentTheme = "bigcards";
var currentFont = {family: 'Covered By Your Grace', size: 16};
var boardInitialized = false;
var keyTrap = null;
const CARD_COLORS = ["green", "yellow", "blue", "white"];

// const baseurl = location.origin;
var baseurl = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
var socket = io.connect({path: "/socketio"});
// var socket = io.connect({path: baseurl + "/socket.io"});

const room_end_url = location.pathname.split('/').filter(Boolean); // retrieve the final part of the path be the room name

const ROOM = decodeURIComponent(room_end_url.pop());
const USERNAME = GLOB_VAR.user; // getCookie("username"); // await fetchCurrentUser()
const AVATAR_API = GLOB_VAR.avatar_api;


window.addEventListener('beforeunload', function() {
    if (socket) {
        socket.disconnect();
    }
});

// message sending handler
function sendAction(a, d) {
    var message = {
        action: a,
        data: d
    };

    // console.log("sendAction", message);

    // socket.json uses 'message' channel by default
    socket.json.send(message);
}

// message receiving handler
socket.on('message', function(data) {
    getMessage(data);
});

socket.on('connect', function() {
    const data = {
        room: ROOM,
        user: USERNAME
    }

    // join the room which will trigger the initializations
    sendAction('joinRoom', data);
});

socket.on('updateRoomUsers', (users) => {
    const dicebearQuery = "scale=50&radius=50&rowColor=00897b,00acc1,039be5,3949ab,43a047,546e7a,5e35b1,6d4c41,757575,7cb342,8e24aa,c0ca33,d81b60,e53935,f4511e,ffb300,1e88e5";

    // console.log('Users in room:', users);

    const container = document.getElementById('userListContainer');
    container.innerHTML = '';  // Clear the container

    const div = document.createElement('div');
    div.className = 'flex justify-center font-customFont';

    const ul = document.createElement('ul');
    ul.className = 'bg-transparent p-4 w-fit max-w-xs text-center';
    ul.id = 'userList';

    // users = [
    //     "John", "Jane", "Alice", "Bob", "Claire",
    //     "David", "Emma", "Frank", "Grace", "Henry",
    //     "Isabel", "Jack", "Karen", "Leo", "Mia",
    //     "Nick", "Olivia", "Paul", "Quinn", "Rachel"
    // ];
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user border-2 border-dark-500 flex items-center my-2 space-x-3 px-4 opacity-80 hover:text-gray-800 hover:opacity-100 text-gray-500 text-[1.2em]';
        li.title = user;
        // Construct avatar image URL
        const avatarUrl = `${AVATAR_API}?seed=${encodeURIComponent(user)}&${dicebearQuery}`;
        
        // Create img element for avatar
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = "User Avatar";
        img.className = 'w-7 h-7';  // Tailwind classes for size and rounding

        // Create span for username
        const username = document.createElement('span');
        username.textContent = user;

        li.appendChild(img);
        li.appendChild(username);
        ul.appendChild(li);
    });

    div.appendChild(ul);
    container.appendChild(div);
});


//respond to an action event
async function getMessage(m) {
    var message = m; //JSON.parse(m);
    var action = message.action;
    var data = message.data;

    switch (action) {
        case 'roomAccept':
            //okay we're accepted, then request initialization
            //(this is a bit of unnessary back and forth but that's okay for now)
            sendAction('initializeMe', {room: ROOM});
            break;

        case 'roomDeny':
            //this doesn't happen yet
            break;
			
		case 'requirePassword':
            requiredPassword = data;

            // Check if user has right to access room (i.e. he already entered the password)
            const isUserAllowed = await checkUserRightAccess(ROOM, USERNAME);
            if (isUserAllowed) {
                sendAction('passwordValidated', null);
            } else {
                // Show the password form
                initPasswordForm(false);
            }

            // if (localStorage.getItem(`room-${ROOM}-passwordValidated`) === 'true') {
            //     pwd_room = await fetchRoomPwd(ROOM);
            // }

            // if (pwd_room && validatePassword(window.atob(pwd_room.data))) {
            //     sendAction('passwordValidated', null);

            break;
        case 'moveCard':
            moveCard($(`#${data.id}`), data.position);
            break;

        case 'initCards':
            initCards(data);
            break;

        case 'createCard':
            const sticker = null;
            const animationspeed = 250;

            drawNewCard(data.id, data.text, data.x, data.y, data.rot, data.colour, sticker, animationspeed, data.user);
            break;

        case 'deleteCard':
            $(`#${data.id}`).fadeOut(50, () => { $(this).remove() });
            break;

        case 'editCard':
            $(`#${data.id}`).find('.content').text(data.value);
            break;

        case 'initColumns':
            initColumns(data);
            break;

        case 'updateColumns':
            initColumns(data);
            break;

        case 'changeTheme':
            changeThemeTo(data);
            break;
			
		case 'changeFont':
            changeFontTo(data);
            break;

        case 'join-announce':
            displayUserJoined(data.sid, data.user_name);
            break;

        case 'leave-announce':
            displayUserLeft(data.sid);
            break;

        case 'initialUsers':
            displayInitialUsers(data);
            break;

        case 'addSticker':
            addSticker(message.data.cardId, message.data.stickerId);
            break;

        case 'removeSticker':
            removeSticker(message.data.stickerId);
            break;
    
        case 'setBoardSize':
            resizeBoard(message.data);
            break;

        case 'changeCardColor':
            onCardChangeColor(data.id, data.color);
            break

        default:
            //unknown message
            alert('unknown action: ' + JSON.stringify(message));
            break;
    }


}


function unblockUI() {
    $.unblockUI({fadeOut: 20});
}

function blockUI(message) {
    message = message || 'Waiting...';

    $.blockUI({
        message: message,

        css: {
            border: 'none',
            padding: '15px',
            backgroundColor: '#000',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: 0.68,
            color: '#fff',
            fontSize: '20px'
        },

        fadeOut: 0,
        fadeIn: 10
    });
}


$(document).bind('keyup', function(event) {
    keyTrap = event.which;
});


// password functions
function initPasswordForm(attempt) {
    //             <div class="w-3/5 text-red-600 text-left text-sm mx-auto">Remaining attempts: ${MaxPasswordAttempts - passwordAttempts}</div>

    blockUI(
        `<h1 class="mb-2">Room protected</h1>
        <form id="password-form" class="mt-8">
            <input type="password" id="room-password" placeholder="Enter the room password" class="w-3/5 px-4 py-2 rounded shadow focus:outline-none focus:shadow-outline">
            <div id="pwd-message" class="w-3/5 text-red-600 text-left text-xs mx-auto opacity-0">Invalid password</div>

            <div class="flex flex-col items-center mt-2 space-y-2">
                <input type="submit" class="text-white font-black bg-transparent cursor-pointer opacity-70 hover:opacity-100 hover:shadow-lg px-4 py-2 rounded" value="Submit">
                <button id="exit-form" class="text-red-400 opacity-70 font-black cursor-pointer hover:opacity-100 hover:shadow-lg px-4 py-2 rounded">Go back</button>
            </div>
        </form>`
    );

    if (attempt === true) {
        $('#pwd-message').removeClass("opacity-0");
        $('#pwd-message').addClass("opacity-90");
    }

	$('#password-form').submit(async function(event) {
		event.preventDefault();

        const pwd = $('#room-password').val().trim();
        if (!pwd) return;
		
		if (validatePassword(pwd)) {
            // Store that the password has been validated
            // localStorage.setItem(`room-${ROOM}-passwordValidated`, 'true');

            // Add user as allowed members in the room - Remember user has already entered the password
            await allowUserAccess(ROOM, USERNAME);
			sendAction('passwordValidated', null);
		}
	});


    $('#exit-form').on('click', function(e) {
        e.preventDefault();  // Prevent default click behavior

        window.location.href = "/rooms"
    });
	
}

function initLockForm(attempt) {

    // Determine the content based on whether the password is required
    let formContent;
    if (requiredPassword !== null) {
        // Room is locked, provide an option to unlock
        formContent = `
        <div class="relative"> <!-- Container with relative positioning -->
            <span id="close-form" class="absolute top-0 right-0 opacity-70 hover:opacity-100 hover:shadow-lg hover:cursor-pointer">
                <i class="fa fa-times"></i> <!-- Close icon -->
            </span>
            <h1 class="mb-2">Unlock your room</h1>
        </div>
        <div id="lock-form" class="flex justify-center mt-8">
            <div id="lock-remove" class="flex items-center mt-2 space-x-2 font-black border border-gray-400 border-solid rounded-lg py-2 px-8 text-white bg-transparent cursor-pointer opacity-70 hover:opacity-100 hover:shadow-lg">
                <i class="fa fa-unlock"></i>
                <span>Unlock</span>
            </div>        
        </div>
        `;
    } else {
        // Room is not locked, provide options to lock
        formContent = `
            <div class="relative"> <!-- Container with relative positioning -->
                <span id="close-form" class="absolute top-0 right-0 opacity-70 hover:opacity-100 hover:shadow-lg hover:cursor-pointer">
                    <i class="fa fa-times"></i> <!-- Close icon -->
                </span>
                <h1 class="mb-2">${attempt ? "The passwords do not match!" : "Protect room private"}</h1>
            </div>
            <div id="lock-form" class="flex flex-col w-3/5  mx-auto mt-8">
                <input type="password" id="lock-password" placeholder="Password">
                <input type="password" id="lock-password-confirm" placeholder="Confirm Password">
                <div class="flex justify-center mt-2 ">
                    <input id="lock-submit" type="submit" value="Submit" class="text-white font-black bg-transparent cursor-pointer opacity-70 hover:opacity-100 hover:shadow-lg">
                </div>
            </div>
        `;
    }

    // Use the determined form content in the blockUI function
    blockUI(formContent);

	$('#lock-submit').on('click', function(e) {
        e.preventDefault();

		var passwrd = $('#lock-password').val().trim();
		var confirmPasswrd = $('#lock-password-confirm').val().trim();

        if (!passwrd || !confirmPasswrd) return;
		
		if (validateLock(passwrd, confirmPasswrd)) {
            const bPassword = (passwrd !== null ? window.btoa(passwrd) : null);
			sendAction('setPassword', bPassword);
			unblockUI();
            location.reload();
		}
	});

    $('#lock-password, #lock-password-confirm').on('keypress', function(e) {
        if (e.which == 13) {  // 13 is the keycode for 'Enter'
            e.preventDefault();
            $('#lock-submit').click();
        }
    });

    $('#close-form').on('click', function(e) {
        e.preventDefault();
        unblockUI();
        location.reload();
    });

	$('#lock-remove').on('click', function(e) {
		sendAction('clearPassword', null);
        unblockUI();
        location.reload();
	});
}


function validateLock(passwrd, confirmPasswrd) {	
	if ( !passwrd ) {
		return false;
	}
	
	if (passwrd != confirmPasswrd) {
		initLockForm(true);
		return false;
	}
	
	requiredPassword = passwrd;
	return true;
}


function validatePassword(passwrd) {	
	passwordAttempts++;
	
    // Invalid password, too many attemps - redirect to home page
	if (passwordAttempts > 5) {
		// blockUI('<h1>You have attempted to login too many times. Please return to the homepage</h1><br>');
        const message = 'You have attempted to login too many times.';
        let countdown = 3;
        
        // Initial display with full message
        blockUI(`${message} You will be redirected to the home page in <span id="countdown">${countdown}</span> seconds.`);
        
        const intervalId = setInterval(() => {
            countdown -= 1;
            if (countdown < 0) {
                clearInterval(intervalId);
                window.location.href = '/home';
            } else {
                // Update only the countdown part in the existing displayed message
                document.getElementById('countdown').textContent = countdown;
            }
        }, 1000);

		return false;
	}
	
    // Valid password
	if (requiredPassword == window.btoa(passwrd)) {
		return true;
	}
	
    // Invalid password - send back the form
    initPasswordForm(true);

	return false;
}


// card functions
async function drawNewCard(id, text, x, y, rot, colour, sticker, animationspeed, user) {
    //cards[id] = {id: id, text: text, x: x, y: y, rot: rot, colour: colour};
    // const textDivs = text.split('\n').map(line => `<div>${line.trim()}</div>`).join('');
    const currentUser = USERNAME;
    var cardOwner = user;

    const dicebearQuery = "scale=50&radius=50&rowColor=00897b,00acc1,039be5,3949ab,43a047,546e7a,5e35b1,6d4c41,757575,7cb342,8e24aa,c0ca33,d81b60,e53935,f4511e,ffb300,1e88e5";

    var h = `
    <div id="${id}" class="absolute card ${colour} draggable w-fit h-40" style="transform:rotate(${rot}deg);">

        <div class="relative top-[0.4rem] px-1 flex h-6 mx-auto justify-between w-44">

            <div class="flex items-center space-x-2 z-10">
                <img
                    src="/api/get_avatar/${user}?${dicebearQuery}"
                    // src="${AVATAR_API}?seed=${user}&${dicebearQuery}"
                    class="icon-card avatar-card hidden w-6 h-6 rounded-full z-10 opacity-50 hover:cursor-pointer hover:opacity-90"
                    alt="User Avatar"
                    title="${user}" 
                />
            </div>

            <div class="flex items-center space-x-2">
                <svg fill="#000000" aria-labelledby="Change color" title="Change color" class="icon-card icon-color-change hidden w-4 h-4 opacity-50 hover:cursor-pointer hover:opacity-90" viewBox="0 0 256.00 256.00" id="Flat" xmlns="http://www.w3.org/2000/svg" stroke="#000000" stroke-width="0.00256"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M230.627,25.37207a32.03909,32.03909,0,0,0-45.2539,0c-.10254.10156-.20117.207-.29785.31348L130.17383,86.85938l-9.20313-9.20313a24.00066,24.00066,0,0,0-33.9414,0L10.34277,154.34277a8.00122,8.00122,0,0,0,0,11.31446l80,80a8.00181,8.00181,0,0,0,11.31446,0l76.68652-76.68653a24.00066,24.00066,0,0,0,0-33.9414l-9.20313-9.20215L230.31445,70.9248c.10645-.09668.21192-.19531.31348-.29785A32.03761,32.03761,0,0,0,230.627,25.37207ZM96,228.68652,81.87842,214.56494l25.53467-25.53369A8.00053,8.00053,0,0,0,96.09863,177.7168L70.564,203.25049,53.87842,186.56494l25.53467-25.53369A8.00053,8.00053,0,0,0,68.09863,149.7168L42.564,175.25049,27.31348,160,72,115.31445,140.68555,184Z"></path> </g></svg>
                <img src="/images/icons/token/Xion.png" class="icon-card delete-card-icon hidden w-3 h-3 z-10 opacity-50 hover:cursor-pointer hover:opacity-90" title="Delete card"/>
            </div>

        </div>

        <div class="relative w-44 text-center mx-auto">
            <div data-user="${user}" data-color="${colour}" id="content:${id}" class="relative overflow-clip content p-[0.6rem] mx-auto h-[8rem] w-44 stickertarget droppable" style="background-image: url('/images/${colour}-card.png'); background-position: 55% 28%">${text}</div>
        </div>

        <div id="sticker-container" class="pr-2 relative bottom-8 flex items-center justify-end space-x-2 mx-auto w-44 h-4"></div>

	</div>`;

    var card = $(h);
    card.appendTo('#board');

	
	// Initialize any custom room font onto the card
	changeFontTo(currentFont);

    //@TODO
    //Draggable has a bug which prevents blur event
    //http://bugs.jqueryui.com/ticket/4261
    //So we have to blur all the cards and editable areas when
    //we click on a card
    //The following doesn't work so we will do the bug
    //fix recommended in the above bug report
    // card.click( function() {
    // 	$(this).focus();
    // } );

    card.draggable({
        snap: false,
        snapTolerance: 5,
        containment: [0, 0, 2000, 2000],
        stack: ".card",
        start: function(event, ui) {
            keyTrap = null;
        },
        drag: function(event, ui) {
            if (keyTrap == 27) {
                ui.helper.css(ui.originalPosition);
                return false;
            }
        },
		handle: "div.content"
    });

    //After a drag:
    card.bind("dragstop", function(event, ui) {
        if (keyTrap == 27) {
            keyTrap = null;
            return;
        }

        var data = {
            id: this.id,
            position: ui.position,
            oldposition: ui.originalPosition,
            room: ROOM
        };

        sendAction('moveCard', data);
    });

    card.find(".droppable").droppable({
        accept: '.sticker',
        drop: function(event, ui) {
            var stickerId = ui.draggable.attr("id");
            var cardId = card.attr("id") // $(this).parent().attr('id');

            addSticker(cardId, stickerId);

            var data = {
                cardId: cardId,
                stickerId: stickerId,
                room: ROOM
            };
            sendAction('addSticker', data);

            //remove hover state to everything on the board to prevent
            //a jquery bug where it gets left around
            $('.card-hover-draggable').removeClass('card-hover-draggable');
        },
        hoverClass: 'card-hover-draggable'
    });

    var speed = Math.floor(Math.random() * 800) + 200;
    if (typeof(animationspeed) != 'undefined') speed = animationspeed;

    // var startPosition = $("#create-card").position();
    // card.css('top', startPosition.top - card.height() * 0.5);
    // card.css('left', startPosition.left - card.width() * 0.5);

    card.animate({
        left: `${x}px`,
        top: `${y}px`
    }, speed);

    card.hover(
        function() {
            if (cardOwner === currentUser) {
                $(this).find('.icon-card').fadeIn(0);
            }
            $(this).find('.avatar-card').fadeIn(0);

        },
        function() {
            $(this).find('.icon-card').fadeOut(0);
        }
    );

    card.find('.delete-card-icon').click(
        function() {
            $(`#${id}`).remove();
            sendAction('deleteCard', {'id': id, room: ROOM}); // notify server of delete
        }
    );

    card.find('.icon-color-change').click(
        function() {
            let content = card.find(".content");

            let currentColor = content.data('color');  // Assume we store the current color in a data attribute

            // Get the current index of the font family
            let currentIndex = CARD_COLORS.indexOf(currentColor);

            // Determine the next index: if at the end, cycle back to the start
            let nextIndex = (currentIndex + 1) % CARD_COLORS.length;

            // Set the new font family
            let nextColor = CARD_COLORS[nextIndex];

            content.css('background-image', `url("/images/${nextColor}-card.png"`);
            content.data('color', nextColor);

            sendAction("changeCardColor", {id: id, color: nextColor});
        }
    );

    if (cardOwner === currentUser) {
        card.find('.content').editable(function(value, settings) {
            onCardChange(id, value);
            return (value);
        }, {
            type: 'textarea',
            multiline: true,
            // style: 'inherit',
            cssclass: 'card-edit-form',
            placeholder: `Double Click to Edit`,
            onblur: 'submit', // (value) => {customSubmitFunction(value)},// 
            event: 'dblclick', //event: 'mouseover'
            // data: (value) => {return value.replaceAll("<br>", "/n")}
        });
    }

    // if (cardOwner === currentUser) {
    //     card.find('.content').editable(function(value, settings) {
    //     }, {
    //         type: 'textarea',
    //         multiline: true,
    //         // style: 'inherit',
    //         cssclass: 'card-edit-form',
    //         placeholder: `Double Click to Edit`,
    //         onblur: (value) => {customSubmitFunction(value)},// 'submit',
    //         event: 'dblclick', //event: 'mouseover'
    //         loaddata: (data) => {console.log(data)}
    //     });
    // }

    //add applicable sticker
    if (sticker) addSticker(id, sticker);

    function customSubmitFunction(value) {
        // Process the value if needed
        console.log("Custom submit with value:", value);
    
        let processedContent = value.replaceAll('\n', '<br>');
    
        // Update the DOM or handle the visual feedback
        document.getElementById(`content:${id}`).innerHTML = processedContent;

        onCardChange(id, value);
        return (value);
    }
    
}


function onCardChangeColor(id, color) {
    let content = $(`#${id}`).find(".content");

    content.css('background-image', `url("/images/${color}-card.png"`);
    content.data('color', color);
}


function onCardChange(id, text) {
    sendAction('editCard', {
        id: id,
        value: text,
        room: ROOM
    });
}

function moveCard(card, position) {
    card.animate({
        left: position.left + "px",
        top: position.top + "px"
    }, 200);
}

function addSticker(cardId, stickerId) {

    const stickerContainer = $(`#${cardId} #sticker-container`);


    if (stickerId === "nosticker") {
        stickerContainer.html("");
        return;
    }

    const appendSticker = (id) => {
        if (stickerContainer.html().indexOf(id) < 0) {
            const stickerImg = $(`<img id=${id} src="/images/stickers/${id}.png" class="sticker hover:cursor-pointer" title="double-click to remove"> `);
            stickerContainer.prepend(stickerImg);
            attachRemoveStickerEvent(stickerImg, cardId, stickerId);
        }
    };

    if (Array.isArray(stickerId)) {
        for (var i in stickerId) {
            appendSticker(stickerId[i]);
        }
    } else {
        appendSticker(stickerId);
    }
}

function attachRemoveStickerEvent(stickerElement, cardId, stickerId) {
    var data = {
        cardId: cardId,
        room: ROOM,
        stickerElement: stickerElement
    };


    stickerElement.on('dblclick', function() {
        data = {...data, stickerId: this.id};
        $(this).remove(); // Remove the sticker image from the DOM
        sendAction("removeSticker", data);
    });
}

function removeSticker(stickerId) {
    $(`#${stickerId}`).remove();
}


async function fetchRoomPwd(room) {
    try {
        const response = await fetch(`/api/get_pwd/${room}`);
        const data = await response.json();
        if (data.success) {
            return data
        } else {
            console.log(data.message);
            return
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}


async function checkUserRightAccess(room, username) {
    try {
        const data = {room: room, user: username};
        const response = await fetch('/api/check_user_access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error when checking user access! status: ${response.status}`);
        }
        return response.json();

    } catch (error) {
        console.error(`Error checking user ${username} to access room ${room}: ${error}`);
    }
}


async function allowUserAccess(room, username) {
    try {
        const data = {room: room, user: username};
        const response = await fetch('/api/allow_user_access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        console.log("response from fetching allowUserAccess: ", response);
    } catch (error) {
        console.error(`Error allowing user ${username} to access room ${room}: ${error}`);
    }
}

/**
 * Fetches the current user's information from the server. It returns the username
 * if the user is logged in. If not, it logs that the user is not logged in but does not return anything.
 *
 * @async
 * @returns {Promise<string|undefined>} A promise that resolves with the username of the currently logged-in user
 * if they are logged in, or undefined if not logged in.
 * @throws {Error} Throws an error if there is a problem fetching the user data.
 */
async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/current_user');
        const data = await response.json();
        if (data.success) {
            return data.username
        } else {
            console.log('Not logged in');
            return
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

/**
 * Adds a user as a participant to a room by sending user and room information to the server.
 * This function asynchronously posts data to the server and handles the response through a callback.
 * 
 * @param {Object} data An object containing the user and room details.
 * @param {string} data.user The username of the user to add as a participant.
 * @param {string} data.room The room identifier to which the user is being added.
 * @param {Function} callback A callback function that processes the result of the request. It takes one argument:
 *                            the result from the server.
 * 
 * @returns {void} This function does not return a value; it handles the result via a callback.
 * @throws {Error} Throws an error if the network request fails or if the API returns an error.
 */
async function setUserAsParticipant(data) {
    try {
        const response = await fetch('/api/add_room_to_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error adding room to user:', error);
        return { success: false, error: 'Failed to add room to user' };
    }
}


//----------------------------------
// cards
//----------------------------------
async function createCard(id, text, x, y, rot, colour) {
    // const user = await fetchCurrentUser();
    const user = USERNAME;

    const sticker = null;
    const animationspeed = 250;

    drawNewCard(id, text, x, y, rot, colour, sticker, animationspeed, user);

    var action = "createCard";

    var data = {
        id: id,
        text: text,
        x: x,
        y: y,
        rot: rot,
        colour: colour,
        user: user,
        room: ROOM
    };

    sendAction(action, data);

    // add user as a participant in the room
    const obj = {
        user: USERNAME,
        room: ROOM
    };

    try {
        const result = setUserAsParticipant(obj);
        if (!result.success) {
            console.error('Failed to add user to room:', result.error);
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

function randomCardColour() {
    var i = Math.floor(Math.random() * CARD_COLORS.length);

    return CARD_COLORS[i];
}


function initCards(cardArray) {
    //first delete any cards that exist
    $('.card').remove();

    cards = cardArray;

    for (var i in cardArray) {
        let card = cardArray[i];

        drawNewCard(
            card.id,
            card.text,
            card.x,
            card.y,
            card.rot,
            card.colour,
            card.sticker,
            0,
            card.user
        );
    }

    boardInitialized = true;
    unblockUI();
}


//----------------------------------
// cols
//----------------------------------

function drawNewColumn(columnName) {
    var cls = "col";
    if (totalcolumns === 0) {
        cls = "col first";
    }

    $('#icon-col').before(`<td class="${cls}" width="10%" style="display:none; font-size: 1.75em;"><h2 id="col-${totalcolumns + 1}" class="editable">${columnName}</h2></td>`);

    $('.editable').editable(function(value, settings) {
        onColumnChange(this.id, value);
        return (value);
    }, {
        style: 'inherit',
        cssclass: 'card-edit-form',
        type: 'textarea',
        placeholder: 'New',
        onblur: 'submit',
        width: '95%',
        height: '',
        event: 'dblclick', //event: 'mouseover'
        }
    );

    $('.col:last').fadeIn(10);

    totalcolumns++;
}

function onColumnChange(id, text) {
    var names = Array();

    //Get the names of all the columns right from the DOM
    $('.col').each(function() {

        //get ID of current column we are traversing over
        var thisID = $(this).children("h2").attr('id');

        if (id == thisID) {
            names.push(text);
        } else {
            names.push($(this).text());
        }
    });

    updateColumns(names);
}

function displayRemoveColumn() {
    if (totalcolumns <= 0) return false;

    $('.col:last').fadeOut(50,
        function() {
            $(this).remove();
        }
    );

    totalcolumns--;
}

function createColumn(name) {
    if (totalcolumns >= 8) return false;

    drawNewColumn(name);
    columns.push(name);

    var data = {
        columns: columns,
        room: ROOM
    };

    sendAction("updateColumns", data);
}

function deleteColumn() {
    if (totalcolumns <= 0) return false;

    displayRemoveColumn();
    columns.pop();

    var data = {
        columns: columns,
        room: ROOM
    };

    sendAction("updateColumns", data);
}

function updateColumns(c) {
    columns = c;

    var data = {
        columns: columns,
        room: ROOM
    };

    sendAction("updateColumns", data);
}

function deleteColumns(next) {
    //delete all existing columns:
    $('.col').fadeOut(50, next());
}

function initColumns(columnArray) {
    totalcolumns = 0;
    columns = columnArray;

    $('.col').remove();

    for (var i in columnArray) {
        let column = columnArray[i];

        drawNewColumn(
            column
        );
    }
}


function changeThemeTo(theme) {

    currentTheme = theme;
    $("link[title=cardsize]").attr("href", "/css/" + theme + ".css");
}

function changeFontTo(font) {
    currentFont = font;
    $(".card .content").css("font-family", font.family);
	$(".card .content").css("font-size", font.size);
}


//////////////////////////////////////////////////////////
////////// NAMES STUFF ///////////////////////////////////
//////////////////////////////////////////////////////////



// function setCookie(c_name, value, exdays) {
//     console.log("setting cookie")
//     var exdate = new Date();
//     exdate.setDate(exdate.getDate() + exdays);
//     var c_value = escape(value) + ((exdays === null) ? "" : "; expires=" +
//         exdate.toUTCString());
//     document.cookie = c_name + "=" + c_value;
// }


// function getCookie(name) {
//     let value = `; ${document.cookie}`;
//     let parts = value.split(`; ${name}=`);
//     if (parts.length === 2) return parts.pop().split(";").shift();
// }


// function setCookie(name, value, days, path, secure, sameSite) {
//     let expires = "";
//     if (days) {
//         const date = new Date();
//         date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
//         expires = `; expires=${date.toUTCString()}`;
//     }

//     const pathValue = path ? `; path=${path}` : '; path=/'; // Default path is root
//     const secureFlag = secure ? '; secure' : '';
//     const sameSitePolicy = sameSite ? `; samesite=${sameSite}` : '; samesite=Lax'; // Default samesite is Lax

//     document.cookie = `${name}=${encodeURIComponent(value)}${expires}${pathValue}${secureFlag}${sameSitePolicy}`;
// }



//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

function boardResizeHappened(event, ui) {
    var newsize = ui.size;

    sendAction('setBoardSize', newsize);
}

function resizeBoard(size) {
    $(".board-outline").animate({
        height: size.height,
        width: size.width
    });
}
//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

function calcCardOffset() {
    var offsets = {};
    $(".card").each(function() {
        var card = $(this);
        $(".col").each(function(i) {
            var col = $(this);
            if (col.offset().left + col.outerWidth() > card.offset().left +
                card.outerWidth() || i === $(".col").size() - 1) {
                offsets[card.attr('id')] = {
                    col: col,
                    x: ((card.offset().left - col.offset().left) / col.outerWidth())
                };
                return false;
            }
        });
    });
    return offsets;
}


//moves cards with a resize of the Board
//doSync is false if you don't want to synchronize
//with all the other users who are in this room
function adjustCard(offsets, doSync) {
    $(".card").each(function() {
        var card = $(this);
        var offset = offsets[this.id];
        if (offset) {
            var data = {
                id: this.id,
                position: {
                    left: offset.col.position().left + (offset.x * offset.col
                        .outerWidth()),
                    top: parseInt(card.css('top').slice(0, -2))
                },
                oldposition: {
                    left: parseInt(card.css('left').slice(0, -2)),
                    top: parseInt(card.css('top').slice(0, -2))
                },
                room: ROOM
            }; //use .css() instead of .position() because css' rotate
            //console.log(data);
            if (!doSync) {
                card.css('left', data.position.left);
                card.css('top', data.position.top);
            } else {
                //note that in this case, data.oldposition isn't accurate since
                //many moves have happened since the last sync
                //but that's okay becuase oldPosition isn't used right now
                moveCard(card, data.position);
                sendAction('moveCard', data);
            }

        }
    });
}

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

$(function() {
    if (boardInitialized === false)
        // blockUI('<img src="/images/ajax-loader.gif" width=43 height=11/>');

    //setTimeout($.unblockUI, 2000);

    $("#create-card").click(function() {
            var rotation = Math.random() * 12 - 3; // add a bit of random rotation (+/- 10deg)
            let uniqueID = Math.round(Math.random() * 99999999); // is this big enough to assure uniqueness?

            let boardPosition = $(".board-outline").position();        
			var y = boardPosition.top  + $(".board-outline").height() ; 
			var x = boardPosition.left + $(".board-outline").outerWidth();
			
            createCard(
                `card${uniqueID}`,
                '',
                x, 
				y,
                rotation,
                randomCardColour()
            );
    });

    // Style changer
    $("#smallify").click(function() {
		
        if (currentTheme == "smallcards") {
            changeThemeTo('mediumcards');
        } else if (currentTheme == "mediumcards") {
            changeThemeTo('bigcards');
        } else {
			changeThemeTo('smallcards');
		}

        let data = {
            theme: currentTheme,
            room: ROOM
        }

        sendAction('changeTheme', data);
        return false;
    });

	
    // Style changer
    $("#fontify").click(function() {
        // Array of font families to cycle through
        const fonts = [
            "Covered By Your Grace", "Chela One", "Gaegu", 
            "Merienda", "Oswald", "Roboto", "Ubuntu"
        ];

        var font = currentFont || {
            family: 'Covered By Your Grace', // Default family if none is set
            size: 16 // Default size if none is set
        };

        // Get the current index of the font family
        let currentIndex = fonts.indexOf(font.family);

        // Determine the next index: if at the end, cycle back to the start
        let nextIndex = (currentIndex + 1) % fonts.length;

        // Set the new font family
        font.family = fonts[nextIndex];

        changeFontTo(font);

        let data = {
            font: font,
            room: ROOM
        };

        sendAction('changeFont', data);

        return false; // Prevent default action
    });
	
    // Increase card font size
    $('#font-increase').click(function() {
        var font = currentFont || {
            family: 'Covered By Your Grace', // Default font family if none is set
            size: 16 // Start at a default size if none is set
        };

        font.size += 1; // Increment the font size

        if (font.size > 20) { // Check if the font size goes beyond the maximum
            font.size = 10; // Reset to the minimum size, creating a cycle
        }

        changeFontTo(font);

        let data = {
            font: font,
            room: ROOM
        }

        sendAction('changeFont', data);

        return false; // Prevent default action
    });

    // Decrease card font size
    $('#font-decrease').click(function() {
        var font = currentFont || {
            family: 'Covered By Your Grace', // Default font family if none is set
            size: 16 // Start at a default size if none is set
        };

        console.log(font);

        font.size -= 1; // Decrement the font size

        if (font.size < 10) { // Check if the font size goes below the minimum
            font.size = 20; // Reset to the maximum size, creating a cycle
        }

        changeFontTo(font);

        let data = {
            font: font,
            room: ROOM
        }

        sendAction('changeFont', data);

        return false; // Prevent default action
    });   
	

	// Setup a password
	$('#protect-room').click(function() {
		initLockForm(false);
		return false;
	});

    $('#icon-col').hover(
        function() {
            $('.col-icon').fadeIn(10);
        },
        function() {
            $('.col-icon').fadeOut(150);
        }
    );

    $('#add-col').click(
        function() {
            createColumn('New');
            return false;
        }
    );

    $('#delete-col').click(
        function() {
            deleteColumn();
            return false;
        }
    );

    $(".sticker").draggable({
        revert: true,
        zIndex: 10000
    });


    // Calculate dimensions based on window size
    const maxWidth = $(window).width() * 0.78;
    const maxHeight = $(window).height() * 0.85;

    $(".board-outline").resizable({
        ghost: false,
        minWidth: 700, // Minimum width
        minHeight: 500, // Minimum height
        maxWidth: maxWidth, // 75% of the window width
        maxHeight: maxHeight, // 75% of the window height
    });

    // Optionally handle window resize to update constraints dynamically
    $(window).resize(function() {
        const updatedMaxWidth = $(window).width() * 0.78;
        const updatedMaxHeight = $(window).height() * 0.85;

        $(".board-outline").resizable("option", "maxWidth", updatedMaxWidth);
        $(".board-outline").resizable("option", "maxHeight", updatedMaxHeight);
    });


    //A new scope for precalculating
    (function() {
        var offsets;

        $(".board-outline").bind("resizestart", function() {
            offsets = calcCardOffset();
        });
        $(".board-outline").bind("resize", function(event, ui) {
            adjustCard(offsets, false);
        });
        $(".board-outline").bind("resizestop", function(event, ui) {
            boardResizeHappened(event, ui);
            adjustCard(offsets, true);
        });
    })();



    $('#marker').draggable({
        axis: 'x',
        containment: 'parent'
    });

    $('#eraser').draggable({
        axis: 'x',
        containment: 'parent'
    });
});

const container = document.getElementById('userListContainer');

// Event delegation from the container to the list items
container.addEventListener('mouseenter', function(event) {
    let targetElement = event.target.closest('li'); // Ensures the event is from an <li> element
    if (targetElement) {
        const username = targetElement.title; // Retrieve the title of the hovered <li>

        // Additional actions can be triggered here
        highlightCards(username, true);
    }
}, true); // True for capturing phase

// Event delegation from the container to the list items
container.addEventListener('mouseleave', function(event) {
    let targetElement = event.target.closest('li'); // Ensures the event is from an <li> element
    if (targetElement) {
        const username = targetElement.title; // Retrieve the title of the hovered <li>

        // Additional actions can be triggered here
        highlightCards(username, false);
    }
}, true); // True for capturing phase


function highlightCards(username, bool) {
    // Find all cards and loop through to match the username in the title of the avatar image
    const event = bool ? 'mouseenter' : 'mouseleave';

    document.querySelectorAll('.card').forEach(card => {
        const avatar = card.querySelector('.avatar-card');
        if (avatar && avatar.title === username) {

            // Apply hover effect
            $(card).trigger(event);
        }
    });
}
