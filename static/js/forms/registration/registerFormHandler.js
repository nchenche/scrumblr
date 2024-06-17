export function setUpForm() {
    const inputs = document.querySelectorAll('#username, #email, #password');
    const registerButton = document.getElementById('btn-submit');
    const loader = document.getElementById('loader');
    const statusMessage = document.getElementById('status-message');

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
    async function handleFieldInput(event) {
        event.target.nextElementSibling.textContent = ''; // delete span error message
        const { id, value } = event.target;
        fieldValidity[id] = value.trim() !== '';

        // Additional checks for username and email
        if (id === 'username' || id === 'email') {
            if (value.trim() !== '') {
                const checkFunction = id === 'username' ? checkUsername : checkEmail;
                const data = await checkFunction(value);
                fieldValidity[id] = !data.exists;
                updateUI({ target: id, exists: data.exists });
            }
        } else {
            updateUI();
        }
    }

    // Function to check username existence
    async function checkUsername(username) {
        try {
            const response = await fetch(`/users/exists/username/${username}`);
            return await response.json();
        } catch (error) {
            console.error('Error checking username:', error);
            return { exists: false };
        }
    }

    // Function to check email existence
    async function checkEmail(email) {
        try {
            const response = await fetch(`/users/exists/email/${email}`);
            return await response.json();
        } catch (error) {
            console.error('Error checking email:', error);
            return { exists: false };
        }
    }

    // Updates the UI based on field validity
    function updateUI(opt) {
        const allFieldsValid = Object.values(fieldValidity).every(Boolean);
        registerButton.disabled = !allFieldsValid;

        if (opt !== undefined && opt.exists) {
            const span = document.getElementById(`${opt.target}-error`);
            span.textContent = `${capitalize(opt.target)} already exists`;
        }
    }

    function capitalize(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    // Attach submit event listener
    registerButton.addEventListener('click', submitForm);

    // Function to handle form submission
    async function submitForm(event) {
        event.preventDefault(); // Prevent form from submitting traditionally

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        const userData = {
            username,
            email,
            password,
        };

        try {
            loader.classList.remove('hidden');
            const response = await accountManager.register(userData);
            loader.classList.add('hidden');
            
            if (!response.success) {
                const span = document.getElementById(`${response.type}-error`);
                span.textContent = response.message;
            } else {
                window.location.href = response.redirectTo;
            }
        } catch (error) {
            loader.classList.add('hidden');
            console.error('Registration error:', error);
        }
    }

    // Check fields initially in case of autofill
    // inputs.forEach(input => handleFieldInput( { target: input } ));
}

