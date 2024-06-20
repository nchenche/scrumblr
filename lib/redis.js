const redis = require("redis");
const async = require("async");
const sets = require('simplesets');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { promisify } = require('util');

/**************
 GET CONFIG VARS
**************/
const { config } = require('../config/');
console.log('Redis database configuration:', config.database);


var redisClient = null;
var isDemoRoomInit = false;
const saltRounds = 10;
var REDIS_PREFIX = config.database.prefix;

let saddAsync, sismemberAsync, getAsync, setAsync, delAsync, sremAsync, smembersAsync;


(function initializeRedisClient() {
	if (!redisClient) {
		console.log('Initializing Redis client...');
		redisClient = redis.createClient({
			url: config.database.redis,
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

		setAsyncFunctions(redisClient);
	}
})();



function setAsyncFunctions(redisClient) {
	try {
		saddAsync = promisify(redisClient.sadd).bind(redisClient);
		sismemberAsync = promisify(redisClient.sismember).bind(redisClient);
		getAsync = promisify(redisClient.get).bind(redisClient);
		setAsync = promisify(redisClient.set).bind(redisClient);
		delAsync = promisify(redisClient.del).bind(redisClient);
		sremAsync = promisify(redisClient.srem).bind(redisClient);
		smembersAsync = promisify(redisClient.smembers).bind(redisClient);
	
		console.log("Redis async functions are set up successfully.");
	} catch (error) {
		console.error("Failed to set up Redis async functions:", error);
	}
}


const db = {
	createUser: function (username, email, password, callback) {
		// hash the password
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
					callback({ success: true, message: 'User and email stored successfully', user: userRes });
				});
			});
		});

	},
	authenticateUser: function (username, password, callback) {
		redisClient.hget("users", username, (err, hashedPassword) => {
			if (err) {
				console.error('Error fetching user:', err);
				callback({ success: false, message: 'Authentication process failed', error: err });  // Pass the error in the callback
				return;
			}

			if (!hashedPassword) {
				console.log('User does not exist.');
				callback({ success: false, message: 'User does not exist.', type: "username" });  // User not found
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
					callback({ success: true, message: 'Login successful.', user: username, session: sessionId });
				} else {
					console.log('Invalid password');
					callback({ success: false, message: 'Invalid password', type: "password" });  // Password does not match
				}
			});
		});
	},
	getUserBySession: function (sessionId, callback) {
		redisClient.get(sessionId, (err, result) => {
			if (err || result === null) {
				const message = `Invalid or expired session: ${err}`;
				callback({ success: false, message: message });
				return;
			}
			const message = "Successfull user retrieval from session";
			const username = JSON.parse(result);
			const response = { success: true, message: message, username: username };
			callback(response);
		});
	},
	getEmailFromUser: function (username, callback) {
		redisClient.hgetall("emails", (err, emails) => {
			if (err) {
				const message = `Error retrieving all emails: ${err}`;
				console.error(message);
				return;
			}
			const email = Object.keys(emails).find(key => emails[key] === username);
			if (email) {
				const message = `Email for username ${username} is ${email}`;
				callback({ success: true, message: message, email: email });
				return 
			} else {
				const message = `Username ${username} not found.`;
				console.log(message);
				callback({ success: false, message: message });
			}
		});
	},
	storeToken: function (user, expiresIn, callback) {
		const key = `reset_token:${user}`;  // Key format could be anything that uniquely identifies the purpose
		const token = generateToken();

		redisClient.set(key, token, 'EX', expiresIn, (err, response) => {
			if (err) {
				const message = `Error storing token: ${err}`;
				console.error(message);
				callback({ success: false, message: `Error storing token: ${err}` });
				return;
			}
			callback({ success: true, message: `Token stored: ${response}`, token: token });
		});
	},
	resetPassword: function (username, newPassword, callback) {
		// Hash the new password
		bcrypt.hash(newPassword, saltRounds, (err, hashedPassword) => {
			if (err) {
				console.error('Error hashing password:', err);
				return callback({ success: false, message: 'Failed to hash password', error: err });
			}
	
			// Store the new hashed password
			redisClient.hset("users", username, hashedPassword, (err, userRes) => {
				if (err) {
					console.error('Error storing new password:', err);
					return callback({ success: false, message: 'Error storing new password', error: err });
				}
	
				// Clear the reset token
				redisClient.del(`reset_token:${username}`, (err, delRes) => {
					if (err) {
						console.error('Error deleting reset token:', err);
						return callback({ success: false, message: 'Error deleting reset token', error: err });
					}
					return callback({ success: true, message: 'Password reset successfully' });
				});	
			});
		});
	},
	checkToken: function(username, token, callback) {
		const key = `reset_token:${username}`;	

		redisClient.get(key, (err, result) => {
			if (err) {
				console.error('Error accessing token:', err);
				return callback({ success: false, message: 'Error accessing token.', error: err });
			}

			if (result === token) {
				return callback({ success: true, message: "Token is valid." });
			} else {
				return callback({ success: false, message: "Invalid or expired token." });
			}
		});
	},
	storeRoomDetails: function(room, user, callback) {
		const keyRoom = `room:${room}`;
		const keyOwner = `user:${user}:owner`;

		// check if room already exists
		redisClient.exists(keyRoom, (error, exists) => {
			if (error) {
				console.error(`Error checking existence for room ${room}:`, error);
				return callback({ success: false, message: 'Checking room existence failed', error: error });
			}

			// Room already exists (1 means the member exists)
			if (exists === 1) {

				// check if user is owner of the room; return is_owner set to true or false accordingly
				redisClient.sismember(keyOwner, room, (error, resOwner) => {
					if (error) {
						console.error(`Error retrieving room ${room} for user/owner ${user}:`, error);
						return callback({ success: false, message: `Error retrieving room ${room} for user/owner ${user}:`, error: error });
					}

					if (resOwner === 1) {
						console.log(`Room ${room} already stored ${keyOwner}`);

						return callback({
							success: true,
							message: 'Room already has an owner... Owner retrieved successfully',
							is_owner: true,
							room: room,
						});
					}
					else {
						console.log(`User ${user} is not the room ${room}'s owner`);
						return callback({
							success: true,
							message: 'Room already has an owner... Owner retrieved successfully',
							is_owner: false,
							room: room,
						});
					}
				})
			}
			// room does not exist, so add it to keyRoom and keyOwner
			else {
				const roomDetails = {
					owner: user,
					participants: []
				}

				// Store the room details
				redisClient.set(keyRoom, JSON.stringify(roomDetails), (error) => {
					if (error) {
						console.error(`Failed to store room details:`, error);
						return callback({ success: false, message: `Failed to store room details:`, error: error });
					}

					// add room in keyOwner
					redisClient.sadd(keyOwner, room, (error, resAddRoomToUser) => {
						if (error) {
							console.error(`Error storing ${room} in ${keyOwner}: `, error);
							return callback({ success: false, message: `Error storing ${room} in ${keyOwner}`, error: error });
						}
						console.log(`Successful storage of room "${room}" in ${keyOwner}`);
	
						return callback({
							success: true,
							message: `Room-user relationship successfully set`,
							is_owner: true
						});
					});
				});
			}
		});
	},
	setRoomUserRelationship: function (room, user, callback) {
		const keyAllRooms = "scrumblr-rooms";
		const keyOwner = `user:${user}:owner`;

		// check if room already exists
		redisClient.sismember(keyAllRooms, room, (error, resAllRooms) => {
			if (error) {
				console.error(`Error checking existence for room ${room}:`, error);
				return callback({ success: false, message: 'Checking room existence failed', error: error });
			}

			if (resAllRooms === 1) {  // Room already exists (1 means the member exists)

				// check if user is owner of the room
				redisClient.sismember(keyOwner, room, (error, resOwner) => {
					if (error) {
						console.error(`Error retrieving room ${room} for user/owner ${user}:`, error);
						return callback({ success: false, message: `Error retrieving room ${room} for user/owner ${user}:`, error: error });
					}

					if (resOwner === 1) {  // Room exists in keyOwner
						console.log(`Room ${room} already stored ${keyOwner}`);

						return callback({
							success: true,
							message: 'Room already has an owner... Owner retrieved successfully',
							is_owner: true,
							room: room,
						});
					}
					else {
						console.log(`User ${user} is not the room ${room}'s owner`);
						return callback({
							success: true,
							message: 'Room already has an owner... Owner retrieved successfully',
							is_owner: false,
							room: room,
						});
					}
				})
			} 
			else {  // If the room does not exist, add it to rooms and user/owner rooms
				redisClient.sadd(keyAllRooms, room, (error, resAddToRooms) => {
					if (error) {
						console.error(`Error storing ${room} in ${keyAllRooms}: `, error);
						return callback({ success: false, message: `Error storing ${room} in ${keyAllRooms}`, error: error });
					}
					console.log(`Successful storage of room "${room}" in ${keyAllRooms}`);

					redisClient.sadd(keyOwner, room, (error, resAddRoomToUser) => {
						if (error) {
							console.error(`Error storing ${room} in ${keyOwner}: `, error);
							return callback({ success: false, message: `Error storing ${room} in ${keyOwner}`, error: error });
						}
						console.log(`Successful storage of room "${room}" in ${keyOwner}`);
	
						return callback({
							success: true,
							message: `Room-user relationship successfully set`,
							is_owner: true
							});
						});
				});
			}
		});
	},
	getRoomOwner: function (room, callback) {
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
	addRoomToUser: function (user, room, role, callback) {  // type is either 'owner' or 'participant'
		const key = `user:${user}:${role}`;
		redisClient.sadd(key, room, (error, response) => {
			if (error) {
				console.error(`Error adding room to user with role set as ${role}:`, error);
				return callback({ success: false, message: `Error adding room to user with role set as ${role}:`, error: error });
			}

			if (response === 1) {
				console.log(`Room successfully added to user with role set as ${role}`);
				return callback({ success: true, message: `Room successfully added to user with role set as ${role}` });
			} else {
				console.log(`Room was already present for user with role set as ${role}`);
				return callback({ success: true, message: `Room was already present for user with role set as ${role}` });
			}
		})
	},
	addRoomToUserAsParticipant: function (user, room, callback) {  // type is either 'owner' or 'participant'
		const keyParticipant = `user:${user}:participant`;
		const keyOwner = `user:${user}:owner`;
		const keyRoom = `room:${room}`;

		// check if user is owner of the room ; room added to keyParticipant only if user not already owner
		redisClient.sismember(keyOwner, room, (error, resOwner) => {
			if (error) {
				console.error(`Error retrieving room ${room} for user/owner ${user}:`, error);
				return callback({ success: false, message: `Error retrieving room ${room} for user/owner ${user}:`, error: error });
			}

			if (resOwner === 1) {  // Room exists in keyOwner
				console.log(`Room ${room} already stored in ${keyOwner}. It will not be added in ${keyParticipant}.`);

				return callback({
					success: true,
					message: `Room ${room} already stored in ${keyOwner}. It will not be added in ${keyParticipant}.`,
				});
			}
			else {  
				console.log(`User ${user} is not the room ${room}'s owner`);

				// add room to keyParticipant
				redisClient.sadd(keyParticipant, room, (error, response) => {
					if (error) {
						console.error(`Error adding room to user with role set as ${role}:`, error);
						return callback({ success: false, message: `Error adding room to user with role set as ${role}:`, error: error });
					}

					let message = '';
					if (response === 1) {
						message = `Room successfully added to ${keyParticipant}`;
						console.log(message);
					} else {
						message = `Room was already present in ${keyParticipant}.`;
						console.log(message);
					}

					// return callback({ success: true, message: message });

					// add room to keyRoom
					redisClient.get(keyRoom, (error, roomDetailsRaw) => {
						if (error) {
							console.error(`Error retrieving key room ${keyRoom}:`, error);
							return callback({ success: false, message: `Error retrieving key room ${keyRoom}:`, error: error });
							
						}

						// Deserialize the JSON string to an object
						let roomDetails = JSON.parse(roomDetailsRaw);

						// Add participant participants list if not already present
						if ( !roomDetails.participants.includes(user) ) {
							roomDetails.participants.push(user);

							redisClient.set(keyRoom, JSON.stringify(roomDetails), (error, res) => {
								if (error) {
									console.error(`Error updating room details in ${keyRoom}:`, error);
									return callback({ success: false, message: `Error updating room details in ${keyRoom}`, error: error });
								}

								console.log('Participant added successfully:', res);
								return callback({ success: true, message: `Participant added successfully in ${keyRoom}` });

							});		
						}
					});		
				});
			}
		});
	},
	getRoomParticipants: async function (room) {
		const keyRoom = `room:${room}`;
		try {
			const roomDetailsRaw = await getAsync(keyRoom);
			if (!roomDetailsRaw) {
				console.log(`No room details found for ${room}`);
				return [];  // Returns an empty array if no room details are found.
			}
	
			const roomDetails = JSON.parse(roomDetailsRaw);
			return roomDetails.participants || [];  // Safeguard in case there are no participants key.
		} catch (error) {
			console.error(`Error retrieving participants for room ${room}:`, error);
			throw new Error(`Unable to retrieve participants: ${error.message}`);
		}
	},
	getUserRooms: async function (user) {
		try {
			const keyParticipant = `user:${user}:participant`;
			const keyOwner = `user:${user}:owner`;
	
			// Retrieve room lists in parallel
			const [participantMembers, ownerMembers] = await Promise.all([
				smembersAsync(keyParticipant),
				smembersAsync(keyOwner)
			]);
	
			// Prepare owner room data with password fetching
			const ownerData = await Promise.all(ownerMembers.map(async room => {
				const password = await this._getPasswordAsync(room);
				return {
					room: room,
					role: 'owner',
					password: password ? Buffer.from(password, 'base64').toString() : ''
				};
			}));



			// Prepare participant room data
			const participantData = await Promise.all(participantMembers.map(async room => {
				const password = await this._getPasswordAsync(room);
				return {
					room: room,
					role: 'participant',
					password: password ? Buffer.from(password, 'base64').toString() : ''
				};
			}));
	
			// Prepare participant room data (no passwords)
			// const participantData = participantMembers.map(room => ({
			// 	room: room,
			// 	role: 'participant',
			// 	password: ''
			// }));
	
			// Combine all room data
			const allRoomsData = ownerData.concat(participantData);
			return { success: true, message: "Successfully retrieved rooms for user.", data: allRoomsData };
	
		} catch (error) {
			console.error(`Error retrieving or processing rooms for user ${user}:`, error);
			return { success: false, message: `Error retrieving or processing rooms for user ${user}`, error };
		}
	},
	deleteUserRoom: async function(user, room, callback) {
		const keyRoom = `room:${room}`;
        const keyOwner = `user:${user}:owner`;
		const keyRoomContent = `${REDIS_PREFIX}-room:${room}-*`
		let message = '';

		try {
			// check if user is owner ; only room's owner is allowed to delete a room

			console.log('Calling sismemberAsync:', sismemberAsync);
			const isOwner = await sismemberAsync(keyOwner, room);
			console.log('Membership result:', isOwner);

			if ( !isOwner ) {
				message = `User ${user} is not allowed to delete the room ${room}.`
				console.log(message);
				return { success: false, message: message };
			}
				
			// get room participants and remove room in their related key
			const roomParticipants = await this.getRoomParticipants(keyRoom);
			console.log(`Participants in room ${room}: ${roomParticipants}`);

			let countUpdated = 0;

			for (const userParticipant of roomParticipants) {
				const keyParticipant = `user:${userParticipant}:participant`;
				// Remove the room from the participant's set
				var result = await sremAsync(keyParticipant, room);
				if (result > 0) {
					console.log(`Room ${room} removed from ${keyParticipant}.`);
					countUpdated++;
				}
			}
			console.log(`${countUpdated} participants were updated to remove room ${room}.`);
	
			// remove room in the owner related key
			result = await sremAsync(keyOwner, room);
			if (result > 0) {
				console.log(`Room ${room} removed from ${keyOwner}.`);
			} else {
				console.log(`WARNING: Room ${room} not removed from ${keyOwner}.`);
			}


			// delete keyRoom redis key
			result = await delAsync(keyRoom);
			if (result > 0) {
				console.log(`${keyRoom} redis key removed.`);
			} else {
				console.log(`WARNING: ${keyRoom} redis key not removed.`);
			}

			// delete all redis key matching keyRoomContent pattern
			result = this._deleteRedisKeys(keyRoomContent);
			if (result > 0) {
				console.log(`All redis key matching pattern ${keyRoomContent} removed.`);
			} else {
				console.log(`WARNING: redis key matching pattern ${keyRoomContent} not removed.`);
			}

			return { success: true, message: `Room ${room} successfully removed` };


		} catch (error) {
			console.error(`Error removing the room: ${error}`);
		}
	},
	_deleteRedisKeys: function(pattern) {
		let cursor = '0';
    
		function scanAndDelete(cursor) {
			redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '10', (err, reply) => {
				if (err) {
					console.error("Error scanning keys:", err);
					return 0;
				}
	
				cursor = reply[0];
				const keys = reply[1];
	
				if (keys.length > 0) {
					redisClient.del(keys, (err, response) => {
						if (err) {
							console.error("Error deleting keys:", err);
							return;
						}
						console.log(`Deleted ${response} keys.`);
					});
				}
	
				// If cursor is not '0', continue scanning
				if (cursor !== '0') {
					scanAndDelete(cursor);
				} else {
					console.log("Scan complete.");
				}
			});
		}
	
		// Start scanning
		scanAndDelete(cursor);
		return 1;
	},
	clearRoom: function (room, callback) {
		redisClient.del(REDIS_PREFIX + '-room:/demo-cards', function (err, res) {
			redisClient.del(REDIS_PREFIX + '-room:/demo-columns', function (err, res) {
				callback();
			});
		});
	},
	setPassword: function (room, data) {
		redisClient.SET(REDIS_PREFIX + "-room:" + room + "-password", data, (err, res) => {
			if (err) {
				console.error("Error setting password:", err);
			}
		});
	},
	_getPasswordAsync: async function (room) {
		try {
			const key = `${REDIS_PREFIX}-room:${room}-password`;
			const res = await getAsync(key);
			return res || '';
		} catch (err) {
			console.error("Error retrieving password for room:", room, err);
			return '';
		}
	},
	// Clear a password
	clearPassword: function (room) {
		redisClient.DEL(REDIS_PREFIX + "-room:" + room + "-password", (err, res) => {
			if (err) {
				console.error("Error clearing password:", err);
			}
		});
	},

	// font commands
	setFont: function (room, font) {
		redisClient.SET(REDIS_PREFIX + "-room:" + room + "-font", JSON.stringify(font), (err, res) => {
			if (err) {
				console.error("Error setting font:", err);
			}
		});
	},


	getFont: function (room, callback) {
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
	setTheme: function (room, theme) {
		redisClient.set(REDIS_PREFIX + '-room:' + room + '-theme', theme);
	},

	getTheme: function (room, callback) {
		redisClient.get(REDIS_PREFIX + '-room:' + room + '-theme', function (err, res) {
			callback(res);
		});
	},

	// Column commands
	createColumn: function (room, name, callback) {
		redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', name,
			function (err, res) {
				if (typeof callback != "undefined" && callback !== null) callback();
			}
		);
	},

	getAllColumns: function (room, callback) {
		redisClient.lrange(REDIS_PREFIX + '-room:' + room + '-columns', 0, -1, function (err, res) {
			callback(res);
		});
	},

	deleteColumn: function (room) {
		redisClient.rpop(REDIS_PREFIX + '-room:' + room + '-columns');
	},

	setColumns: function (room, columns) {
		//1. first delete all columns
		redisClient.del(REDIS_PREFIX + '-room:' + room + '-columns', function () {
			//2. now add columns for each thingy
			async.forEachSeries(
				columns,
				function (item, callback) {
					//console.log('rpush: ' + REDIS_PREFIX + '-room:' + room + '-columns' + ' -- ' + item);
					redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', item,
						function (err, res) {
							callback();
						}
					);
				},
				function () {
					//this happens when the series is complete
				}
			);
		});
	},

	// Card commands
	createCard: function (room, id, card) {
		var cardString = JSON.stringify(card);
		redisClient.hset(
			REDIS_PREFIX + '-room:' + room + '-cards',
			id,
			cardString
		);
	},

	getAllCards: function (room, callback) {
		redisClient.hgetall(REDIS_PREFIX + '-room:' + room + '-cards', function (err, res) {

			var cards = [];

			for (var i in res) {
				cards.push(JSON.parse(res[i]));
			}
			//console.dir(cards);

			callback(cards);
		});
	},

	cardEdit: function (room, id, text) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function (err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
				card.text = text;
				console.log(JSON.stringify(card));
				redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(card));
			}
		});
	},

	cardSetXY: function (room, id, x, y) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function (err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
				card.x = x;
				card.y = y;
				redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(card));
			}
		});
	},

	deleteCard: function (room, id) {
		redisClient.hdel(
			REDIS_PREFIX + '-room:' + room + '-cards',
			id
		);
	},

	addSticker: function (room, cardId, stickerId) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', cardId, function (err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
				if (stickerId === "nosticker") {
					card.sticker = null;

					redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', cardId, JSON.stringify(card));
				}
				else {
					if (card.sticker !== null)
						stickerSet = new sets.Set(card.sticker);
					else
						stickerSet = new sets.Set();

					stickerSet.add(stickerId);

					card.sticker = stickerSet.array();

					redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', cardId, JSON.stringify(card));
				}

			}
		});
	},

	setBoardSize: function (room, size) {
		redisClient.set(REDIS_PREFIX + '-room:' + room + '-size', JSON.stringify(size));
	},

	getBoardSize: function (room, callback) {
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
		sticker: null,
		user: "demo-user"
	};

	db.createCard(room, id, card);
}

function roundRand(max) {
	return Math.floor(Math.random() * max);
}

function cleanAndInitializeDemoRoom() {
	console.log('Initializing demo room...');
	// DUMMY DATA
	db.clearRoom('demo', function () {
		db.createColumn('demo', 'Not Started');
		db.createColumn('demo', 'Started');
		db.createColumn('demo', 'Testing');
		db.createColumn('demo', 'Review');
		db.createColumn('demo', 'Complete');


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


function generateToken() {
	return crypto.randomBytes(20).toString('hex');  // Generates a 40-character hexadecimal token
}

// exports.db = db;
module.exports = { db, redisClient };
