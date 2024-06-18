import { setUpForm, checkFields } from "./registerFormHandler.js"
import {accountManager} from "../../userAccount.js"


async function submitForm(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');

    // Check username/email fields validity
    const areFieldsValid = await checkFields(username, email);
    if ( !areFieldsValid ) return

    // Data payload to register
    var userData = {
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value.trim(),
    };

    // If validation passes, proceed to register
    accountManager.register(userData, (response) => {
        if (!response.success) {
            const message = `
            Error occured during registration process...

            Message: ${response.message}
            `;
            alert(message);
            window.location.href = "/register";
            return;
        }

        const responseDiv = document.getElementById("status-message");
        let countdown = 3; // Set the countdown starting at 3 seconds
        responseDiv.textContent = `Registration successfull! Redirecting to login page in ${countdown}s...`;
    
        // Update the countdown every second
        const intervalId = setInterval(() => {
            countdown--;
            responseDiv.textContent = `Registration successfull, redirecting to login page in ${countdown}s...`;
    
            if (countdown === 0) {
                clearInterval(intervalId);  // Stop the countdown
                window.location.href = "/login";  // Redirect to login page
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



document.addEventListener('DOMContentLoaded', () => {
    setUpForm();
    handleSubmit();
})
