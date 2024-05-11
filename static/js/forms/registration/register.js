import {setUpForm} from "./registerFormHandler.js"
import {accountManager} from "../../userAccount.js"


function submitForm(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    var userData = {
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value.trim(),
    };

    // If validation passes, proceed to register
    accountManager.register(userData, (response) => {
        if (!response.success) {
            const span = document.getElementById(`${response.errorType}-error`);
            span.textContent = response.message;
            return;
        }

        const responseDiv = document.getElementById("status-message");
        let countdown = 3; // Set the countdown starting at 3 seconds
        responseDiv.textContent = `Registration successfull! Redirecting to login page in ${countdown}s...`;
    
        // Update the countdown every second
        const intervalId = setInterval(() => {
            countdown--;
            responseDiv.textContent = `Registration successfull! Redirecting to login page in ${countdown}s...`;
    
            if (countdown === 0) {
                clearInterval(intervalId); // Stop the countdown
                window.location.href = "/login"; // Redirect to login page
            }
        }, 1000);
    });
}


function handleSubmit() {
    const submitButton = document.getElementById("btn-submit");
    const inputs = document.querySelectorAll('#username, #email, #password'); // Select all input fields

    // Attach event listener to button
    submitButton.addEventListener("click", submitForm);

    // Attach event listener to each input field for the Enter key
    inputs.forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.key === "Enter" && input.value.trim()) {
                const allFilled = Array.from(inputs).every(input => input.value.trim() !== '');
                if (allFilled) {
                    submitForm(event);
                }
            }
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    setUpForm();
    handleSubmit();
})
