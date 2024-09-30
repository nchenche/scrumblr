var argv = require('yargs')
    .usage('Usage: $0 [--port INTEGER [8080]] [--baseurl STRING ["/"]] [--redis STRING:INT [127.0.0.1:6379]] [--gaEnabled] [--gaAccount STRING [UA-2069672-4]]')
    .argv;


// Default configuration shared by all environments
const DEFAULT_CONFIG = {
    server: {
        port: argv.port || 8080,
        baseurl: argv.baseurl || '/',
        url: `http://127.0.0.1:${argv.port || 8080}`
    },
    redis: {
        prefix: '#scrumblr#',
        url: 'redis://127.0.0.1:6379', // Default Redis URL
    },
    dicebear: {
        // url: 'http://127.0.0.1:3000/8.x/identicon/svg',
        url: 'https://api.dicebear.com/9.x/identicon/svg'

    }

    // googleAnalytics: {
    //     enabled: argv.gaEnabled || false,
    //     account: argv.gaAccount || 'UA-2069672-4'
    // }
};

// Extend or override configuration based on the NODE_ENV
const envMapping = {
    'dev': 'development',
    'prod': 'production'
}


const environment = process.env.NODE_ENV || 'dev';
const environmentConfig = require(`./${envMapping[environment]}`); // Load environment-specific config

const config = Object.assign({}, DEFAULT_CONFIG, environmentConfig);

module.exports = { config }
