
export function setupGridConfig(data, idCounter) {
    const GRID_CONFIG = {
        sort: true,
        pagination: {
            limit: 5,
            summary: true
        },
        search: {
            selector: (cell, rowIndex, cellIndex) => {
                if (cellIndex === 0) return cell;
            }
            },
        columns: [
            {
                name: 'Room',
                formatter: (_, row) => {
                    return gridjs.html(`<a class="text-blue-500 hover:bg-blue-100 hover:text-blue-800 hover:bg-transparent" href='/room/${row.cells[0].data}'>${row.cells[0].data}</a>`)
                }
            },
            {
                name: 'Password',
                formatter: (cell) => {
                    // Check if the cell value is not empty
                    if (cell) {
                        const uniqueId = `input-password-${idCounter++}`;
                        return gridjs.html(`
                        <div class="flex justify-between bg-transparent">
                            <input id="${uniqueId}" class="bg-transparent" type="password" value="${cell}" readonly disabled>
                            <button class="show-password" data-password-id="${uniqueId}" class="">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                            </button>
                        </div>
                        `);
                    } else {
                        // Return "None" if the cell is empty
                        return gridjs.html(`<span>None</span>`);
                    }
                }
            },
            "Role",
            {
                name: 'Action',
                formatter: (_, row) => {
                    const status = row.cells[2].data === "owner" ? '' : 'disabled';
                    const opacity = row.cells[2].data === "owner" ? '' : 'opacity-50';
                    const room = row.cells[0].data;
    
                    return gridjs.html(`
                        <div class="flex justify-between bg-transparent">
                            <button id="delete-room" ${status} class="${opacity}" data-room=${room} title='Delete the room'>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4">
                                    <path d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"></path>
                                </svg>
                            </button>
                        </div>
                    `)
                }
            },
        ],
        autoWidth: false,
        data: data,
        className: {
            container: 'text-lg text-inherit',
            footer: 'text-sm mt-3',
            table: 'whitespace-nowrap',
            td: '',
            thead: 'border-none'
        },
        style: {
            search: {
                'background-color': 'transparent',
            },
            table: {
                'background-color': 'transparent',
            },
            th: {
                'background-color': 'transparent',
            },
            td: {
                'background-color': 'transparent',
            },
            footer: {
                'background-color': 'transparent',
            }
        },
        language: {
            search: 'Search a room...'
        }
    }

    return GRID_CONFIG;
} 




