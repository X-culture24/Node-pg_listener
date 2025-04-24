import { WebSocketServer } from 'ws';
import { Client } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export class EventStreamServer {
    constructor() {
        this.config = {
            wsPort: process.env.WS_PORT || 8080,
            redisConfig: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || '',
                db: process.env.REDIS_DB || 0
            },
            eventHistoryLimit: 1000,
            heartbeatInterval: 30000,
            tables: process.env.TABLES_TO_MONITOR?.split(',') || [
                'users',
                'products',
                'orders',
                'order_items'
            ],
            defaultOperations: ['INSERT', 'UPDATE', 'DELETE']
        };

        this.bindMethods();
    }

    async initialize() {
        this.initializeRedis();
        this.initializeWebSocket();
        await this.initializeDatabase(); // Properly await this
    }

    bindMethods() {
        this.processDatabaseEvent = this.processDatabaseEvent.bind(this);
        this.handleClientMessage = this.handleClientMessage.bind(this);
        this.shouldProcessEvent = this.shouldProcessEvent.bind(this);
    }

    initializeRedis() {
        this.redis = new Redis(this.config.redisConfig);
        this.pubSubRedis = new Redis(this.config.redisConfig);

        this.redis.on('connect', () => console.log('✅ Connected to Redis'));
        this.redis.on('error', (err) => console.error('❌ Redis error:', err));
    }

    initializeWebSocket() {
        this.wss = new WebSocketServer({ port: this.config.wsPort });
        this.clients = new Map();

        this.wss.on('connection', (ws, req) => {
            const clientId = req.headers['x-client-id'] || this.uuidv4();
            console.log(`🔌 Client connected: ${clientId}`);

            this.clients.set(clientId, {
                ws,
                subscriptions: new Map(),
                isAlive: true
            });

            ws.on('pong', () => {
                const client = this.clients.get(clientId);
                if (client) client.isAlive = true;
            });

            ws.on('message', (message) => {
                try {
                    const { action, data } = JSON.parse(message);
                    this.handleClientMessage(clientId, action, data);
                } catch (err) {
                    console.error('Error processing message:', err);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            ws.on('close', () => {
                console.log(`❌ Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });

            ws.send(JSON.stringify({
                type: 'connection',
                clientId,
                timestamp: new Date().toISOString(),
                message: 'Connected to event stream server',
                availableTables: this.config.tables,
                availableOperations: this.config.defaultOperations
            }));
        });

        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                const client = Array.from(this.clients.values()).find(c => c.ws === ws);
                if (!client?.isAlive) return ws.terminate();
                client.isAlive = false;
                ws.ping();
            });
        }, this.config.heartbeatInterval);

        console.log(`🚀 WebSocket server running on ws://localhost:${this.config.wsPort}`);
    }

    async initializeDatabase() {
        this.dbClient = new Client({
            connectionString: process.env.DATABASE_URL ||
                `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
        });

        try {
            await this.dbClient.connect();
            console.log('✅ Connected to PostgreSQL');

            for (const table of this.config.tables) {
                await this.dbClient.query(`LISTEN ${table}_events`);
                console.log(`👂 Listening for ${table} events`);
            }

            this.dbClient.on('notification', async (msg) => {
                try {
                    const event = JSON.parse(msg.payload);
                    if (this.shouldProcessEvent(event)) {
                        await this.processDatabaseEvent(msg.channel, event);
                    }
                } catch (err) {
                    console.error('Error processing notification:', err);
                }
            });

        } catch (err) {
            console.error('❌ Database connection error:', err);
            process.exit(1);
        }
    }

    shouldProcessEvent(event) {
        return event && event.table_name && event.event_type;
    }

    async processDatabaseEvent(channel, event) {
        const eventKey = `event:${event.event_id}`;

        await Promise.all([
            this.redis.setex(eventKey, 86400, JSON.stringify(event)),
            this.redis.lpush('recent_events', eventKey),
            this.redis.ltrim('recent_events', 0, this.config.eventHistoryLimit - 1)
        ]);

        await this.pubSubRedis.publish('database_events', JSON.stringify({
            channel,
            event,
            timestamp: new Date().toISOString()
        }));

        this.broadcastEvent(channel, event);
    }

    handleClientMessage(clientId, action, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            switch (action) {
                case 'subscribe':
                    this.handleSubscribe(client, data);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscribe(client, data);
                    break;
                case 'filter':
                    this.handleFilter(client, data);
                    break;
                default:
                    client.ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Unknown action'
                    }));
            }
        } catch (err) {
            console.error(`Error handling client message: ${err}`);
            client.ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid request'
            }));
        }
    }

    handleSubscribe(client, data) {
        if (!data.table || !this.config.tables.includes(data.table)) {
            throw new Error('Invalid table specified');
        }

        const operations = data.operations || this.config.defaultOperations;
        const validOperations = operations.filter(op =>
            this.config.defaultOperations.includes(op.toUpperCase())
        );

        if (validOperations.length === 0) {
            throw new Error('No valid operations specified');
        }

        client.subscriptions.set(data.table, new Set(validOperations.map(op => op.toUpperCase())));

        client.ws.send(JSON.stringify({
            type: 'ack',
            message: `Subscribed to ${data.table} for operations: ${validOperations.join(', ')}`
        }));
    }

    handleUnsubscribe(client, data) {
        if (!data.table) {
            throw new Error('Table not specified');
        }

        if (client.subscriptions.has(data.table)) {
            client.subscriptions.delete(data.table);
            client.ws.send(JSON.stringify({
                type: 'ack',
                message: `Unsubscribed from ${data.table}`
            }));
        }
    }

    handleFilter(client, data) {
        client.ws.send(JSON.stringify({
            type: 'ack',
            message: 'Filter applied'
        }));
    }

    broadcastEvent(channel, event) {
        const tableName = channel.replace('_events', '');

        for (const [clientId, client] of this.clients) {
            if (client.subscriptions.has(tableName)) {
                const allowedOperations = client.subscriptions.get(tableName);
                if (allowedOperations.has(event.event_type)) {
                    client.ws.send(JSON.stringify({
                        type: 'event',
                        channel,
                        event: {
                            ...event,
                            timestamp: new Date().toISOString()
                        }
                    }));
                }
            }
        }
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// ✅ ES Module version of "if this file is run directly"
const currentFilePath = new URL(import.meta.url).pathname;
const executedDirectly = process.argv[1] === currentFilePath;

if (executedDirectly) {
    (async () => {
        console.log('🟢 Launching WebSocket Event Stream Server...');
        const server = new EventStreamServer();
        await server.initialize();
    })();
}
