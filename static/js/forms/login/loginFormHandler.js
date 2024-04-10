export function setUpForm() {
    const inputs = document.querySelectorAll('#username, #email, #password');
    const registerButton = document.getElementById('btn-submit');

    // State to track the validity of each field
    const fieldValidity = {
        username: false,
        password: false
    };

    // Initialize fields on load
    inputs.forEach(input => {
        input.value = '';
        input.addEventListener('input', handleFieldInput); // Single event handler for input event
    });

    // Checks and updates the state of registration fields
    function handleFieldInput(event) {
        event.target.nextElementSibling.textContent = '';

        const { id, value } = event.target;
        fieldValidity[id] = value.trim() !== '';

        // Additional checks for username and email
        if (id === 'username' || id === 'password') {
            if (value.trim() !== '') {
                    fieldValidity[id] = true;
                    updateUI();
                    return
            }
        } else {
            updateUI();
            return
        }
        updateUI();
    }

    // Updates the UI based on field validity
    function updateUI() {
        let allFieldsValid = Object.values(fieldValidity).every(Boolean);
        registerButton.disabled = !allFieldsValid;
        if (allFieldsValid) {
            registerButton.classList.remove('cursor-not-allowed', 'opacity-50');
            registerButton.classList.add('text-gray-700', 'hover:text-gray-900', 'opacity-80');
        } else {
            registerButton.classList.add('cursor-not-allowed', 'opacity-50');
            registerButton.classList.remove('text-gray-700', 'hover:text-gray-900', 'opacity-80');
        }
    }

    // Check fields initially in case of autofill
    document.addEventListener('DOMContentLoaded', () => {
        inputs.forEach(input => handleFieldInput({ target: input }));
    });
}
