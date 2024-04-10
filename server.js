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
		pageScripts: ['']
	});
});


router.get('/register', function(req, res) {
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	res.render('layout', {
		body: 'partials/register.ejs',
		pageScripts: ['js/forms/registration/userHandler.js']
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


router.post('/register', async (req, res) => {
    try {
	        
        // Assuming createUser is a method in your dbUtils that saves user info to Redis
        db.createUser(req.body.username, req.body.email, req.body.password, (err, reply) => {
            if (err) {
                console.error('Registration error:', err);
                return res.status(500).send({ message: 'Registration failed' });
            }
            console.log('User registered successfully:', reply);
            res.send({ message: 'User registered successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server error' });
    }
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