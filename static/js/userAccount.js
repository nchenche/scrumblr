export const accountManager = {
    register: function(data) {
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
        })
        .catch(error => {
            console.error('Registration error:', error);
        });
    },
    login: function(data, callback) {
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => callback(result))
        .catch(error => {
            console.error('Login error:', error);
        });
    },
    resetPassword: function(data, callback) {
        fetch('/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => callback(result))
        .catch(error => {
            console.error('Resetting password error:', error);
        });
    },
    sendToken: function(data, callback) {
        fetch('/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => callback(result))
        .catch(error => {
            console.error('Sending token error:', error);
        });
    },
};