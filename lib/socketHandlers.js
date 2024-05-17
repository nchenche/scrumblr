/**************
 SOCKET.I0
**************/

const sanitizer = require('sanitizer');
const rooms = require('./rooms.js');
var sids_to_user_names = [];

module.exports = function (io, db) {
    io.on('connection', function (client) {
        client.on('message', function (message) {
            //console.log(message.action + " -- " + sys.inspect(message.data) );

            var data = message.data;
            var clean_data = {};
            var clean_message = {};
            var message_out = {};

            if (!message.action) return;

            switch (message.action) {
                case 'initializeMe':
                    initClient(client, db);
                    break;

                case 'passwordValidated':
                    initUser(client, db);
                    break;

                case 'joinRoom':
                    joinRoom(client, data, db, () => {
                            client.emit('message', { action: 'roomAccept', data: '' });
                        });

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
                    broadcastToRoom(client, message_out);
                    getRoom(client, function (room) {
                        db.cardSetXY(room, data.id, data.position.left, data.position.top);
                    });
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

                    getRoom(client, function (room) {
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
                    
                        db.createCard(room, clean_data.id, card);
                    });

                    message_out = {
                        action: 'createCard',
                        data: clean_data
                    };

                    //report to all other browsers
                    broadcastToRoom(client, message_out);
                    break;

                case 'editCard':
                    clean_data = {};
                    clean_data.value = scrub(message.data.value);
                    clean_data.id = scrub(message.data.id);

                    //send update to database
                    getRoom(client, function (room) {
                        db.cardEdit(room, clean_data.id, clean_data.value);
                    });

                    message_out = {
                        action: 'editCard',
                        data: clean_data
                    };

                    broadcastToRoom(client, message_out);
                    break;

                case 'deleteCard':
                    clean_message = {
                        action: 'deleteCard',
                        data: { id: scrub(message.data.id) }
                    };

                    getRoom(client, function (room) {
                        db.deleteCard(room, clean_message.data.id);
                    });
                    broadcastToRoom(client, clean_message);
                    break;

                case 'createColumn':
                    clean_message = { data: scrub(message.data) };

                    getRoom(client, function (room) {
                        db.createColumn(room, clean_message.data, null);
                    });
                    broadcastToRoom(client, clean_message);
                    break;

                case 'deleteColumn':
                    getRoom(client, function (room) {
                        db.deleteColumn(room);
                    });
                    broadcastToRoom(client, { action: 'deleteColumn' });

                    break;

                case 'updateColumns':
                    var columns = message.data;

                    if (!(columns instanceof Array))
                        break;

                    var clean_columns = [];

                    for (var i in columns) {
                        clean_columns[i] = scrub(columns[i]);
                    }
                    getRoom(client, function (room) {
                        db.setColumns(room, clean_columns);
                    });

                    broadcastToRoom(client, { action: 'updateColumns', data: clean_columns });

                    break;

                case 'changeTheme':
                    clean_message = {};
                    clean_message.data = scrub(message.data);

                    getRoom(client, function (room) {
                        db.setTheme(room, clean_message.data);
                    });

                    clean_message.action = 'changeTheme';

                    broadcastToRoom(client, clean_message);
                    break;

                case 'changeFont':
                    clean_message = {};
                    clean_message.data = message.data;

                    getRoom(client, function (room) {
                        db.setFont(room, message.data);
                    });

                    clean_message.action = 'changeFont';

                    broadcastToRoom(client, clean_message);
                    break;


                case 'setUserName':
                    clean_message = {};

                    clean_message.data = scrub(message.data);

                    setUserName(client, clean_message.data);

                    var msg = {};
                    msg.action = 'nameChangeAnnounce';
                    msg.data = { sid: client.id, user_name: clean_message.data };
                    broadcastToRoom(client, msg);
                    break;

                case 'addSticker':
                    var cardId = scrub(message.data.cardId);
                    var stickerId = scrub(message.data.stickerId);

                    getRoom(client, function (room) {
                        db.addSticker(room, cardId, stickerId);
                    });

                    broadcastToRoom(client, { action: 'addSticker', data: { cardId: cardId, stickerId: stickerId } });
                    break;

                case 'setBoardSize':
                    var size = {};
                    size.width = scrub(message.data.width);
                    size.height = scrub(message.data.height);

                    getRoom(client, function (room) {
                        db.setBoardSize(room, size);
                    });

                    broadcastToRoom(client, { action: 'setBoardSize', data: size });
                    break;

                default:
                    // console.log('unknown action');
                    break;
            }
        });

        client.on('disconnect', function () {
            leaveRoom(client);
        });

        //tell all others that someone has connected
        //client.broadcast('someone has connected');
    });
};





/**************
 FUNCTIONS
**************/
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


function createCard(db, room, id, text, x, y, rot, colour, user) {
    var card = {
        id: id,
        colour: colour,
        rot: rot,
        x: x,
        y: y,
        text: text,
        sticker: null,
        user: user
    };

    db.createCard(room, id, card);
}


function initClient(client, db) {
    console.log("client id:", client.id);

    getRoom(client, function (room) {


        db.getFont(room, function (font) {

            if (font === null) font = { font: 'Covered By Your Grace', size: 12 };

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

        db.getPassword(room, function (passwrd) {
            console.log("password", passwrd);

            if ( passwrd ) {
                client.json.send(
                    {
                        action: 'requirePassword',
                        data: passwrd
                    }
                );
                return;
            }

            initUser(client, db);
        });
    });
}

function initUser(client, db) {
    getRoom(client, function (room) {

        db.getAllCards(room, function (cards) {

            client.json.send(
                {
                    action: 'initCards',
                    data: cards
                }
            );

        });

        roommates_clients = rooms.room_clients(room);
        roommates = [];

        var j = 0;
        for (var i in roommates_clients) {
            if (roommates_clients[i].id != client.id) {
                roommates[j] = {
                    sid: roommates_clients[i].id,
                    user_name: sids_to_user_names[roommates_clients[i].id]
                };
                j++;
            }
        }

        client.json.send(
            {
                action: 'initialUsers',
                data: roommates
            }
        );
    });
}


function joinRoom(client, data, db, callback) {
    var msg = {
        action: 'join-announce',
        data: {
            sid: client.id,
            user_name: data.user,
            room: data.room
        }
    };

    rooms.add_to_room_and_announce(client, data.room, msg);
    callback();


    // db.getRoomOwner(data.room, (response) => {
    //     if (!response.success) {
    //         console.error(response);
    //     }

    //     if (response.owner) {
    //         const role = response.owner === data.user ? "owner" : "participant";
    //         db.addRoomToUser(data.user, data.room, role, (res) => {
    //             if (!res.success) {
    //                 console.error(res);
    //             }
    //             console.log(res);
    //         });
    //     }

    //     rooms.add_to_room_and_announce(client, data.room, msg);
    //     callback();
    // });
}

function leaveRoom(client) {
    //console.log (client.id + ' just left');
    var msg = {
        action: 'leave-announce',
        data: { sid: client.id }
    };

    rooms.remove_from_all_rooms_and_announce(client, msg);
    delete sids_to_user_names[client.id];
}

function broadcastToRoom(client, message) {
    rooms.broadcast_to_roommates(client, message);}


//------------ROOM STUFF
// Get Room name for the given Session ID
function getRoom(client, callback) {
    room = rooms.get_room(client);
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

