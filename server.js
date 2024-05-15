/**************
 SYSTEM INCLUDES
**************/
const compression = require('compression');
const express = require('express');
var cookieParser = require('cookie-parser')
const socketIo = require('socket.io');
const { db, redisClient } = require('./lib/redis');
const { sendEmail } = require("./lib/mailer.js");


/**************
 LOCAL INCLUDES
**************/
var conf = require('./config.js').server;
const setupSocketHandlers = require('./lib/socketHandlers.js');
const { setCurrentUser, setRouteProtection } = require('./lib/middleware.js');
const routeProtection = setRouteProtection(redisClient);


/**************
 SETUP EXPRESS
**************/
var app = express();
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(cookieParser())


// SETUP ROUTER
var router = express.Router();
const path = require('path');

router.use(express.static(path.join(__dirname, 'static')));

app.use(compression());
app.use(express.json());
app.use(conf.baseurl, router);


var server = require('http').Server(app);
server.listen(conf.port);
console.log('Server running at http://localhost:' + conf.port + '/');


// Middleware to add the user object to req for easy access
router.use(setCurrentUser);


/**************
 SETUP Socket.IO
**************/
const io = socketIo(server, {
	path: conf.baseurl == '/' ? '' : conf.baseurl + "/socket.io"
});
setupSocketHandlers(io, db);


/**************
 SETUP ROUTES
**************/

router.get('/register', routeProtection.loggedOut, function (req, res) {
	res.render('layout', {
		body: 'partials/register.ejs',
		pageScripts: ['/js/forms/registration/register.js'],
		username: null
	});
});


router.get('/login', routeProtection.loggedOut, function (req, res) {
	res.render('layout', {
		body: 'partials/signin.ejs',
		pageScripts: ['/js/forms/login/login.js'],
		username: null
	});
});


router.get('/logout', routeProtection.loggedIn, (req, res) => {
	const sessionId = req.cookies.session_id;

	redisClient.del(sessionId, (err, reply) => {
		if (err) {
			console.error("Logout Error:", err);
			// Optionally, redirect even in case of error to avoid dead-ends
			return res.redirect('/login?error=logout_failed');
		}
		res.clearCookie('session_id');  // Clear the session cookie
		// Redirect to the login page after successful logout
		res.redirect('/login');
	});
});


router.get('/forgot-password', routeProtection.loggedOut, function (req, res) {

	res.render('layout', {
		body: 'partials/forgotpass.ejs',
		username: null,
		pageScripts: ['/js/forms/reset/forgotPass.js'],
	});
});


router.get('/reset-password', routeProtection.loggedOut, function (req, res) {
	const { user, token } = req.query;

	db.checkToken(user, token, (response) => {
		if (!response.success) {
			return res.render('layout', {
				body: 'partials/reset_unauthorized.ejs',
				username: null,
			});
		}

		res.render('layout', {
			body: 'partials/resetpass.ejs',
			username: null,
			user: user,
			token: token,
			pageScripts: ['/js/forms/reset/resetPass.js'],
		});
	});
});


router.get('/', routeProtection.loggedIn, function (req, res) {
	res.render('layout', {
		body: 'partials/home.ejs',
		username: req.user ? req.user : null,
		pageScripts: ['/js/utils.js'],
	});
});


// router.get('/room/:id', routeProtection.loggedIn, function (req, res) {
// 	db.setRoomOwner(req.params.id, req.user, (response) => {
// 		if ("owner" in response) {
// 			const owner = response.owner;
// 			res.render('layout', {
// 				body: 'partials/room.ejs',
// 				pageTitle: ('Scrumblr - ' + req.params.id),
// 				pageScripts: ['/script.js'],
// 				username: req.user,
// 				is_owner: owner === req.user
// 			});
// 		} else {
// 			console.log('setRoomOwner response:', response);
// 		}
// 	});
// });

router.get('/room/:id', routeProtection.loggedIn, function (req, res) {
	db.setRoomUserRelationship(req.params.id, req.user, (response) => {
		if (!response.success) {
			console.error(response.message);
		}

		res.render('layout', {
			body: 'partials/room.ejs',
			pageTitle: ('Scrumblr - ' + req.params.id),
			pageScripts: ['/script.js'],
			username: req.user,
			is_owner: response.is_owner
		});
	});
});

router.get('/demo', routeProtection.loggedIn, function (req, res) {
	const sessionId = req.cookies.session_id;
	db.getUserBySession(sessionId, (result) => {
		res.render('layout', {
			body: 'partials/room.ejs',
			pageTitle: 'Scrumblr - demo',
			pageScripts: ['script.js'],
			username: result.success ? result.username : null,
			is_owner: null
		});
	})
});





