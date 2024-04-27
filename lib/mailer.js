const nodemailer = require('nodemailer');
require('dotenv').config();


// Create a transporter
let transporter = nodemailer.createTransport({
	// host: "smtp.univ-paris-diderot.fr",
	host: "smtp.laposte.net",
	// port: 25,
    port: 587,
	secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Verify connection configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('Server is ready to take messages');
    }
});


// async function sendEmail(toEmail, user, token, callback) {
//     console.log("*** sendEmail call received...")
//     const mailOptions = {
//         from: '"Scrumblr" <nicolas.chevrollier@laposte.net>',  // Sender address
//         to: toEmail,  // List of receivers
//         subject: 'Scrumblr Password Reset',  // Subject line
//         html: `
//         <p>Dear Scrumblr user,</p>
//         </br>
//         <p>Please click on the following link, or paste this into your browser to complete the process: 
//         <a href="http://localhost:3000/reset-password/user=${user}&token=${token}">Reset Password</a>
//         </p>
//         </br>
//         <p>Please note that this link will be available 5 minutes only. If you do not reset your password during this time,
//         go to Forgot Password link.</p>
//         </br>
//         <p>Bests.</p>        
//         `
//     };

//     transporter.sendMail(mailOptions, function(err, info) {
//         if (err) {
//             console.error('Error sending email:', err);
//             callback({success: false, message: `Error sending email: ${err}`})
//         } else {
//             console.log('Email sent:', info.response);
//             callback({success: true, message: `Email sent: ${info.response}`})
//         }
//     });
// }

async function sendEmail(toEmail, user, token) {
    const mailOptions = {
        from: '"Scrumblr" <nicolas.chevrollier@laposte.net>',
        to: toEmail,
        subject: 'Scrumblr Password Reset',
        html: `
            <p>Dear Scrumblr user,</p>
            <p>Please click on the following link, or paste this into your browser to complete the process:
            <a href="http://localhost:3000/reset-password?user=${user}&token=${token}">Reset Password</a></p>
            <p>Please note that this link will be available for only 5 minutes. If you do not reset your password during this time,
            go to Forgot Password link.</p>
            <p>Bests.</p>
        `
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return { success: true, message: `Email sent: ${info.response}` };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: `Error sending email: ${error.message}` };
    }
}


 module.exports = { sendEmail };
