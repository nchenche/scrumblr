import {setUpForm} from "./registerFormHandler.js"

setUpForm()




const accountManager = {
    register: function(userData) {
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
        })
        .catch(error => {
            console.error('Registration error:', error);
        });
    },

    login: function(userData) {
        // Login functionality here
    },

    resetPassword: function(email) {
        // Password reset functionality here
    },

    // Additional account-related functions...
};

document.getElementById("btn-submit").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    var userData = {
        username: username,
        email: email,
        password: password,
    };

    // If validation passes, proceed to register
    accountManager.register(userData);
});
