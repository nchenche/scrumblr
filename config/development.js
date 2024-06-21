module.exports = {
    server: {
        port: 1000, // Specific development port
		baseurl: '/',
        url: `http://localhost:1000`
    },
	redis: {
        prefix: '#scrumblr#',
        url: 'redis://redis-dock:6379', // Default Redis URL
    },
};
