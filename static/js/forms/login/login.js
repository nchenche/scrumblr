import { setUpForm } from "./loginFormHandler.js";
import { accountManager } from "../../userAccount.js";


function submitForm(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const userData = {
        username: username,
        password: password,
    };

    // If validation passes, proceed to register
    accountManager.login(userData, (response) => {
        if (!response.success) {
            const errorSpan = document.getElementById(`${response.type}-error`);
            if (errorSpan) {
                errorSpan.textContent = response.message;
            } else {
                alert(`Error: ${response.message}`);
            }
        } else {
            // Redirect to the specified location
            window.location.href = response.redirectTo;
        }
    });
}

function handleSubmit() {
    const submitButton = document.getElementById("btn-submit");
    const inputs = document.querySelectorAll('#username, #password'); // Select all input fields

    // Function to check if all inputs are filled
    const allFieldsFilled = () => Array.from(inputs).every(input => input.value.trim() !== '');

    // Attach event listener to button
    submitButton.addEventListener("click", submitForm);

    // Attach event listener to each input field for the Enter key
    inputs.forEach(input => {
        input.addEventListener('keypress', (event) => {
            if (event.key === "Enter" && allFieldsFilled()) {
                submitForm(event);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setUpForm();
    handleSubmit();
});
