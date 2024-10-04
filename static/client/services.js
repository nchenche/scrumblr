/**
 * Fetches the current user's information from the server. It returns the username
 * if the user is logged in. If not, it logs that the user is not logged in but does not return anything.
 *
 * @async
 * @returns {Promise<string|undefined>} A promise that resolves with the username of the currently logged-in user
 * if they are logged in, or undefined if not logged in.
 * @throws {Error} Throws an error if there is a problem fetching the user data.
 */
async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/current_user');
        const data = await response.json();
        if (data.success) {
            return data.username
        } else {
            console.log('Not logged in');
            return
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}


/**
 * Adds a user as a participant to a room by sending user and room information to the server.
 * This function asynchronously posts data to the server and handles the response through a callback.
 * 
 * @param {Object} data An object containing the user and room details.
 * @param {string} data.user The username of the user to add as a participant.
 * @param {string} data.room The room identifier to which the user is being added.
 * @param {Function} callback A callback function that processes the result of the request. It takes one argument:
 *                            the result from the server.
 * 
 * @returns {Promise} This function does not return a value; it handles the result via a callback.
 * @throws {Error} Throws an error if the network request fails or if the API returns an error.
 */
async function setUserAsParticipant(data) {
    try {
        const response = await fetch('/api/add_room_to_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        return response.json();
    } catch (error) {
        console.error('Error adding room to user:', error);
        return { success: false, error: 'Failed to add room to user' };
    }
}


async function checkUserRightAccess(room, username) {
    try {
        const data = {room: room, user: username};
        const response = await fetch('/api/check_user_access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error when checking user access! status: ${response.status}`);
        }
        return response.json();

    } catch (error) {
        console.error(`Error checking user ${username} to access room ${room}: ${error}`);
    }
}


async function allowUserAccess(room, username) {
    try {
        const data = {room: room, user: username};
        const response = await fetch('/api/allow_user_access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        console.log("response from fetching allowUserAccess: ", response);
    } catch (error) {
        console.error(`Error allowing user ${username} to access room ${room}: ${error}`);
    }
}


async function getRoomMembers(room) {
    try {
        const response = await fetch(`/api/rooms/${room}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response) return {};

        const data = await response.json();
        const members = [
            {
                username: data.owner,
                status: 'owner' 
            }
        ];

        data.participants.forEach(username => {
            members.push(
                {
                    username: username,
                    status: 'member'
                }
            )
        });
        
        return members;
    } catch (error) {
        console.error(`Error accessing members of the room ${room}: ${error}`);
    }
}



export {
    fetchCurrentUser,
    setUserAsParticipant,
    checkUserRightAccess,
    allowUserAccess,
    getRoomMembers
};