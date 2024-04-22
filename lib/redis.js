const redis = require("redis");
const async = require("async");
const sets = require('simplesets');
const bcrypt = require('bcrypt');

const conf = require('../config.js').database;


var redisClient = null;
var isDemoRoomInit = false;
const saltRounds = 10;
var REDIS_PREFIX = '#scrumblr#';



(function initializeRedisClient() {
    if (!redisClient) {
        console.log('Initializing Redis client...');
        redisClient = redis.createClient({
            url: conf.redis,
            legacyMode: true
        });

        redisClient.on("connect", () => {
            console.log("Redis client connected");
			if (!isDemoRoomInit) {
				cleanAndInitializeDemoRoom();
				isDemoRoomInit = true;
			}
        });

        redisClient.on("error", (err) => {
            console.error("Redis client error", err);
        });
    }
})();


const db = {
	createUser: function(username, email, password, callback) {
		// Check if the username already exists
		redisClient.hexists("users", username, (err, userExists) => {
			if (err) {
				console.error('Error checking username existence:', err);
				callback({ success: false, message: 'Error checking username existence', error: err });
				return;
			}
	
			if (userExists) {
				console.log('Username already exists.');
				callback({ success: false, message: 'Username already exists' });
				return;
			}
	
			// Check if the email already exists
			redisClient.hexists("emails", email, (err, emailExists) => {
				if (err) {
					console.error('Error checking email existence:', err);
					callback({ success: false, message: 'Error checking email existence', error: err });
					return;
				}
	
				if (emailExists) {
					console.log('Email already exists.');
					callback({ success: false, message: 'Email already exists' });
					return;
				}
	
				// If the user does not exist and email is unique, hash the password
				bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
					if (err) {
						console.error('Error hashing password:', err);
						callback({ success: false, message: 'Error hashing password', error: err });
						return;
					}
	
					// Store the new username and hashed password
					redisClient.hset("users", username, hashedPassword, (err, userRes) => {
						if (err) {
							console.error('Error storing user:', err);
							callback({ success: false, message: 'Error storing user', error: err });
							return;
						}
	
						// Store the email associated with the user
						redisClient.hset("emails", email, username, (err, emailRes) => {
							if (err) {
								console.error('Error storing email:', err);
								callback({ success: false, message: 'Error storing email', error: err });
								return;
							}
	
							console.log('User and email stored successfully.');
							callback({ success: true, message: 'User and email successfully', user: userRes });
						});
					});
				});
			});
		});
	},
	authenticateUser: function(username, password, callback) {
		redisClient.hget("users", username, (err, hashedPassword) => {
			if (err) {
				console.error('Error fetching user:', err);
				callback({ success: false, message: 'Authentication process failed', error: err });  // Pass the error in the callback
				return;
			}
			
			if (!hashedPassword) {
				console.log('User does not exist.');
				callback({ success: false, message: 'User does not exist.', type: "username"});  // User not found
				return;
			}
	
			bcrypt.compare(password, hashedPassword, (err, match) => {
				if (err) {
					console.error('Error comparing password:', err);
					callback({ success: false, message: 'Authentication process failed', error: err });  // Pass the error in the callback
					return;
				}
	
				if (match) {
					const sessionId = `session:${username}:${new Date().getTime()}`;
					redisClient.setex(sessionId, 3600, JSON.stringify(username), (err, reply) => {
						if (err) {
							console.error('Error storing session:', err);
							callback({ success: false, message: 'Session storage failed', error: err });
						}
						console.log('Session storage successfull:', sessionId);
					});
					console.log('Login successful for:', username);
					callback({ success: true, message: 'Login successful.', user: username , session: sessionId});
				} else {
					console.log('Invalid password');
					callback({ success: false, message: 'Invalid password', type: "password" });  // Password does not match
				}
			});
		});
	},
	getUserBySession: function(sessionId, callback) {
		redisClient.get(sessionId, (err, result) => {
			if (err || result === null) {
				const message = "Invalid or expired session";
				console.error(message);
				callback({ success: false, message: message });
			}
			const message = "Successfull user retrieval from session";
			const username = JSON.parse(result);
			const response = { success: true, message: message, username: username };
			console.log(response.message);
			callback(response);			
		});
	},
	setRoomOwner: function(room, owner, callback) {
		// Check if the room already has an owner
		redisClient.exists(REDIS_PREFIX + '-room:' + room + '-owner', (error, response) => {
			if (error) {
				console.error(`Error checking existence for room ${room}:`, error);
				callback({ success: false, message: 'Checking room existence failed', error: error });
				return;
			}
	
			if (response === 1) {  // Room already exists (1 means the key exists)
				// console.log(`Room ${room} already has an owner.`);
				redisClient.get(REDIS_PREFIX + '-room:' + room + '-owner', (error, response) => {
					if (error) {
						console.error(`Error retrieving owner for room ${room}:`, error);
						callback({ success: false, message: 'Retrieving room owner failed', error: error });
						return;
					}

					console.log(`Retrieved owner for room ${room}: ${response}`);
					callback({
						success: true,
						message: 'Room already has an owner... Owner retrieved successfully',
						owner: response,
						room: room
					});
				})
				
				// callback({ success: false, message: 'Room already has an owner', owner: owner, room: room });
				return;
			}
	
			// If the room does not exist, set the new owner
			redisClient.set(REDIS_PREFIX + '-room:' + room + '-owner', owner, (error, response) => {
				if (error) {
					console.error(`Error storing owner for room ${room}:`, error);
					callback({ success: false, message: 'Storing room owner failed', error: error });
					return;
				}
				console.log(`Successful storage of ${room} room's owner`);
				callback({ success: true, message: `Owner set successfully for room ${room}`, owner: owner, response: response});
			});
		});
	},
	getRoomOwner: function(room, callback) {
		// Check if the room already has an owner
		redisClient.exists(REDIS_PREFIX + '-room:' + room + '-owner', (error, response) => {
			if (error) {
				console.error(`Error checking existence for room ${room}:`, error);
				callback({ success: false, message: 'Checking room existence failed', error: error });
				return;
			}
	
			if (response !== 1) {  // Room 
				console.log(`Room ${room} does not exist yet.`);
				callback({ success: false, message: 'Room does not exist yet' });
				return;
			}

			redisClient.get(REDIS_PREFIX + '-room:' + room + '-owner', (error, response) => {
				if (error) {
					console.error(`Error retrieving owner for room ${room}:`, error);
					callback({ success: false, message: 'Retrieving room owner failed', error: error });
					return;
				}
				if (response === null) {
					console.log(`Owner for room ${room} not found.`);
					callback({ success: false, message: 'Owner not found' });
				} else {
					console.log(`Retrieved owner for room ${room}: ${response}`);
					callback({ success: true, message: 'Owner retrieved successfully', owner: response });
				}
			});
		});
	},
	clearRoom: function(room, callback) {
		redisClient.del(REDIS_PREFIX + '-room:/demo-cards', function (err, res) {
			redisClient.del(REDIS_PREFIX + '-room:/demo-columns', function (err, res) {
				callback();
			});
		});
	},

	// Set a password with an expiration (e.g., 3600 seconds = 1 hour)
	setPassword: function(room, data) {
		redisClient.SET(REDIS_PREFIX + "-room:" + room + "-password", data, (err, res) => {
			if (err) {
				console.error("Error setting password:", err);
			}
		});
	},

	// Retrieve a password
	getPassword: function(room, callback) {
		redisClient.GET(REDIS_PREFIX + "-room:" + room + "-password", (err, res) => {
			if (err) {
				console.error("Error retrieving password:", err);
				// callback(err); // Handle the error according to your application logic
				return;
			}
			callback(res);
		});
	},

	// Clear a password
	clearPassword: function(room) {
		redisClient.DEL(REDIS_PREFIX + "-room:" + room + "-password", (err, res) => {
			if (err) {
				console.error("Error clearing password:", err);
			}
		});
	},

	// font commands
	setFont: function(room, font) {
		redisClient.SET(REDIS_PREFIX + "-room:" + room + "-font", JSON.stringify(font), (err, res) => {
			if (err) {
				console.error("Error setting font:", err);
			}
		});
	},

	
	getFont: function(room, callback) {
    redisClient.GET(
      REDIS_PREFIX + "-room:" + room + "-font",
      function (err, data) {
        if (err) {
          console.error("Error setting font:", err);
        }

        callback(JSON.parse(data));
      });
  	},


	// theme commands
	setTheme: function(room, theme) {
		redisClient.set(REDIS_PREFIX + '-room:' + room + '-theme', theme);
	},

	getTheme: function(room, callback) {
		redisClient.get(REDIS_PREFIX + '-room:' + room + '-theme', function (err, res) {
			callback(res);
		});
	},

	// Column commands
	createColumn: function(room, name, callback) {
		redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', name,
			function (err, res) {
	if (typeof callback != "undefined" && callback !== null) callback();
			}
		);
	},

	getAllColumns: function(room, callback) {
		redisClient.lrange(REDIS_PREFIX + '-room:' + room + '-columns', 0, -1, function(err, res) {
			callback(res);
		});
	},

	deleteColumn: function(room) {
		redisClient.rpop(REDIS_PREFIX + '-room:' + room + '-columns');
	},

	setColumns: function(room, columns) {
		//1. first delete all columns
		redisClient.del(REDIS_PREFIX + '-room:' + room + '-columns', function () {
			//2. now add columns for each thingy
			async.forEachSeries(
				columns,
				function( item, callback ) {
					//console.log('rpush: ' + REDIS_PREFIX + '-room:' + room + '-columns' + ' -- ' + item);
					redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', item,
						function (err, res) {
							callback();
						}
					);
				},
				function() {
					//this happens when the series is complete
				}
			);
		});
	},

	// Card commands
	createCard: function(room, id, card) {
		var cardString = JSON.stringify(card);
		redisClient.hset(
			REDIS_PREFIX + '-room:' + room + '-cards',
			id,
			cardString
		);
	},

	getAllCards: function(room, callback) {
		redisClient.hgetall(REDIS_PREFIX + '-room:' + room + '-cards', function (err, res) {

			var cards = [];

			for (var i in res) {
				cards.push( JSON.parse(res[i]) );
			}
			//console.dir(cards);

			callback(cards);
		});
	},

	cardEdit: function(room, id, text) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function(err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
				card.text = text;
				console.log(JSON.stringify(card));
				redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(card));
			}
		});
	},

	cardSetXY: function(room, id, x, y) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function(err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
				card.x = x;
				card.y = y;
				redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(card));
			}
		});
	},

	deleteCard: function(room, id) {
		redisClient.hdel(
			REDIS_PREFIX + '-room:' + room + '-cards',
			id
		);
	},

	addSticker: function(room, cardId, stickerId) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', cardId, function(err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
                if (stickerId === "nosticker")
                {
                    card.sticker = null;

                    redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', cardId, JSON.stringify(card));
                }
                else
                {
                    if (card.sticker !== null)
                        stickerSet = new sets.Set( card.sticker );
                    else
                        stickerSet = new sets.Set();

                    stickerSet.add(stickerId);

                    card.sticker = stickerSet.array();

                    redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', cardId, JSON.stringify(card));
                }

			}
		});
	},

	setBoardSize: function(room, size) {
		redisClient.set(REDIS_PREFIX + '-room:' + room + '-size', JSON.stringify(size));
	},

	getBoardSize: function(room, callback) {
		redisClient.get(REDIS_PREFIX + '-room:' + room + '-size', function (err, res) {
			callback(JSON.parse(res));
		});
	}

};



function createCard(room, id, text, x, y, rot, colour) {
    var card = {
        id: id,
        colour: colour,
        rot: rot,
        x: x,
        y: y,
        text: text,
        sticker: null
    };

    db.createCard(room, id, card);
}

function roundRand(max) {
    return Math.floor(Math.random() * max);
}

function cleanAndInitializeDemoRoom()
{
	console.log('Initializing demo room...');
	// DUMMY DATA
	db.clearRoom('demo', function() {
		db.createColumn( 'demo', 'Not Started' );
		db.createColumn( 'demo', 'Started' );
		db.createColumn( 'demo', 'Testing' );
		db.createColumn( 'demo', 'Review' );
		db.createColumn( 'demo', 'Complete' );


		createCard('demo', 'card1', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('demo', 'card2', 'Hello this is a new story.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'white');
		createCard('demo', 'card3', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		createCard('demo', 'card4', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');

		createCard('demo', 'card5', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('demo', 'card6', 'Hello this is a new card.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('demo', 'card7', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		createCard('demo', 'card8', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');
	});
}


// exports.db = db;
module.exports = { db, redisClient };
