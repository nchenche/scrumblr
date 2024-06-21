module.exports = {
    server: {
        port: 8080, // Standard production port
		baseurl: '/',
        url: `http://localhost:8080`
    },
    redis: {
        prefix: '#scrumblr#',
        url: 'redis://127.0.0.1:6379' // Production-specific Redis URL
    }
};