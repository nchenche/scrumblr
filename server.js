/**************
 SYSTEM INCLUDES
**************/
const compression = require('compression');
const express = require('express');
const socketIo = require('socket.io');
const { db, redisClient } = require('./lib/redis');
const bcrypt = require('bcrypt')



/**************
 LOCAL INCLUDES
**************/
var conf = require('./config.js').server;
const setupSocketHandlers = require('./lib/socketHandlers.js');


/**************
 SETUP EXPRESS
**************/
var app = express();
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

var router = express.Router();

app.use(compression());
app.use(express.json());
app.use(conf.baseurl, router);



router.use(express.static(__dirname + '/static'));

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



/* ROUTES */
router.get('/', function(req, res) {
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	res.render('layout', {
		body: 'partials/home.ejs',
		url: url,
		connected: clientsCount
	});
});


router.get('/login', function(req, res) {
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	res.render('layout', {
		body: 'partials/signin.ejs',
		pageScripts: ['js/forms/login/login.js']
	});
});


router.get('/register', function(req, res) {
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	res.render('layout', {
		body: 'partials/register.ejs',
		pageScripts: ['js/forms/registration/register.js']
	});
});


router.get('/demo', function(req, res) {
	
	res.render('layout', {
		body: 'partials/room.ejs',
		pageTitle: 'Scrumblr - demo',
		demo: true
	});
});


router.get('/:id', function(req, res){
	res.render('layout', {
		body: 'partials/room.ejs',
		pageTitle: ('Scrumblr - ' + req.params.id)
	});
});


router.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    db.createUser(username, email, password, (result) => {
        res.status(result.success ? 200 : 400).json(result);
    });
});


router.post('/login', async (req, res) => {
	// res.json({ message: "Processing successful", redirectTo: '/another-page' });
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
        // Respond with JSON for successful login, including redirect information
        res.json({
            message: result.message,
            success: result.success,
            redirectTo: '/'
        });
    });
});


// API
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