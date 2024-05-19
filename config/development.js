var argv = require('yargs')
        .usage('Usage: $0 [--port INTEGER [8080]] [--baseurl STRING ["/"]] [--redis STRING:INT [127.0.0.1:6379]] [--gaEnabled] [--gaAccount STRING [UA-2069672-4]]')
        .argv;

const DEFAULT_PORT=1000;


exports.server = {
	port: argv.port || DEFAULT_PORT,
	baseurl: argv.baseurl || '/',
	url: `http://localhost:${DEFAULT_PORT}`
};

exports.database = {
	type: 'redis',
	prefix: '#scrumblr#',
	redis: 'redis://redis-dock:6379'
};
