import {setUpForm} from "./forgotPassHandler.js"
import {accountManager} from "../../userAccount.js"

setUpForm();

document.getElementById("btn-submit").addEventListener("click", async function(event) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const username = document.getElementById("username").value.trim();
    const payload = { username: username };

    checkUsername(payload.username, (response) => {
        if (! response.exists) {
            const span = document.getElementById(`username-error`);
            span.textContent = "User does not exist";
            return
        }

        // start spin loader
        activateLoader(true);

        accountManager.sendToken(payload, (tokenResponse) => {
            activateLoader(false);
            if (tokenResponse.success) {
                // console.log(tokenResponse);
                const responseDiv = document.getElementById("mail-destination");
                responseDiv.innerHTML = `
                <p>Email successfully sent to <strong>${tokenResponse.email}</strong>.</p>
                <p class="text-base text-green-800 mt-1">Please check <b>your spam folder</b> if you do not see the email</p>
                `;
            } else {
                console.error(`Response: ${tokenResponse}`);
            }
        } );
    });
});


// Function to check username existence
function checkUsername(username, callback) {
    fetch(`/users/exists/username/${username}`)
        .then(response => response.json())
        .then(data => callback(data))
        .catch(error => {
            console.error('Error checking username:', error);
            callback(false);
        });
}

function activateLoader(bool) {
    const loader = document.getElementById("loader");
    if (bool) {
        loader.classList.remove("hidden");
        return
    }

    loader.classList.add("hidden");
}
