import { accountManager } from "../../userAccount.js"
import { validatePasswordRequirements } from '../registration/registerFormHandler.js'

var isFieldValid = false;

function setUpForm() {
    const input = document.getElementById('password');
    const submitButton = document.getElementById('btn-submit');

    // Initialize field on load
    input.value = '';
    input.addEventListener('input', handleFieldInput);

    function handleFieldInput(event) {
        event.target.nextElementSibling.textContent = ''; // Clear any previous error messages
        isFieldValid = event.target.value.trim() !== '';

        isFieldValid = isFieldValid && validatePasswordRequirements(input.value);

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

    if (!isFieldValid) return;

    showSuccessMessage();

    accountManager.resetPassword(data, (response) => {
        if (!response.success) {
            const span = document.getElementById("reset-error");
            span.textContent = response.message;
            return;
        }

        let countdown = 5; // Set the countdown starting at 3 seconds
    
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


function showSuccessMessage() {
    const username = document.getElementById("user").value.trim();

    const contentDiv = document.getElementById("board-content");
    const statusDiv = document.getElementById("status-message");
    const counter = document.getElementById("counter");

    counter.innerHTML = 3;
    contentDiv.classList.add("hidden");
    statusDiv.classList.remove("hidden");

    // Update the counter value every second
    const intervalId = setInterval(() => {
        counter.innerHTML--;

        if (counter.innerHTML == 1) {
            clearInterval(intervalId);  // Stop the countdown
            window.location.href = `/login?username=${username}`;  // Redirect to the login page
        }
    }, 1000);
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