
// function setRouteProtection(redisClient) {
//     return {
//         loggedIn: (req, res, next) => {
//             console.log("*** loggedIn ***");

//             const sessionId = req.cookies.session_id;
//             if (!sessionId) {
//                 // If no session ID cookie exists, redirect to the login page
//                 return res.redirect('/login');
//             } else {
//                 redisClient.get(sessionId, (err, result) => {
//                     if (err || !result) {
//                         // If there's an error or no session found in Redis, redirect to login
//                         console.error("RoutePortection LoggedIn error:", err);
//                         return res.redirect('/login');
//                     } else {
//                         // If session exists, proceed
//                         next();
//                     }
//                 });
//             }
//         },
//         loggedOut: (req, res, next) => {
//             console.log("*** loggedOut ***");

//             const sessionId = req.cookies.session_id;

//             redisClient.get(sessionId, (err, result) => {
//                 if (err || !result) {
//                     // Proceed if there's an error (assuming session not found) or no session
//                     next();
//                 } else {
//                     // If session exists, redirect to a specific "logged in" route, e.g., user's dashboard
//                     return res.redirect('/');
//                 }
//             });
//         }
//     }
// }
const { db } = require('./redis');

function setRouteProtection() {
    return {
        loggedIn: (req, res, next) => {
            console.log("*** loggedIn ***");
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
            console.log("*** loggedOut ***");
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
    console.log("*** APP USE ***");
    const sessionId = req.cookies.session_id;
    if (sessionId) {
        db.getUserBySession(sessionId, (response) => {
            if (!response.success) {
                console.log('Invalid or expired session');
                return res.status(401).json({ message: 'Invalid or expired session' });  // Use return here
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