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


        client.on('message', async function (message) {

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
                    db.clearPassword(client.room);
                    db.delRoomPrivacy(client.room);
                    break;

                case 'setPassword':
                    if (!data) {
                        break;
                    }
                    await db.setPassword(client.room, data);
                    await db.setRoomPrivacy(client.room, data);
                    await db.setAllowedUsers(client.room, client.username);
                    break;

                case 'moveCard':
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

                    client.to(message.data.room).emit('message', message_out);
                    db.cardSetXY(message.data.room, data.id, data.position.left, data.position.top);

                    break;

                case 'createCard':
                    // Using destructuring to directly extract and scrub the properties
                    const { text, id, x, y, rot, colour, user } = data;                    
                    
                    // Scrubbing each data field using a utility function (assumes scrub function exists)
                    const cleanData = {
                        text: scrub(text),
                        id: scrub(id),
                        x: scrub(x),
                        y: scrub(y),
                        rot: scrub(rot),
                        colour: scrub(colour),
                        user: scrub(user)
                    };
                
                    // Creating the card object
                    const card = {
                        ...cleanData,  // Spread the cleanData to include all its properties
                        sticker: null
                    };

                    // Prepare the message to be sent out
                    message_out = {
                        action: 'createCard',
                        data: cleanData
                    };
                
                    // Persist the card data
                    db.createCard(message.data.room, cleanData.id, card);
                
                    // Emit the message to all clients in the room, except the sender
                    client.to(message.data.room).emit('message', message_out);
                    break;

                case 'editCard':
                    clean_data = {};
                    clean_data.value = scrub(message.data.value);
                    clean_data.id = scrub(message.data.id);

                    // Persist the edited card data
                    db.cardEdit(message.data.room, clean_data.id, clean_data.value);

                    message_out = {
                        action: 'editCard',
                        data: clean_data
                    };

                    // Emit the message to all clients in the room, except the sender
                    client.to(message.data.room).emit('message', message_out);
                    break;

                case 'deleteCard':
                    clean_message = {
                        action: 'deleteCard',
                        data: { id: scrub(message.data.id), room: message.data.room }
                    };

                    db.deleteCard(message.data.room, clean_message.data.id);
                    client.to(message.data.room).emit('message', clean_message);
                    break;

                case 'createColumn':
                    clean_message = { data: scrub(message.data) };

                    db.createColumn(message.data.room, clean_message.data.columns, null);
                    client.to(message.data.room).emit('message', clean_message);
                    break;

                case 'deleteColumn':
                    db.deleteColumn(message.data.room)
                    client.to(message.data.room).emit('message', { action: 'deleteColumn' });
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
                    client.to(message.data.room).emit('message', { action: 'updateColumns', data: clean_columns });
                    break;

                case 'changeTheme':
                    clean_message = { 
                        data: scrub(message.data.theme),
                        action: 'changeTheme'
                    };

                        db.setTheme(client.room, clean_message.data);
                        client.to(message.data.room).emit('message', clean_message);
                        break;

                case 'changeFont':
                    clean_message = { 
                        data: message.data.font,
                        action: 'changeFont'
                    };

                    db.setFont(message.data.room, message.data.font);
                    client.to(message.data.room).emit('message', clean_message);
                    break;

                case 'addSticker':
                    var cardId = scrub(message.data.cardId);
                    var stickerId = scrub(message.data.stickerId);

                    msg = {
                        data: { cardId: cardId, stickerId: stickerId },
                        action: 'addSticker'
                    };

                    db.updateSticker(message.data.room, cardId, stickerId, "add");
                    client.to(message.data.room).emit('message', msg);
                    break;

                case 'removeSticker':
                    var cardId = scrub(message.data.cardId);
                    var stickerId = scrub(message.data.stickerId);

                    msg = {
                        // data: { stickerElement: scrub(message.data.stickerElement) },
                        data: { stickerId: stickerId},
                        action: 'removeSticker'
                    };

                    db.updateSticker(message.data.room, cardId, stickerId, "remove");
                    client.to(message.data.room).emit('message', msg);
                    break;

                case 'setBoardSize':
                    var size = {};
                    size.width = scrub(message.data.width);
                    size.height = scrub(message.data.height);

                    db.setBoardSize(client.room, size);

                    client.to(client.room).emit('message', { action: 'setBoardSize', data: size });
                    break;

                case 'changeCardColor':
                    data_clean = {
                        id: scrub(message.data.id),
                        color: scrub(message.data.color)
                    };

                    db.changeCardColor(client.room, data_clean.id, data_clean.color);
                    client.to(client.room).emit('message', { action: 'changeCardColor', data: data_clean });
                    break;

                default:
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
