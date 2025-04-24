import { Client } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

class DBListener {
    constructor(channels = null, options = {}) {
        this.config = {
            // Default tables to monitor (can be overridden)
            tables: channels || [
                'users',
                'products',
                'orders',
                'order_items'
            ],
            // Operations to monitor (can be customized per table)
            operations: options.operations || ['INSERT', 'UPDATE', 'DELETE'],
            // Additional filters (table -> operations mapping)
            filters: options.filters || {}
        };

        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0
        });

        this.dbClient = new Client({
            connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
            application_name: 'event-listener'
        });

        // Bind methods
        this.handleNotification = this.handleNotification.bind(this);
        this.shouldProcessEvent = this.shouldProcessEvent.bind(this);
    }

    async startListening() {
        try {
            await this.dbClient.connect();
            console.log('✅ Database listener connected');

            // Dynamically create channels if not provided
            const channelsToListen = this.config.tables.map(table => `${table}_events`);

            // Listen to all specified channels
            for (const channel of channelsToListen) {
                await this.dbClient.query(`LISTEN ${channel}`);
                console.log(`👂 Listening on channel: ${channel}`);
            }

            this.dbClient.on('notification', this.handleNotification);
            console.log('🚀 Ready to process database events');

        } catch (err) {
            console.error('❌ Listener initialization failed:', err);
            process.exit(1);
        }
    }

    async handleNotification(msg) {
        try {
            const event = JSON.parse(msg.payload);
            
            if (this.shouldProcessEvent(msg.channel, event)) {
                await this.processEvent(msg.channel, event);
            }
        } catch (err) {
            console.error('⚠️ Error processing notification:', err);
        }
    }

    shouldProcessEvent(channel, event) {
        const tableName = channel.replace('_events', '');
        
        // 1. Check if table is in our monitoring list
        if (!this.config.tables.includes(tableName)) {
            return false;
        }

        // 2. Check operation type
        const allowedOperations = this.config.filters[tableName] || this.config.operations;
        if (!allowedOperations.includes(event.event_type)) {
            return false;
        }

        // 3. Add custom filters here if needed
        // Example: Only process orders with amount > 100
        // if (tableName === 'orders' && event.record?.total_amount <= 100) {
        //     return false;
        // }

        return true;
    }

    async processEvent(channel, event) {
        const eventType = channel.replace('_events', '');
        
        // 1. Log the event
        console.log(`\n=== ${eventType.toUpperCase()} ${event.event_type} ===`);
        console.log('Record:', event.record);
        if (event.event_type === 'UPDATE') {
            console.log('Changes:', event.changes);
        }

        // 2. Publish to Redis
        try {
            await this.redis.publish('database_events', JSON.stringify({
                channel,
                event,
                timestamp: new Date().toISOString(),
                processedAt: Date.now()
            }));
            
            // Optional: Store in Redis for history
            await this.redis.setex(
                `event:${event.event_id}`,
                86400, // 24h TTL
                JSON.stringify(event)
            );
            
        } catch (err) {
            console.error('❌ Redis publish failed:', err);
        }
    }

    async stopListening() {
        try {
            await this.dbClient.end();
            await this.redis.quit();
            console.log('🛑 Listener stopped gracefully');
        } catch (err) {
            console.error('Error stopping listener:', err);
        }
    }
}

export default DBListener;