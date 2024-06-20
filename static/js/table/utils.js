/*
Gridjs plugin imported from head.ejs with the following lines:

<script src="/lib/gridjs/dist/gridjs.umd.js"></script>
<link href="/lib/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" type='text/css'/>

and custom css to override default gridsj one.

*/

import { setupGridConfig } from './config.js'


// This function fetches data required to initialize the grid.
async function fetchData() {
    const loader = document.getElementById("loader");
    try {
        loader.classList.toggle("hidden");

        const response = await fetch('/api/rooms');
        if (!response.ok) {
            loader.classList.add("hidden");
            throw new Error('Failed to fetch rooms');
        }

        const result = await response.json();
        loader.classList.add("hidden");


        return result.data.map(room => [room.room, room.password, room.role]);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        loader.classList.add("hidden");

        return [];  // Return an empty array or appropriate fallback
    }
}


// Function to delete a room
async function deleteRoom(room) {
    try {
        const response = await fetch('/api/delete_room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room })
        });
        if (!response.ok) {
            throw new Error('Failed to delete room');
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting room:', error);
        throw error;  // Propagate the error
    }
}


// Initialize the grid
export async function initializeGrid() {
    
    let data = await fetchData();

    var idCounter = 0;

    const GRID_CONFIG = setupGridConfig(data, idCounter);

    const grid = new gridjs.Grid(GRID_CONFIG).render(document.getElementById("wrapper"));

    grid.on('rowClick', async (...args) => {
        const target = args[0].srcElement;
        const room = args[1]._cells[0].data;

        if ( target.closest('.show-password') ) {
            const button = target.closest('.show-password')
            togglePassword(button);
        } else if ( target.closest('#delete-room') ) {
            const message = `
                                                    *** WARNING ***
            
            You are going to delete the room ${room} and all its elements.

            Do you want to continue?
            
            `;
            const response = confirm(message);
            if (response) {
                const response = await deleteRoom(room);
                console.log('Delete response:', response);

                // reload the page
                window.location.href = '/rooms';
            }
        }
    });
}


// Helper function to toggle visibility of passwords
function togglePassword(button) {
    const input = document.getElementById(button.dataset.passwordId);
    input.type = input.type === 'password' ? 'text' : 'password';
    button.innerHTML = getIcon(input.type);
}

// Returns SVG icons based on type
function getIcon(type) {
    const svgEyeClosed = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>`;

    const svgEyeOpen = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>`;
    return type === 'password' ? svgEyeClosed : svgEyeOpen;
}