import {setUpForm} from "./registerFormHandler.js"
import {accountManager} from "../../userAccount.js"

setUpForm()

document.getElementById("btn-submit").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    var userData = {
        username: username,
        email: email,
        password: password,
    };

    // If validation passes, proceed to register
    accountManager.register(userData);
});
