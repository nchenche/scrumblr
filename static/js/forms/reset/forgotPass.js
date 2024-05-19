import {setUpForm} from "./forgotPassHandler.js"
import {accountManager} from "../../userAccount.js"


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

function submitForm(event) {
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
                <div class="text-green-700 px-4 py-3 rounded relative" role="alert">
                    <span class="block sm:inline">Email successfully sent to <u>${tokenResponse.email}</u>.</span>
                    <p class="text-red-500 text-lg mt-4">Be sure to check <strong>your spam or junk folder</strong> if you do not see the email within a few minutes.</p>
                </div>
                `;
            } else {
                console.error(`Response: ${tokenResponse}`);
                alert(tokenResponse.message);
            }
        } );
    });
}

function handleSubmit() {
    const submitButton = document.getElementById("btn-submit");
    const input = document.getElementById('username');

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