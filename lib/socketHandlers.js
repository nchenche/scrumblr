/**************
 SOCKET.I0
**************/

const sanitizer = require('sanitizer');
const rooms = require('./rooms.js');
var sids_to_user_names = [];

const roomUsers = {};  // Dictionary to keep track of users in each room



const { promisify } = require('util');



module.exports = function (io, db) {

    io.on('connection', function (client) {
        joinAsync = promisify(client.join).bind(client);


        client.on('message', function (message) {

            var data = message.data;
            var clean_data = {};
            var clean_message = {};
            var message_out = {};

            if (!message.action) return;

            switch (message.action) {
                case 'passwordValidated':
                    initUser(client, db);
                    break;

                case 'joinRoom':
                    joinRoom(client, data, db);
                    break;

                case 'clearPassword':
                    getRoom(client, function (room) {
                        db.clearPassword(room, null);
                    });
                    break;

                case 'setPassword':
                    if (data === null || data.length == 0) {
                        break;
                    }

                    getRoom(client, function (room) {
                        db.setPassword(room, data);
                    });
                    break;

                case 'moveCard':
                    console.log('client rooms: ', client.rooms);
                    console.log("Action received on the server side: moving card:", message)
                    //report to all other browsers
                    message_out = {
                        action: message.action,
                        data: {
                            id: scrub(message.data.id),
                            position: {
                                left: scrub(message.data.position.left),
                                top: scrub(message.data.position.top)
                            }
                        }
                    };

                    // client.broadcast.to(message.data.room).emit('message', message_out);
                    client.to(message.data.room).emit('message', message_out);


                    db.cardSetXY(message.data.room, data.id, data.position.left, data.position.top);
                    // getRoom(client, function (room) {
                    //     db.cardSetXY(room, data.id, data.position.left, data.position.top);
                    // });
                    break;

                case 'createCard':
                    clean_data = {};
                    clean_data.text = scrub(data.text);
                    clean_data.id = scrub(data.id);
                    clean_data.x = scrub(data.x);
                    clean_data.y = scrub(data.y);
                    clean_data.rot = scrub(data.rot);
                    clean_data.colour = scrub(data.colour);
                    clean_data.user = scrub(data.user);

                    const card = {
                        id: clean_data.id,
                        colour: clean_data.colour,
                        rot: clean_data.rot,
                        x: clean_data.x,
                        y: clean_data.y,
                        text: clean_data.text,
                        sticker: null,
                        user: clean_data.user
                    };

                    db.createCard(message.data.room, clean_data.id, card);

                    message_out = {
                        action: 'createCard',
                        data: clean_data
                    };

                    //report to all other browsers
                    client.to(message.data.room).emit('message', message_out);
                    // broadcastToRoom(client, message_out);
                    break;

                case 'editCard':
                    clean_data = {};
                    clean_data.value = scrub(message.data.value);
                    clean_data.id = scrub(message.data.id);

                    //send update to database
                    db.cardEdit(message.data.room, clean_data.id, clean_data.value);
                    // getRoom(client, function (room) {
                    //     db.cardEdit(room, clean_data.id, clean_data.value);
                    // });

                    message_out = {
                        action: 'editCard',
                        data: clean_data
                    };

                    client.to(message.data.room).emit('message', message_out);
                    // broadcastToRoom(client, message_out);
                    break;

                case 'deleteCard':
                    clean_message = {
                        action: 'deleteCard',
                        data: { id: scrub(message.data.id), room: message.data.room }
                    };

                    db.deleteCard(message.data.room, clean_message.data.id);
                    // getRoom(client, (room) => { db.deleteCard(room, clean_message.data.id) });

                    client.to(message.data.room).emit('message', clean_message);
                    // broadcastToRoom(client, clean_message);
                    break;

                case 'createColumn':
                    clean_message = { data: scrub(message.data) };

                    db.createColumn(message.data.room, clean_message.data.columns, null);
                    // getRoom(client, (room) => { db.createColumn(room, clean_message.data.columns, null) });

                    client.to(message.data.room).emit('message', clean_message);
                    // broadcastToRoom(client, clean_message);
                    break;

                case 'deleteColumn':
                    db.deleteColumn(message.data.room)
                    // getRoom(client, (room) => { db.deleteColumn(room) });

                    client.to(message.data.room).emit('message', { action: 'deleteColumn' });
                    // broadcastToRoom(client, { action: 'deleteColumn' });
                    break;

                case 'updateColumns':
                    var columns = message.data.columns;

                    if (!(columns instanceof Array))
                        break;

                    var clean_columns = [];

                    for (var i in columns) {
                        clean_columns[i] = scrub(columns[i]);
                    }

                    db.setColumns(message.data.room, clean_columns)
                    // getRoom(client, (room) => { db.setColumns(room, clean_columns) });

                    client.to(message.data.room).emit('message', { action: 'updateColumns', data: clean_columns });
                    // broadcastToRoom(client, { action: 'updateColumns', data: clean_columns });
                    break;

                case 'changeTheme':

                clean_message = { 
                    data: scrub(message.data.theme),
                    action: 'changeTheme'
                };

                    getRoom(client, (room) => { db.setTheme(room, clean_message.data) });

                    client.to(message.data.room).emit('message', clean_message);
                    break;

                case 'changeFont':
                    clean_message = { 
                        data: message.data.font,
                        action: 'changeFont'
                    };

                    db.setFont(message.data.room, message.data.font);
                    // getRoom(client, (room) => { db.setFont(room, message.data) });

                    client.to(message.data.room).emit('message', clean_message);
                    // broadcastToRoom(client, clean_message);
                    break;

                case 'addSticker':
                    var cardId = scrub(message.data.cardId);
                    var stickerId = scrub(message.data.stickerId);


                    db.addSticker(message.data.room, cardId, stickerId);
                    // getRoom(client, function (room) {
                    //     db.addSticker(room, cardId, stickerId);
                    // });

                    msg = {
                        data: { cardId: cardId, stickerId: stickerId },
                        action: 'addSticker'
                    }

                    client.to(message.data.room).emit('message', msg);
                    // broadcastToRoom(client, { action: 'addSticker', data: { cardId: cardId, stickerId: stickerId } });
                    break;

                case 'setBoardSize':
                    var size = {};
                    size.width = scrub(message.data.width);
                    size.height = scrub(message.data.height);

                    db.setBoardSize(client.room, size);

                    client.to(client.room).emit('message', { action: 'setBoardSize', data: size });
                    // broadcastToRoom(client, { action: 'setBoardSize', data: size });
                    break;

                default:
                    // console.log('unknown action');
                    break;
            }
        });

        client.on('disconnect', function (reason) {
            const username = client.username;
            const room = client.room;

            console.log(`### User ${username} disconnected from room ${room}: ${reason}`);

            client.leave(room);
            roomUsers[room].delete(username);
            updateRoomUsers(io, room);
});
    });
};





