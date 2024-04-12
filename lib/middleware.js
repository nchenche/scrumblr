
function setRouteProtection(redisClient) {
    return {
        loggedIn: (req, res, next) => {
            const sessionId = req.cookies.session_id;
            if (!sessionId) {
                // If no session ID cookie exists, redirect to the login page
                res.redirect('/login');
            } else {
                redisClient.get(sessionId, (err, result) => {
                    if (err || !result) {
                        // If there's an error or no session found in Redis, redirect to login
                        res.redirect('/login');
                    } else {
                        // If session exists, proceed
                        next();
                    }
                });
            }
        },
        loggedOut: (req, res, next) => {
            const sessionId = req.cookies.session_id;

            redisClient.get(sessionId, (err, result) => {
                if (err || !result) {
                    // Proceed if there's an error (assuming session not found) or no session
                    next();
                } else {
                    // If session exists, redirect to a specific "logged in" route, e.g., user's dashboard
                    res.redirect('/');
                }
            });
        }
    }
}


module.exports = { setRouteProtection };