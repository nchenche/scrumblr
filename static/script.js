var cards = {};
var totalcolumns = 0;
var columns = [];
var requiredPassword = null;
var passwordAttempts = 0;
var currentTheme = "bigcards";
var currentFont = null;
var boardInitialized = false;
var keyTrap = null;

// const baseurl = location.origin;
var baseurl = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
var socket = io.connect({path: "/socket.io"});
// var socket = io.connect({path: baseurl + "/socket.io"});


//an action has happened, send it to the
//server
function sendAction(a, d) {
    //console.log('--> ' + a);

    var message = {
        action: a,
        data: d
    };

    socket.json.send(message);
}

socket.on('connect', function() {
    //let the final part of the path be the room name
    const parts = location.pathname.split('/').filter(Boolean);
    const user = getCookie("username");

    const data = {
        room: parts.pop(),
        user: user
    }

    //imediately join the room which will trigger the initializations
    sendAction('joinRoom', data);
});

socket.on('disconnect', function() {
    blockUI("Server disconnected. Refresh page to try and reconnect...");
    //$('.blockOverlay').click($.unblockUI);
});

socket.on('message', function(data) {
    getMessage(data);
});

function unblockUI() {
    $.unblockUI({fadeOut: 50});
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
            opacity: 0.5,
            color: '#fff',
            fontSize: '20px'
        },

        fadeOut: 0,
        fadeIn: 10
    });
}

