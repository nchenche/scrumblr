export function setUpForm() {
    const input = document.getElementById('username');
    const submitButton = document.getElementById('btn-submit');

    // Initialize field on load
    input.value = '';
    input.addEventListener('input', handleFieldInput);

    function handleFieldInput(event) {
        const isFieldValid = event.target.value.trim() !== '';
        event.target.nextElementSibling.textContent = ''; // Clear any previous error messages
        updateUI(isFieldValid);
    }

    function updateUI(isFieldValid) {
        submitButton.disabled = !isFieldValid;
    }

    // Check the field initially in case of autofill
    handleFieldInput({ target: input });
}
