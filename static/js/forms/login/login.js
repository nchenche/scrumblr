import {setUpForm} from "./loginFormHandler.js"
import {accountManager} from "../../userAccount.js"


function submitForm(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    var userData = {
        username: username,
        password: password,
    };

    // If validation passes, proceed to register
    accountManager.login(userData, (response) => {

        if (!response.success) {
            if (response.type) {
                const span = document.getElementById(`${response.type}-error`);
                span.textContent = response.message;
            }
            else {
                alert("Error:", response.message);
            }
        } else {
            // console.log(response);
            window.location.href = response.redirectTo;
        }
    } );

}


function handleSubmit() {
    const submitButton = document.getElementById("btn-submit");
    const inputs = document.querySelectorAll('#username, #password'); // Select all input fields

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