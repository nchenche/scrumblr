/**************
 SYSTEM INCLUDES
**************/
const compression = require('compression');
const express = require('express');
const socketIo = require('socket.io');


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
setupSocketHandlers(io);



/**************
 ROUTES
**************/
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
		body: 'partials/signin.ejs'
	});
});

router.get('/register', function(req, res) {
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	res.render('layout', {
		body: 'partials/register.ejs'
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


