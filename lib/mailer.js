const nodemailer = require('nodemailer');
require('dotenv').config();

console.log("\n-------------------");
console.log("Node environment: ", process.env.NODE_ENV);
console.log("\n");

const { config } = require('../config/');


const mailConfig = {
    host: process.env.NODE_ENV === 'production' ? process.env.MAILER_HOST_PROD : process.env.MAILER_HOST_DEV,
    port: process.env.NODE_ENV === 'production' ? process.env.MAILER_PORT_PROD : process.env.MAILER_PORT_DEV,
    secure: false,
};

if (process.env.MAILER_USER_DEV && process.env.MAILER_PASS_DEV) {
    mailConfig['auth'] = {
        user: process.env.MAILER_USER_DEV,
        pass: process.env.MAILER_PASS_DEV
    }
}

console.log(mailConfig)


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
    const senderMail = process.env.NODE_ENV === 'production' ? process.env.MAILER_SENDER_PROD : process.env.MAILER_SENDER_DEV

    const mailOptions = {
        from: `"Scrumblr" <${senderMail}>`,
        to: toEmail,
        subject: 'Scrumblr Password Reset',
        html: `
            <p>Dear Scrumblr user,</p>
            <p>Please click on the following link to complete the process:
            <a href="${config.server.url}/reset-password?user=${user}&token=${token}">Reset Password</a></p>
            <p>Please note that this link will be available for only <strong>5 minutes</strong>. If you do not reset your password during this time,
            go to the <a href="${config.server.url}/forgot-password">Forgot Password</a> link.</p>
            <p>Best regard,</p>
            <p>The RPBS Scrumblr Team.</p>

        `
    };

    try {
        console.log("Sending mail...")
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info);
        return { success: true, message: `Email sent: ${info.response}` };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: `Error sending email: ${error.message}` };
    }
}



 module.exports = { sendEmail };
