import {accountManager} from "../../userAccount.js"

const input = document.getElementById('password');
const submitButton = document.getElementById('btn-submit');


function setUpForm() {
    // Initialize fields on load
    input.addEventListener('input', (event) => {
        event.target.nextElementSibling.textContent = '';  // delete span error message
        const isFieldValid = event.target.value.trim() !== '';

        updateUI(isFieldValid);
    });
}

function updateUI(bool) {
    if (bool) {
        submitButton.classList.remove('cursor-not-allowed', 'opacity-50');
        submitButton.classList.add('text-gray-700', 'hover:text-gray-900', 'opacity-80', 'cursor-pointer');
        submitButton.disabled = false;
    } else {
        submitButton.classList.add('cursor-not-allowed', 'opacity-50');
        submitButton.classList.remove('text-gray-700', 'hover:text-gray-900', 'opacity-80', 'cursor-pointer');
        submitButton.disabled = true;
    }
}

function handleSubmit() {
    document.getElementById("btn-submit").addEventListener("click", async function(event) {
        event.preventDefault(); // Prevent form from submitting traditionally
    
        const data = {
            username: document.getElementById("username").value.trim(),
            token: document.getElementById("token").value.trim(),
            password: document.getElementById("password").value.trim()
        }

        if (!data.password) return;

        accountManager.resetPassword(data, (response) => {

        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setUpForm();
    handleSubmit();
})