/**************
 FUNCTIONS
**************/

function updateRoomUsers(io, room) {
    console.log("*** updateRoomUsers ***");
    io.to(room).emit('updateRoomUsers', Array.from(roomUsers[room]));  // Emit to all users in the room
}


//santizes text
function scrub(text) {
    if (typeof text != "undefined" && text !== null) {

        //clip the string if it is too long
        if (text.length > 65535) {
            text = text.substr(0, 65535);
        }
        
        return sanitizer.sanitize(text);
    }
    else {
        return null;
    }
}


function joinRoom(client, data, db) {
    var username = data.user;
    var room = data.room;

    console.log(`*** joinRoom *** : User '${username}' joining the room '${room}'`)

    // Join the client to the room
    client.join(room);
    client.room = data.room;   // Store room on socket object
    client.username = data.user;  // Store username on socket object


    // Initialize the set of room-users register if it doesn't exist
    if (!roomUsers[room]) {
        roomUsers[room] = new Set();  
    }
     // Add user to the room
    roomUsers[room].add(username); 

    // Emit updated user list to the room
    updateRoomUsers(client.server, room);

    // Initialize room content
    initClient(client, db, room);
};

async function initClient(client, db, room) {

    console.log("initClient room", room);

    db.getFont(room, function (font) {

        if (font === null) font = { font: 'Covered By Your Grace', size: 16 };

        client.json.send(
            {
                action: 'changeFont',
                data: font
            }
        );
    });

    db.getTheme(room, function (theme) {

        if (theme === null) theme = 'bigcards';

        client.json.send(
            {
                action: 'changeTheme',
                data: theme
            }
        );
    });

    db.getBoardSize(room, function (size) {

        if (size !== null) {
            client.json.send(
                {
                    action: 'setBoardSize',
                    data: size
                }
            );
        }
    });

    db.getAllColumns(room, function (columns) {

        client.json.send(
            {
                action: 'initColumns',
                data: columns
            }
        );
    });

    try {
        const password = await db._getPasswordAsync(room);
        console.log("--- password:", password);

        if (password) {
            client.json.send({
                action: 'requirePassword',
                data: password
            });
        } else {
            initUser(client, db); // Initialize user if no password is needed
        }
    } catch (error) {
        console.error('Failed to get password:', error);
        // Handle error, maybe notify client of failure
        client.json.send({
            action: 'error',
            message: `Failed to retrieve room password: ${error}`
        });
    };
}

function initUser(client, db) {
    const room = client.room;
    
    db.getAllCards(room, function (cards) {

        client.json.send(
            {
                action: 'initCards',
                data: cards
            }
        );

    });
}


function broadcastToRoom(client, message) {
    rooms.broadcast_to_roommates(client, message);
}


//------------ROOM STUFF
// Get Room name for the given Session ID
function getRoom(client, callback) {
    var room = rooms.get_room(client);
    //console.log( 'client: ' + client.id + " is in " + room);
    callback(room);
}


function setUserName(client, name) {
    client.user_name = name;
    // client.user_name = document.cookie.username ? ;

    sids_to_user_names[client.id] = name;
    //console.log('sids to user names: ');
    console.dir(sids_to_user_names);
}

