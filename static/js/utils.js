document.addEventListener("DOMContentLoaded", function() {
    joinRoomHandler();
  });


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


    button.addEventListener("click", (event) => {
        if (input.value === '') return
        const path = `${location.origin}/room/${input.value}`;
        window.location.href = path;
        // console.log(path);
        // console.log(input.value)


    })
}