export function setUpForm() {
    const inputs = document.querySelectorAll('#username, #email, #password');
    const registerButton = document.getElementById('btn-submit');

    // State to track the validity of each field
    const fieldValidity = {
        username: false,
        email: false,
        password: false
    };


    // Initialize fields on load
    inputs.forEach(input => {
        input.value = '';
        input.addEventListener('input', handleFieldInput); // Single event handler for input event
    });

    // Checks and updates the state of registration fields
    function handleFieldInput(event) {
        const { id, value } = event.target;
        fieldValidity[id] = value.trim() !== '';

        // Additional checks for username and email
        if (id === 'username' || id === 'email') {
            if (value.trim() !== '') {
                const checkFunction = id === 'username' ? checkUsername : checkEmail;
                checkFunction(value, data => {
                    fieldValidity[id] = !data.exists;
                    updateUI({target: id, bool: !data.exists});
                    return
                });
            }
        } else {
            updateUI();
            return
        }
        updateUI();
    }

    // Function to check username existence
    function checkUsername(username, callback) {
        fetch(`/users/exists/username/${username}`)
            .then(response => response.json())
            .then(data => callback(data))
            .catch(error => {
                console.error('Error checking username:', error);
                callback(false);
            });
    }

    // Function to check email existence
    function checkEmail(email, callback) {
        fetch(`/users/exists/email/${email}`)
            .then(response => response.json())
            .then(data => callback(data))
            .catch(error => {
                console.error('Error checking email:', error);
                callback(false);
            });
    }

    // Updates the UI based on field validity
    function updateUI(opt) {
        let allFieldsValid = Object.values(fieldValidity).every(Boolean);
        registerButton.disabled = !allFieldsValid;
        if (allFieldsValid) {
            registerButton.classList.remove('cursor-not-allowed', 'opacity-50');
            registerButton.classList.add('text-gray-700', 'hover:text-gray-900', 'opacity-80');
        } else {
            registerButton.classList.add('cursor-not-allowed', 'opacity-50');
            registerButton.classList.remove('text-gray-700', 'hover:text-gray-900', 'opacity-80');
        }

        if (opt !== undefined) {
            if (opt.bool) {
                displayError(`${opt.target}-error`, false);
            } else {
                displayError(`${opt.target}-error`, true);
            }
        }
    }

    function displayError(target, bool) {
        const span = document.getElementById(target);
        if (bool) {
            span.classList.remove("opacity-0");
            span.classList.add("opacity-90");
        } else {
            span.classList.add("opacity-0");
            span.classList.remove("opacity-90");
        }
    }

    // Check fields initially in case of autofill
    document.addEventListener('DOMContentLoaded', () => {
        inputs.forEach(input => handleFieldInput({ target: input }));
    });
}


