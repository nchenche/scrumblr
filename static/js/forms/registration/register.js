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
        
        showSuccessMessage();
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

function showSuccessMessage() {
    const contentDiv = document.getElementById("board-content");
    const statusDiv = document.getElementById("status-message");
    const counter = document.getElementById("counter");

    counter.innerHTML = 3;
    contentDiv.classList.add("hidden");
    statusDiv.classList.remove("hidden");

    // Update the counter value every second
    const intervalId = setInterval(() => {
        counter.innerHTML--;

        if (counter.innerHTML == 0) {
            clearInterval(intervalId);  // Stop the countdown
            window.location.href = "/login";  // Redirect to login page
        }
    }, 1000);
}


// function capitalize(word) {
//     return word.charAt(0).toUpperCase() + word.slice(1);
// }



document.addEventListener('DOMContentLoaded', () => {
    setUpForm();
    handleSubmit();
})
