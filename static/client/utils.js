
export const fancyUserList = [
        "John", "Jane", "Alice", "Bob", "Claire",
        "David", "Emma", "Frank", "Grace", "Henrysssssssssssssssssssssssssss",
        "Isabel", "Jack", "Karen", "Leo", "Mia",
        "Nick", "Olivia", "Paul", "Quinn", "Rachel"
];


/**
 * Aggregated a list of connected users and a list of room members in an array of object.
 * 
 * @param {Array<Object>} members  // [{username: 'john', status: 'owner'}, {username: 'bob', status: 'member'}]
 * @param {Array<string>} connectedUsers   // ['john', 'alice']
 * 
 * @returns {Array<Object>} aggregatedMembers  // [
 *  {username: 'john', status: 'owner', isConnected: true},
 * {username: 'bob', status: 'member', isConnected: false},
 * {username: 'alice', status: 'visitor', isConnected: true},
 * 
 * ]

 */ 

function aggregateUsers(members, connectedUsers) {
    // Create a map to store aggregated users by username
    const aggregatedUsersMap = {};

    // Add all members to the map with isConnected set to false
    members.forEach(member => {
    aggregatedUsersMap[member.username] = {
        username: member.username,
        status: member.status,
        isConnected: false,
    };
    });

    // Update isConnected status for connected users or add them as visitors
    connectedUsers.forEach(username => {
    if (aggregatedUsersMap[username]) {
        // User is a member; update isConnected to true
        aggregatedUsersMap[username].isConnected = true;
    } else {
        // User is not a member; add as a visitor with isConnected true
        aggregatedUsersMap[username] = {
        username: username,
        status: 'visitor',
        isConnected: true,
        };
    }
    });

    // Convert the map to an array
    return Object.values(aggregatedUsersMap);
}


export { aggregateUsers }