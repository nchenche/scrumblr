const nodemailer = require('nodemailer');

// Create a transporter
let transporter = nodemailer.createTransport({
	host: "smtp.univ-paris-diderot.fr",
	port: 25,
	secure: false,
});

// Verify connection configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('Server is ready to take messages');
    }
});


function sendEmail(toEmail, userToken) {
    const mailOptions = {
        from: '"Scrumblr" <nicolas.chevrollier@inserm.fr>',  // Sender address
        to: toEmail,  // List of receivers
        subject: 'Scrumblr Password Reset',  // Subject line
        text: 'Please click on the following link, or paste this into your browser to complete the process:',
        html: `<p>Please click on the following link, or paste this into your browser to complete the process:</p>
               <a href="http://localhost:3000/reset-password/${userToken}">Reset Password</a>`  // HTML body
    };

    transporter.sendMail(mailOptions, function(err, info) {
        if (err) {
            console.error('Error sending email:', err);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}
 module.exports = { sendEmail };
