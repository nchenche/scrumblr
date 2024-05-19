const nodemailer = require('nodemailer');
require('dotenv').config();

console.log("\n-------------------");
console.log("Node environment: ", process.env.NODE_ENV);
console.log("\n");

const { config } = require('../config/');


let mailConfig;

if (process.env.NODE_ENV === 'production') {
    // All emails are delivered to the destination
    mailConfig = {
        host: "get-away.rpbs.univ-paris-diderot.fr",
        // host: "smtp.univ-paris-diderot.fr",
        // host: "172.27.6.44",
        port: 25,
        // auth: {
        //     user: process.env.REAL_USER,
        //     pass: process.env.REAL_PASS
        // }
    };
} else {
    // All emails are caught by ethereal.email
    mailConfig = {
        host: "smtp.laposte.net",
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    };
}


// Create a transporter
let transporter = nodemailer.createTransport(mailConfig);


// Verify connection configuration
transporter.verify(function(error, success) {
    console.log("Verifying mail transporter...");

    if (error) {
        console.log("Error verifying email transporter", error);
        return { success: false, message: `Error verifying email transporter`, error: error };
    } else {
        console.log('Server is ready to take messages:', success);
        return { success: true, message: `Functional email transporter:`, status: success };
    }
});


async function sendEmail(toEmail, user, token) {

    const mailOptions = {
        from: `"Scrumblr" <${process.env.MAIL_ADDR}>`,
        to: toEmail,
        subject: 'Scrumblr Password Reset',
        html: `
            <p>Dear Scrumblr user,</p>
            <p>Please click on the following link, or paste this into your browser to complete the process:
            <a href="${config.server.url}/reset-password?user=${user}&token=${token}">Reset Password</a></p>
            <p>Please note that this link will be available for only <string>5 minutes</strong>. If you do not reset your password during this time,
            go to Forgot Password link.</p>
            <p>Best regard,</p>
            <p>The RPBS Scrumblr Team.</p>

        `
    };

    try {
        console.log("Sending mail...")
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return { success: true, message: `Email sent: ${info.response}` };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: `Error sending email: ${error.message}` };
    }
}



 module.exports = { sendEmail };
