function joinRoomHandler() {
    const button = document.getElementById("btn-submit");
    const input = document.getElementById("board-input");

    input.addEventListener("input", (event) => {
        if (event.target.value === '') {
            button.classList.add('cursor-not-allowed', 'opacity-50');
            button.classList.remove('text-gray-700', 'hover:text-gray-900', 'opacity-90');
        }
        else {
            button.classList.remove('cursor-not-allowed', 'opacity-50');
            button.classList.add('text-gray-700', 'hover:text-gray-900', 'opacity-80');
        }
    });

    // Attach event listener to each input field for the Enter key
    input.addEventListener('keypress', function(event) {
        if ( !event.key === "Enter" && input.value.trim() ) return;
        submitForm(event, input.value.trim());
    });


    button.addEventListener("click", (event) => {
        if ( !input.value.trim() ) return;
        submitForm(event, input.value.trim());
    })
}

function submitForm(event, value) {
    event.preventDefault(); // Prevent form from submitting traditionally

    const path = `${location.origin}/room/${value}`;
    window.location.href = path;
}


document.addEventListener("DOMContentLoaded", function() {
    joinRoomHandler();
  });
