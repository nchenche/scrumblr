export function setUpForm() {
    const inputs = document.querySelectorAll('#username, #password');
    const submitButton = document.getElementById('btn-submit');


    // State to track the validity of each field
    const fieldValidity = {
        username: false,
        password: false
    };

    // Initialize fields on load
    inputs.forEach(input => {
        // input.value = '';
        input.addEventListener('input', handleFieldInput); // Single event handler for input event
    });

    // Checks and updates the state of registration fields
    function handleFieldInput(event) {
        const { id, value } = event.target;
        fieldValidity[id] = value.trim() !== '';

        // Clear error message
        event.target.nextElementSibling.textContent = '';  

        updateUI();
    }

    // Updates the UI based on field validity
    function updateUI() {
        const allFieldsValid = Object.values(fieldValidity).every(Boolean);
        submitButton.disabled = !allFieldsValid;
    }

    // focus on empty input
    if ( !inputs[0].value.trim() ) {
        inputs[0].focus();
    } else {
        fieldValidity.username = true;
        inputs[1].focus();
    }

    // Check fields initially in case of autofill
    // inputs.forEach(input => {
    //     handleFieldInput({ target: input });
    // });
}