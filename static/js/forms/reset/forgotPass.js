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

        accountManager.sendToken(payload, (tokenResponse) => {
            console.log("*** server response ***");
            if (tokenResponse.success) {
                console.log(tokenResponse);
                console.log(`Sending token ${tokenResponse.token} to mail ${tokenResponse.email}`);
            } else {
                console.log(`Response: ${tokenResponse}`);
            }
        } );
    });
});






// if (!response.success) {
//     if (response.type) {
//         const span = document.getElementById(`${response.type}-error`);
//         span.textContent = response.message;
//     }
//     else {
//         alert("Error:", response.message);
//     }
// } else {
//     // console.log(response);
//     window.location.href = response.redirectTo;
// }


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