//respond to an action event
function getMessage(m) {
    var message = m; //JSON.parse(m);
    var action = message.action;
    var data = message.data;

    //console.log('<-- ' + action);

    switch (action) {
        case 'roomAccept':
            //okay we're accepted, then request initialization
            //(this is a bit of unnessary back and forth but that's okay for now)
            sendAction('initializeMe');
            break;

        case 'roomDeny':
            //this doesn't happen yet
            break;
			
		case 'requirePassword':
			initPasswordForm(false);
			requiredPassword = data;
			break;

        case 'moveCard':
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
            $("#" + data.id).fadeOut(500,
                function() {
                    $(this).remove();
                }
            );
            break;

        case 'editCard':
            // console.log("editing card")
            // var $container = $("#" + data.id).empty();  // Get the container by ID and empty it
            // var texts = data.text.split('\n');
            // $.each(texts, function(index, text) {
            //     if (text.trim() !== '') {  // Check if the text is not just whitespace
            //         $('<div></div>').text(text).appendTo($container);  // Create a div, set its text, and append it
            //     }
            // });

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

        case 'nameChangeAnnounce':
            updateName(message.data.sid, message.data.user_name);
            break;

        case 'addSticker':
            addSticker(message.data.cardId, message.data.stickerId);
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

$(document).bind('keyup', function(event) {
    keyTrap = event.which;
});

// password functions
function initPasswordForm(attempt) {
	
	blockUI((attempt === true ? '<h1>Invalid password!</h1><br>' : '' ) 
		+ '<form id="password-form"><input type="password" id="room-password" placeholder="Enter the room password..."><input type="submit" value="Go!"></form>');
	
	$('#password-form').submit(function(event) {
		event.preventDefault();
		
		if (validatePassword($('#room-password').val()) === true) {
			sendAction('passwordValidated', null);
		}
	});
	
}

function initLockForm(attempt) {
	
	blockUI((attempt === true ? '<h1>The passwords do not match!</h1><br>' : '' ) 
		+ '<form id="lock-form">'
		+ '<input type="password" id="lock-password" placeholder="Password"><br>'
		+ '<input type="password" id="lock-password-confirm" placeholder="Confirm Password"><br>'
		+ (requiredPassword !== null ? '<button id="lock-remove">Unlock</button>' : '')
		+ '<button id="lock-cancel">Cancel</button><input type="submit" value="Lock!"></form>');
		
	$('#lock-form').submit(function(event) {
		event.preventDefault();
		
		var passwrd = $('#lock-password').val();
		var confirmPasswrd = $('#lock-password-confirm').val();
		
		if (validateLock(passwrd, confirmPasswrd) === true) {
			sendAction('setPassword', (passwrd !== null ? window.btoa(passwrd) : null));
			unblockUI();
		}
	});
	
	$('#lock-form').on('click', '#lock-cancel', function() {
		sendAction('setPassword', null);
	});
	
	$('#lock-form').on('click', '#lock-remove', function() {
		sendAction('clearPassword', null);
	});
}

function validateLock(passwrd, confirmPasswrd) {
	
	if (passwrd == null || passwrd.length == 0) {
		return true;
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
		blockUI('<h1>You have attempted to login too many times. Please return to the homepage</h1><br>');
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
    const currentUser = await fetchCurrentUser();
    var cardOwner = user;


    var h = `
    <div id="${id}" class="card ${colour} draggable" style="transform:rotate(${rot}deg);">
        <img src="http://0.0.0.0:3000/8.x/identicon/svg?seed=${user}&scale=50&radius=50" class="card-avatar card-icon w-6 h-6 rounded-full z-10" alt="User Avatar" title="${user}" />
        <img src="/images/icons/token/Xion.png" class="card-icon delete-card-icon z-10" />
        <img class="card-image" src="/images/${colour}-card.png" />
        <div data-user="${user}" id="content:${id}" class="content stickertarget droppable">${text}</div>
        <span class="filler"></span>
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
                stickerId: stickerId
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
            //notify server of delete
            sendAction('deleteCard', {
                'id': id
            });
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
    if (sticker !== null) addSticker(id, sticker);

}


function onCardChange(id, text) {
    sendAction('editCard', {
        id: id,
        value: text
    });
}

function moveCard(card, position) {
    card.animate({
        left: position.left + "px",
        top: position.top + "px"
    }, 500);
}

function addSticker(cardId, stickerId) {

    stickerContainer = $('#' + cardId + ' .filler');

    if (stickerId === "nosticker") {
        stickerContainer.html("");
        return;
    }


    if (Array.isArray(stickerId)) {
        for (var i in stickerId) {
            stickerContainer.prepend('<img src="/images/stickers/' + stickerId[i] +
                '.png">');
        }
    } else {
        if (stickerContainer.html().indexOf(stickerId) < 0)
            stickerContainer.prepend('<img src="/images/stickers/' + stickerId +
                '.png">');
    }

}



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

//----------------------------------
// cards
//----------------------------------
async function createCard(id, text, x, y, rot, colour) {
    const user = await fetchCurrentUser();
    console.log("User creating card:", user);

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
        user: user
    };

    sendAction(action, data);

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
        '" width="10%" style="display:none"><h2 id="col-' + (totalcolumns + 1) +
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
        xindicator: '<img src="/images/ajax-loader.gif">',
        event: 'dblclick', //event: 'mouseover'
    });

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

    var action = "updateColumns";

    var data = columns;

    sendAction(action, data);
}

function deleteColumn() {
    if (totalcolumns <= 0) return false;

    displayRemoveColumn();
    columns.pop();

    var action = "updateColumns";

    var data = columns;

    sendAction(action, data);
}

function updateColumns(c) {
    columns = c;

    var action = "updateColumns";

    var data = columns;

    sendAction(action, data);
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



function setCookie(c_name, value, exdays) {
    console.log("setting cookie")
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = escape(value) + ((exdays === null) ? "" : "; expires=" +
        exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}


function getCookie(name) {
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
}


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


function setName(name) {
    let username = getCookie("username");
    // sendAction('setUserName', name);
    sendAction('setUserName', username);

    // setCookie('username', name, 365);
}

function displayInitialUsers(users) {
    for (var i in users) {
        //console.log(users);
        displayUserJoined(users[i].sid, users[i].user_name);
    }
}

function displayUserJoined(sid, user_name) {
    let name = '';
    if (user_name)
        name = user_name;
    else
        name = sid.substring(0, 5);


    $('#names-ul').append('<li id="user-' + sid + '">' + name + '</li>');
}

function displayUserLeft(sid) {
    let name = '';
    if (name)
        name = user_name;
    else
        name = sid;

    var id = '#user-' + sid.toString();

    $('#names-ul').children(id).fadeOut(1000, function() {
        $(this).remove();
    });
}


function updateName(sid, name) {
    var id = '#user-' + sid.toString();

    $('#names-ul').children(id).text(name);
}

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
                }
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


	//disable image dragging
	//window.ondragstart = function() { return false; };


    if (boardInitialized === false)
        blockUI('<img src="/images/ajax-loader.gif" width=43 height=11/>');

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

        sendAction('changeTheme', currentTheme);


        return false;
    });
	
	// Style changer
    $("#fontify").click(function() {
		
		var font = currentFont;
		
		if (font != null) {
			if (font.family == "Covered By Your Grace") {
				font.family = 'Chela One';
			} else if (font.family == "Chela One") {
				font.family = 'Gaegu';
			} else if (font.family == "Gaegu") {
				font.family = 'Merienda';
			} else if (font.family == "Merienda") {
				font.family = 'Oswald';
			} else if (font.family == "Oswald") {
				font.family = 'Roboto';
			} else if (font.family == "Roboto") {
				font.family = 'Ubuntu';
			} else {
				font.family = 'Covered By Your Grace';
			}
        } else {
			font = {
				family: 'Covered By Your Grace',
				size: '12'
			};
        }
		
		changeFontTo(font);
        sendAction('changeFont', currentFont);

        return false;
    });
	
	// Increase card font size
    $('#font-increase').click(function() {
		
		var font = currentFont;
		
		if (font != null) {
			font.size = font.size + 1;
		
			if (font.size > 20) {
				font.size = 8;
			}
		} else {
			font = {
				family: 'Covered By Your Grace',
				size: 12
			};
		}
		
        changeFontTo(font);
        sendAction('changeFont', currentFont);

        return false;
    });
	
	// Decrease card font size
    $('#font-decrease').click(function() {
		
		var font = currentFont;
		
		if (font != null) {
			font.size = font.size - 1;
		
			if (font.size < 8) {
				font.size = 22;
			}
		} else {
			font = {
				family: 'Covered By Your Grace',
				size: 12
			};
		}
		
        changeFontTo(font);
        sendAction('changeFont', currentFont);

        return false;
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


    // $('#cog-button').click( function(){
    // 	$('#config-dropdown').fadeToggle();
    // } );

    // $('#config-dropdown').hover(
    // 	function(){ /*$('#config-dropdown').fadeIn()*/ },
    // 	function(){ $('#config-dropdown').fadeOut() }
    // );
    //

    var user_name = getCookie('username');


    // $("#yourname-input").focus(function() {
    //     if ($(this).val() == 'unknown') {
    //         $(this).val("");
    //     }

    //     $(this).addClass('focused');

    // });

    $("#yourname-input").blur(function() {
        if ($(this).val() === "") {
            $(this).val('unknown');
        }
        // $(this).removeClass('focused');

        setName($(this).val());
    });

    $("#yourname-input").val(user_name);
    $("#yourname-input").blur();

    $("#yourname-li").hide();

    // $("#yourname-input").keypress(function(e) {
    //     code = (e.keyCode ? e.keyCode : e.which);
    //     if (code == 10 || code == 13) {
    //         $(this).blur();
    //     }
    // });



    $(".sticker").draggable({
        revert: true,
        zIndex: 1000
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