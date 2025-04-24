import dotenv from 'dotenv';
dotenv.config();

// 🛠 Use named import here
import { EventStreamServer } from './server/stream-server.js';
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';

// Initialize the event stream server
const eventStreamServer = new EventStreamServer();

// Remove the demonstration function and event stream testing code

// The event stream server will continue running, but without demonstration logic
console.log('🚀 Event streaming system initialized. Watching for events...\n');
