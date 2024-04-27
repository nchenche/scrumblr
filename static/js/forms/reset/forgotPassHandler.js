const input = document.getElementById('username');
const submitButton = document.getElementById('btn-submit');


export function setUpForm() {


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


