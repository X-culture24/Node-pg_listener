import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventStreamServer } from './server/stream-server.js';
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';

// Setup file and directory utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.HTTP_PORT || 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve admin.html directly (optional, fallback)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Function to initialize and run the event stream server
const startServer = async () => {
  try {
    console.log('🛠 Initializing EventStreamServer...');

    const eventStreamServer = new EventStreamServer();
    await eventStreamServer.initialize();

    // Start Express server for admin UI
    app.listen(PORT, () => {
      console.log(`🌐 Admin UI available at http://localhost:${PORT}`);
    });

    console.log('🚀 Event streaming system initialized. Watching for events...\n');
  } catch (error) {
    console.error('❌ Error initializing EventStreamServer:', error);
  }
};

// Start everything
startServer();
