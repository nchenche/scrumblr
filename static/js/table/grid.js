/*
Gridjs plugin imported from head.ejs with the following lines:

<script src="/lib/gridjs/dist/gridjs.umd.js"></script>
<link href="/lib/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" type='text/css'/>

and custom css to override default gridsj one.

*/

import { initializeGrid } from './utils.js'

// Initialize grid on page load
document.addEventListener('DOMContentLoaded', initializeGrid);
