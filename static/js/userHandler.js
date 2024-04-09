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
            console.log('Registration successful:', data);
            // Handle successful registration, e.g., redirect or display a message
        })
        .catch(error => {
            console.error('Registration error:', error);
            // Handle registration errors, e.g., display an error message
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


// Example usage
document.getElementById("btn-register").addEventListener("click", function(event) {
    event.preventDefault();

    
    var userData = {
        username: document.getElementById("username").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
    };

    console.log(userData);

    
    accountManager.register(userData);
});
