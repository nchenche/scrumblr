import {setUpForm} from "./loginFormHandler.js"
import {accountManager} from "../../userAccount.js"

setUpForm()

document.getElementById("btn-submit").addEventListener("click", function(event) {
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
});


