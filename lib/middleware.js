const { db } = require('./redis');

function setRouteProtection() {
    return {
        loggedIn: (req, res, next) => {
            if (!req.user) {
                // If req.user is not set, redirect to the login page
                console.log("No user found, redirecting to login.");
                return res.redirect('/login');
            } else {
                // If user exists, proceed
                next();
            }
        },
        loggedOut: (req, res, next) => {
            if (req.user) {
                // If user exists, redirect to the dashboard or home page
                console.log("User found, redirecting to home.");
                return res.redirect('/');
            } else {
                // No user found, proceed
                next();
            }
        }
    }
}

function setCurrentUser(req, res, next) {
    // console.log("*** APP USE ***");
    const sessionId = req.cookies.session_id;
    if (sessionId) {
        db.getUserBySession(sessionId, (response) => {
            if (!response.success) {
                console.log(response);
                res.clearCookie('session_id')
                return res.redirect('/login');
                // return res.status(401).json({ message: 'Invalid or expired session' });  // Use return here
            } else {
                if (response.username) {
                    req.user = response.username;
                    return next();  // Ensure no more processing after this
                } else {
                    console.log('from middleware:', response);
                    return next();  // Ensure no further processing after redirect
                }
            }
        });
    } else {
        next();
    }
}


module.exports = { setCurrentUser, setRouteProtection };