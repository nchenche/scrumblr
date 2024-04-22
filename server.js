/**************
 SYSTEM INCLUDES
**************/
const compression = require('compression');
const express = require('express');
var cookieParser = require('cookie-parser')
const socketIo = require('socket.io');
const { db, redisClient } = require('./lib/redis');


/**************
 LOCAL INCLUDES
**************/
var conf = require('./config.js').server;
const setupSocketHandlers = require('./lib/socketHandlers.js');
const { setRouteProtection } = require('./lib/middleware.js');
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
// router.use(express.static(__dirname + '/static'));

app.use(compression());
app.use(express.json());
app.use(conf.baseurl, router);


var server = require('http').Server(app);
server.listen(conf.port);
console.log('Server running at http://127.0.0.1:' + conf.port + '/');


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

router.get('/register', routeProtection.loggedOut, function(req, res) {

	res.render('layout', {
		body: 'partials/register.ejs',
		pageScripts: ['js/forms/registration/register.js'],
		username: null
	});
});


router.get('/login', routeProtection.loggedOut, function(req, res) {
	res.render('layout', {
		body: 'partials/signin.ejs',
		pageScripts: ['js/forms/login/login.js'],
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


router.get('/', routeProtection.loggedIn, function(req, res) {
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	const sessionId = req.cookies.session_id;
	db.getUserBySession(sessionId, (result) => {
		res.render('layout', {
			body: 'partials/home.ejs',
			url: url,
			connected: clientsCount,
			username: result.success ? result.username : null,
			pageScripts: ['/js/utils.js'],
		});
	})
});


router.get('/room/:id', routeProtection.loggedIn, function(req, res){
	const sessionId = req.cookies.session_id;
	db.getUserBySession(sessionId, (response) => {
		const user = response.username;
		db.setRoomOwner(req.params.id, user, (response) => {
			if ("owner" in response) {
				console.log("response from room access:", response);
				const owner = response.owner;
				res.render('layout', {
					body: 'partials/room.ejs',
					pageTitle: ('Scrumblr - ' + req.params.id),
					pageScripts: ['/script.js'],
					username: user,
					is_owner: owner === user
				});
			} else {
				console.log('from server:', response);
			}
		})
	})

	// db.getRoomOwner(req.params.id, (response) => {
	// 	if (response.success) {
	// 		const owner = response.owner;
	// 		const sessionId = req.cookies.session_id;
	// 		db.getUserBySession(sessionId, (response) => {
	// 			const is_owner = owner === response.username ? true : false;
	// 			res.render('layout', {
	// 				body: 'partials/room.ejs',
	// 				pageTitle: ('Scrumblr - ' + req.params.id),
	// 				pageScripts: ['/script.js'],
	// 				username: response.success ? response.username : null,
	// 				is_owner: is_owner
	// 			});
	// 		});
	// 	} else {
	// 		console.log('from server:', response);
	// 	}
	// });

});


router.get('/demo', routeProtection.loggedIn, function(req, res) {
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

		res.json({
            message: result.message,
            success: result.success,
            redirectTo: '/',
			user: result.user,
			session: result.session
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
			res.json({ is_available: !exists });
		});
    } catch (err) {
        console.error('Error checking email:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});