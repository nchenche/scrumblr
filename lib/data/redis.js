const conf = require('../../config.js').database;

const redis = require("redis");
const async = require("async");
const sets = require('simplesets');
const bcrypt = require('bcrypt');

var redisClient = null; //redis.createClient();
const saltRounds = 10;
var REDIS_PREFIX = '#scrumblr#';

// If you want Memory Store instead...
// var MemoryStore = require('connect/middleware/session/memory');
// var session_store = new MemoryStore();


var db = function(callback) {
	console.log('Opening redis connection to ' + conf.redis);
	redisClient = redis.createClient(
		{
			url: conf.redis, 
			legacyMode: true
		}
	);

	redisClient.on("connect", function (err) {
		callback();
	});

	redisClient.on("error", function (err) {
		console.log("Redis error: " + err);
	});

};

db.prototype = {
	createUser: function(username, password) {
		// check if the username already exists
		client.hexists("users", username, async (err, exists) => {
			if (err) {
				console.error('Error checking user existence:', err);
				return;
			}
	
			if (exists) {
				console.log('User already exists.');
				return;
			}
	
			// If the user does not exist, hash the password
			const hashedPassword = await bcrypt.hash(password, saltRounds);
	
			// store the new username and hashed password
			client.hset("users", username, hashedPassword, (err, res) => {
				if (err) {
					console.error('Error storing user:', err);
				} else {
					console.log('User stored successfully.', res);
					return true;
				}
			});
		});
	},
	authenticateUser: function(username, password) {
		client.hget("users", username, async (err, hashedPassword) => {
			if (err) {
				console.error('Error fetching user:', err);
				return;
			}
			
			if (hashedPassword === null) {
				console.log('User does not exist.');
				return false;
			}
	
			const match = await bcrypt.compare(password, hashedPassword);
			if (match) {
				console.log('Login successful.');
				return true;
			} else {
				console.log('Password is incorrect.');
				return false;
			}
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
exports.db = db;
