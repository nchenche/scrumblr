function joinRoomHandler() {
    const button = document.getElementById("btn-submit");
    const input = document.getElementById("board-input");

    const toggleButtonState = (isEnabled) => {
        button.disabled = !isEnabled;
    };

    toggleButtonState(false);

    input.addEventListener("input", (event) => {
        toggleButtonState(event.target.value.trim() !== '');
    });

    const submitIfValid = (event) => {
        const value = input.value.trim();
        if (value) {
            submitForm(event, value);
        }
    };

    input.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            submitIfValid(event);
        }
    });

    button.addEventListener("click", submitIfValid);
}


function submitForm(event, value) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const path = `${location.origin}/room/${value}`;
    window.location.href = path;
}


document.addEventListener("DOMContentLoaded", function() {
    joinRoomHandler();
  });
