var conf = require('../config.js').database;

// exports.db = require('./data/'+conf.type+'.js').db;
exports.db = require('./data/redis.js').db;

