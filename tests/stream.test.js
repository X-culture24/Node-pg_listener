const WebSocket = require('ws');
const { startStreamServer } = require('../server/stream-server');
const { query } = require('../server/db-client');

describe('Event Stream', () => {
  let server;
  let wsClient;
  const messages = [];

  beforeAll(async () => {
    server = await startStreamServer();
    
    // Setup WebSocket client
    return new Promise((resolve) => {
      wsClient = new WebSocket('ws://localhost:8080');
      
      wsClient.on('open', resolve);
      wsClient.on('message', (data) => {
        messages.push(JSON.parse(data));
      });
    });
  });

  afterAll(() => {
    wsClient.close();
    server.close();
  });

  test('Receives user creation event', async () => {
    // Clear previous messages
    messages.length = 0;
    
    // Subscribe to events
    wsClient.send(JSON.stringify({
      action: 'subscribe',
      data: ['users']
    }));
    
    // Create test user
    await query(
      `INSERT INTO users (username, email) 
       VALUES ($1, $2) 
       RETURNING *`,
      ['testuser', 'test@example.com']
    );
    
    // Wait for event
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userEvents = messages.filter(m => m.table === 'users');
    expect(userEvents.length).toBeGreaterThan(0);
    expect(userEvents[0].eventType).toBe('INSERT');
  });
});

