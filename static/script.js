var cards = {};
var totalcolumns = 0;
var columns = [];
var requiredPassword = null;
var passwordAttempts = 0;
var currentTheme = "bigcards";
var currentFont = {family: 'Covered By Your Grace', size: 16};
var boardInitialized = false;
var keyTrap = null;

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

    console.log("sendAction", message);

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

    console.log('Users in room:', users);

    const container = document.getElementById('userListContainer');
    container.innerHTML = '';  // Clear the container

    const div = document.createElement('div');
    div.className = 'flex justify-center mt-4 font-customFont';

    const ul = document.createElement('ul');
    ul.className = 'bg-transparent p-4 w-fit max-w-xs text-center';
    ul.id = 'userList';

    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'flex items-center space-x-3 px-4 hover:text-gray-800 text-gray-500 text-[1.2em]';

        // Construct avatar image URL
        const avatarUrl = `${AVATAR_API}?seed=${encodeURIComponent(user)}&${dicebearQuery}`;
        
        // Create img element for avatar
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = "User Avatar";
        img.title = user;
        img.className = 'w-7 h-7 opacity-80 hover:opacity-100';  // Tailwind classes for size and rounding

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
function getMessage(m) {
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
			initPasswordForm(false);
			requiredPassword = data;
			break;

        case 'moveCard':
            console.log("moving card:", data.id)
            moveCard($("#" + data.id), data.position);
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
            $("#" + data.id).fadeOut(200, () => { $(this).remove() });
            break;

        case 'editCard':
            $("#" + data.id).children('.content:first').text(data.value);
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
    blockUI(
        `${attempt === true ? '<h1 class="mb-2">Invalid password</h1>' : '<h1 class="mb-2">Room protected</h1>'}
        <form id="password-form" class="mt-8">
            <input type="password" id="room-password" placeholder="Enter the room password" class="w-3/5 px-4 py-2 rounded shadow focus:outline-none focus:shadow-outline">
            <div class="flex flex-col items-center mt-2 space-y-2">
                <input type="submit" class="text-white font-black bg-transparent cursor-pointer opacity-70 hover:opacity-100 hover:shadow-lg px-4 py-2 rounded" value="Submit">
                <button id="exit-form" class="text-red-400 opacity-70 font-black cursor-pointer hover:opacity-100 hover:shadow-lg px-4 py-2 rounded">Go back home</button>
            </div>
        </form>`
    );

	$('#password-form').submit(function(event) {
		event.preventDefault();

        if (! $('#room-password').val() ) return;
		
		if (validatePassword($('#room-password').val()) === true) {
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
        e.preventDefault();  // Prevent default click behavior

		var passwrd = $('#lock-password').val().trim();
		var confirmPasswrd = $('#lock-password-confirm').val().trim();

        console.log("submit password triggered");
		
		if (validateLock(passwrd, confirmPasswrd) === true) {
			sendAction('setPassword', (passwrd !== null ? window.btoa(passwrd) : null));
			unblockUI();
            location.reload(); 
		}
	});

    $('#lock-password, #lock-password-confirm').on('keypress', function(e) {
        if (e.which == 13) {  // 13 is the keycode for 'Enter'
            e.preventDefault();  // Prevent the default form submission behavior
            
            var passwrd = $('#lock-password').val().trim();  // Get and trim the password
            if (passwrd !== "") {  // Check if the password input is not empty
                var confirmPasswrd = $('#lock-password-confirm').val().trim();  // Get and trim the confirm password
                if (validateLock(passwrd, confirmPasswrd) === true) {  // Validate the passwords if necessary
                    $('#lock-submit').click();  // Trigger the form submission
                } else {
                    // Optionally handle validation failure (e.g., show a message)
                }
            } else {
                // Optionally handle the case where the password is empty (e.g., show a message)
            }
        }
    });

    $('#close-form').on('click', function(e) {
        e.preventDefault();  // Prevent default click behavior

        unblockUI();
    });

	$('#lock-remove').on('click', function(e) {
        e.preventDefault();  // Prevent default click behavior
        console.log("remove password triggered");

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
	
	if (passwordAttempts > 5) {
		// blockUI('<h1>You have attempted to login too many times. Please return to the homepage</h1><br>');
        const message = 'You have attempted to login too many times.';
        let countdown = 5;
        
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
	
	var modified = window.btoa(passwrd);
	
	if (requiredPassword == modified) {
		return true;
	}
	
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
    <div id="${id}" class="card ${colour} draggable" style="transform:rotate(${rot}deg);">
        <img src="${AVATAR_API}?seed=${user}&${dicebearQuery}" class="card-avatar card-icon w-6 h-6 rounded-full z-10" alt="User Avatar" title="${user}" />
        <img src="/images/icons/token/Xion.png" class="card-icon delete-card-icon z-10" />
        
        <img class="card-image" src="/images/${colour}-card.png" />
        <div data-user="${user}" id="content:${id}" class="content stickertarget droppable">${text}</div>
        <span class="flex space-x-2 filler">
        </span>
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

    card.children(".droppable").droppable({
        accept: '.sticker',
        drop: function(event, ui) {
            var stickerId = ui.draggable.attr("id");
            var cardId = $(this).parent().attr('id');

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

    var startPosition = $("#create-card").position();

    card.css('top', startPosition.top - card.height() * 0.5);
    card.css('left', startPosition.left - card.width() * 0.5);

    card.animate({
        left: x + "px",
        top: y + "px"
    }, speed);

    card.hover(
        function() {
            // var cardOwner = $(this).find('.content').data('user');
            if (cardOwner === currentUser) {
                $(this).addClass('hover');
                $(this).children('.card-icon').fadeIn(0);
            }
            $(this).children('.card-avatar').fadeIn(0);

        },
        function() {
            $(this).removeClass('hover');
            $(this).children('.card-icon').fadeOut(0);
        }
    );

    card.children('.card-icon').hover(
        function() {
            $(this).addClass('card-icon-hover');
        },
        function() {
            $(this).removeClass('card-icon-hover');
        }
    );

    card.children('.delete-card-icon').click(
        function() {
            $("#" + id).remove();
            sendAction('deleteCard', {'id': id, room: ROOM}); // notify server of delete
        }
    );

    if (cardOwner === currentUser) {
        card.children('.content').editable(function(value, settings) {
            onCardChange(id, value);
            return (value);
        }, {
            type: 'textarea',
            multiline: true,
            style: 'inherit',
            cssclass: 'card-edit-form',
            placeholder: `Double Click to Edit`,
            onblur: 'submit',
            event: 'dblclick', //event: 'mouseover'
        });
    }

    //add applicable sticker
    if (sticker) addSticker(id, sticker);

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
    }, 500);
}

function addSticker(cardId, stickerId) {
    const stickerContainer = $('#' + cardId + ' .filler');

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
    console.log('Adding user to room:', data);
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

    console.log("User creating card:", user, ROOM);

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
        const result = await setUserAsParticipant(obj);
        if (result.success) {
            console.log('User added to room successfully:', result);
        } else {
            console.error('Failed to add user to room:', result.error);
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

function randomCardColour() {
    var colours = ['yellow', 'green', 'blue', 'white'];

    var i = Math.floor(Math.random() * colours.length);

    return colours[i];
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

    $('#icon-col').before('<td class="' + cls +
        '" width="10%" style="display:none; font-size: 1.75em;"><h2 id="col-' + (totalcolumns + 1) +
        '" class="editable">' + columnName + '</h2></td>');

    $('.editable').editable(function(value, settings) {
        onColumnChange(this.id, value);
        return (value);
    }, {
        style: 'inherit',
        cssclass: 'card-edit-form',
        type: 'textarea',
        placeholder: 'New',
        onblur: 'submit',
        width: '',
        height: '',
        event: 'dblclick', //event: 'mouseover'
        }
    );

    $('.col:last').fadeIn(100);

    totalcolumns++;
}

function onColumnChange(id, text) {
    var names = Array();

    //console.log(id + " " + text );

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

    $('.col:last').fadeOut(150,
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
    $('.col').fadeOut('slow', next());
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
            var rotation = Math.random() * 10 - 5; //add a bit of random rotation (+/- 10deg)
            let uniqueID = Math.round(Math.random() * 99999999); //is this big enough to assure uniqueness?
			var x = (window.innerWidth / 2) + $(window).scrollLeft();
			var y = (window.innerHeight / 2) + $(window).scrollTop();
			
            createCard(
                'card' + uniqueID,
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


    $(".board-outline").resizable({
        ghost: false,
        minWidth: 700,
        minHeight: 500,
        maxWidth: 3200,
        maxHeight: 1800,
    });

    //A new scope for precalculating
    (function() {
        var offsets;

        $(".board-outline").bind("resizestart", function() {
            offsets = calcCardOffset();
        });
        $(".board-outline").bind("resize", function(event, ui) {

            // adjustCard(offsets, false);
        });
        $(".board-outline").bind("resizestop", function(event, ui) {

            boardResizeHappened(event, ui);
            // adjustCard(offsets, true);
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