/**************
 SETUP USEFUL APIS
**************/
router.post('/register', (req, res) => {
	const { username, email, password } = req.body;
	db.createUser(username, email, password, (result) => {
		res.status(result.success ? 200 : 400).json(result);
	});
});


router.post('/login', async (req, res) => {
	const { username, password } = req.body;
	db.authenticateUser(username, password, (result) => {
		if (!result.success) {
			console.log(result.message); // Log the error or user feedback message
			if (result.message === 'User does not exist.') {
				res.status(404).json(result);  // Not Found
			} else {
				res.status(401).json(result);  // Unauthorized for other errors
			}
			return;
		}

		// store cookie session
		res.cookie('session_id', result.session, { httpOnly: false, secure: false });
		res.cookie('username', result.user, { httpOnly: false, secure: false });
		console.log("result login:", result);

		res.json({
			message: result.message,
			success: result.success,
			redirectTo: '/',
			user: result.user,
			session: result.session
		});
	});
});


router.post('/forgot-password', async (req, res) => {
	const { username } = req.body;
	const expiresIn = 60*5; // in seconds

	db.getEmailFromUser(username, (response) => {
		if (!response.success) {
			return res.json(response);
		}
		const email = response.email;

		db.storeToken(username, expiresIn, async (tokenResponse) => {
			if (tokenResponse.success) {

				const mailResponse = await sendEmail(email, username, tokenResponse.token);
				if (!mailResponse.success) {
					return res.status(401).json(mailResponse);
				}

				return res.status(200).json(
					{
						message: "A reset email has been sent.",
						success: mailResponse.success,
						redirectTo: '/',
						user: username,
						token: tokenResponse.token,
						email: email
					}
				)
			}
			console.error(tokenResponse.message);
			return res.status(401).json(tokenResponse);
		});
	});
});


router.post('/reset-password', (req, res) => {
	const { username, token, password } = req.body;

	db.checkToken(username, token, (checkRes) => {
		if (!checkRes.success) {
			console.error("Error accessing token:", checkRes);
			return res.status(401).json(checkRes);
		}
		// Proceed with resetting the password
		db.resetPassword(username, password, (response) => {
			if (!response.success) {
				console.error("Error resetting password:", response);
				return res.status(401).json(response);
			}			
			return res.status(200).json(response);
		});
	});
});


router.get('/session', (req, res) => {
	const sessionId = req.cookies.session_id;

	redisClient.get(sessionId, (err, result) => {
		if (err || result === null) {
			console.log({ message: "Invalid or expired session" });
		}
		const username = JSON.parse(result);
		console.log("user:", username);
	});

	res.send(req.cookies);
});


// Endpoint to check username availability
router.get('/users/exists/username/:username', async (req, res) => {
	const username = req.params.username
	try {
		redisClient.hexists("users", username, (err, exists) => {
			if (err) {
				console.error('Error checking username existence:', err);
				return res.status(500).send({ message: 'Checking username existence failed' });
			}

			console.log(username, { exists: exists });
			res.json({ exists: exists });
		});
	} catch (err) {
		console.error('Error checking username:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});


// Endpoint to check email availability
router.get('/users/exists/email/:email', async (req, res) => {
	const email = req.params.email
	try {
		redisClient.hexists("emails", email, (err, exists) => {
			if (err) {
				console.error('Error checking email existence:', err);
				return res.status(500).send({ message: 'Checking email existence failed' });
			}

			console.log(email, { is_available: !exists });
			res.json({ exists: exists });
		});
	} catch (err) {
		console.error('Error checking email:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});


// Server-side: Get current user info
router.get('/api/current_user', (req, res) => {
	if (req.user) {  // Assuming req.user is set after successful authentication
		res.json({
			success: true,
			username: req.user,
		});
	} else {
		res.status(401).json({ success: false, message: 'Not authenticated' });
	}
});


// router.get('/api/add_room_to_user', async (req, res) => {
// 	const { user, room } = req.body;
// 	try {
// 		db.addRoomToUser(user, room, "participant", (response) => {
// 			console.log(response);
// 		})

// 	} catch (err) {
// 		console.error('Error checking email:', err);
// 		res.status(500).json({ error: 'Internal server error' });
// 	}
// });


// Catch-all route that redirects to the home page if no other route matches
router.use((req, res) => {
    res.redirect('/');
});