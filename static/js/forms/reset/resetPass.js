import {accountManager} from "../../userAccount.js"

const input = document.getElementById('password');
const submitButton = document.getElementById('btn-submit');


function setUpForm() {
    const input = document.getElementById('password');
    const submitButton = document.getElementById('btn-submit');

    // Initialize field on load
    input.value = '';
    input.addEventListener('input', handleFieldInput);

    function handleFieldInput(event) {
        event.target.nextElementSibling.textContent = ''; // Clear any previous error messages
        const isFieldValid = event.target.value.trim() !== '';

        submitButton.disabled = !isFieldValid;
    }

    // Check the field initially in case of autofill
    handleFieldInput({ target: input });
}



// Function to handle form submission
async function submitForm(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const data = {
        username: document.getElementById("user").value.trim(),
        token: document.getElementById("token").value.trim(),
        password: document.getElementById("password").value.trim()
    }

    if (!data.password) return;

    accountManager.resetPassword(data, (response) => {
        if (!response.success) {
            const span = document.getElementById("reset-error");
            span.textContent = response.message;
            return;
        }

        const responseDiv = document.getElementById("reset-success");
        let countdown = 5; // Set the countdown starting at 3 seconds
        responseDiv.innerHTML = `
        <div class="text-green-700 px-4 py-3 rounded relative" role="alert">
            <p class="block sm:inline text-2xl">Password successfully reset!</p>
            <p class="mt-4 text-[18px] text-gray-800">Redirecting to the login page in <span id="counter" class="text-gray-600 text-[26px] opacity-90">${countdown}s...</span></p>
        </div>
        `;
    
        // Update the countdown every second
        const counter = document.getElementById("counter");
        const intervalId = setInterval(() => {
            countdown--;
            counter.textContent = `
                ${countdown}s
            `;
    
            if (countdown === 0) {
                clearInterval(intervalId); // Stop the countdown
                window.location.href = "/login"; // Redirect to login page
            }
        }, 1000);
    });
}


function handleSubmit() {
    const submitButton = document.getElementById("btn-submit");
    const input = document.getElementById('password');

    // Attach event listener to button
    submitButton.addEventListener("click", submitForm);

    // Attach event listener to each input field for the Enter key
    input.addEventListener('keypress', function(event) {
        if (event.key === "Enter" && input.value.trim()) {
            submitForm(event);
        }
        return;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setUpForm();
    handleSubmit();
})