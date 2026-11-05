import {createServer} from './server.js';
createServer().listen(Number(process.env.PORT || 3000), '0.0.0.0');
