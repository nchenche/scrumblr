export const accountManager = {
    register: function(userData) {
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
        })
        .catch(error => {
            console.error('Registration error:', error);
        });
    },
    login: function(userData, callback) {
        // Login functionality here
        // window.location.href = data.redirectTo; // Redirect the user
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => response.json())
        .then(result => callback(result))
        .catch(error => {
            console.error('Login error:', error);
        });
    },
    resetPassword: function(email) {
        // Password reset functionality here
    },

    // Additional account-related functions...
};