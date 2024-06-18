export function setUpForm() {
    const inputs = document.querySelectorAll('#username, #email, #password');
    const registerButton = document.getElementById('btn-submit');
    const loader = document.getElementById('loader');
    const statusMessage = document.getElementById('status-message');

    // State to track the validity of each field
    const fieldValidity = {
        username: false,
        email: false,
        password: false
    };

    // Initialize fields on load
    inputs.forEach(input => {
        input.value = '';
        input.addEventListener('input', handleFieldInput); // Single event handler for input event
    });

    // Checks and updates the state of registration fields
    function handleFieldInput(event) {
        event.target.nextElementSibling.textContent = ''; // delete span error message
        const { id, value } = event.target;


        // Update field validity
        fieldValidity[id] = value.trim() !== '';

        // Specifically for the password field, check additional requirements
        if (id === 'password') {
            fieldValidity[id] = fieldValidity[id] && validatePasswordRequirements(value);
        }

        // Check if all fields are correctly filled
        const areFieldsFilled = Object.values(fieldValidity).every(Boolean);

        // Enable or disable the register button based on the conditions
        registerButton.disabled = !areFieldsFilled;
    }


    function validatePasswordRequirements(password) {
        const validationResults = [
            updateRequirement('lowercase', /[a-z]/.test(password)),
            // updateRequirement('uppercase', /[A-Z]/.test(password)),
            // updateRequirement('number', /[0-9]/.test(password)),
            // updateRequirement('length', password.length >= 8)
        ];

        // Return true if all requirements are met
        return validationResults.every(Boolean);
    }

    function updateRequirement(id, isValid) {
        const element = document.getElementById(id);
        element.classList.toggle('invalid', !isValid);

        return isValid;
    }





    // Attach submit event listener
    // registerButton.addEventListener('click', submitForm);

    // Function to handle form submission
    async function submitForm(event) {
        event.preventDefault(); // Prevent form from submitting traditionally

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();



        const userData = {
            username,
            email,
            password,
        };

        // try {
        //     loader.classList.remove('hidden');
        //     const response = await accountManager.register(userData);
        //     loader.classList.add('hidden');
            
        //     if (!response.success) {
        //         const span = document.getElementById(`${response.type}-error`);
        //         span.textContent = response.message;
        //     } else {
        //         window.location.href = response.redirectTo;
        //     }
        // } catch (error) {
        //     loader.classList.add('hidden');
        //     console.error('Registration error:', error);
        // }
    }

    // Check fields initially in case of autofill
    inputs.forEach(input => handleFieldInput( { target: input } ));
}


/**
* Checks the validity of email format and availability of username and email.
* This function performs asynchronous operations to check the database for existing username and email,
* and validates the email format.
*
* @param {HTMLInputElement} username - The input element containing the username.
* @param {HTMLInputElement} email - The input element containing the email.
* @returns {Promise<boolean>} Returns true if both username and email are available and the email format is valid.
*                              Returns false if the email format is invalid, the username or email is already registered,
*                              or if there's an error in checking availability.
*/
export async function checkFields(username, email) {
   // Check email format before sending request
   if (!isValidEmailFormat(email.value.trim())) {
       email.nextElementSibling.textContent = "Invalid email format";
       return false;
   }

   try {
       const [usernameExists, emailExists] = await Promise.all([
           checkUsername(username.value.trim()),
           checkEmail(email.value.trim())
       ]);

       const isAvailable = {
           username: !(usernameExists.result === 1),
           email: !(emailExists.result === 1)
       };

       let allAvailable = true;

       // Check the availability results and update UI accordingly
       Object.keys(isAvailable).forEach(key => {
           if (!isAvailable[key]) {
               allAvailable = false;
               if (key === "username") {
                   username.nextElementSibling.textContent = "Username already registered...";
               } else if (key === "email") {
                   email.nextElementSibling.textContent = "Email already registered...";
               }
           }
       });

       return true;
   } catch (error) {
       console.error("Error checking username/email availability:", error);
       return false;
   }
}


// Function to check basic email format
function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


// Function to check username existence
async function checkUsername(username) {
   try {
       const response = await fetch(`/users/exists/username/${username}`);
       return await response.json();
   } catch (error) {
       console.error('Error checking username:', error);
       return { result: false };
   }
}

// Function to check email existence
async function checkEmail(email) {
   try {
       const response = await fetch(`/users/exists/email/${email}`);
       return await response.json();
   } catch (error) {
       console.error('Error checking email:', error);
       return { exists: false };
   }
}
