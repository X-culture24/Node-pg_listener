// client-app.js
const WebSocket = require('ws');
const readline = require('readline');
const uuidv4 = require('uuid').v4;

class EventStreamClient {
    constructor() {
        this.clientId = uuidv4();
        this.ws = new WebSocket('ws://localhost:8080', {
            headers: { 'X-Client-ID': this.clientId }
        });
        
        this.setupEventListeners();
        this.setupCommandInterface();
    }
    
    setupEventListeners() {
        this.ws.on('open', () => {
            console.log('Connected to event stream server');
            this.showHelp();
        });
        
        this.ws.on('message', (data) => {
            const message = JSON.parse(data);
            this.handleServerMessage(message);
        });
        
        this.ws.on('close', () => {
            console.log('Disconnected from server');
            process.exit(0);
        });
        
        this.ws.on('error', (err) => {
            console.error('WebSocket error:', err);
        });
    }
    
    setupCommandInterface() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });
        
        this.rl.on('line', (line) => {
            this.handleCommand(line.trim());
            this.rl.prompt();
        });
        
        this.rl.on('close', () => {
            console.log('Exiting...');
            process.exit(0);
        });
    }
    
    handleCommand(command) {
        const [action, ...args] = command.split(' ');
        
        switch (action.toLowerCase()) {
            case 'subscribe':
                this.subscribe(args);
                break;
                
            case 'unsubscribe':
                this.unsubscribe(args);
                break;
                
            case 'history':
                this.getHistory(args);
                break;
                
            case 'help':
                this.showHelp();
                break;
                
            case 'exit':
                this.ws.close();
                break;
                
            default:
                console.log('Unknown command. Type "help" for available commands.');
        }
    }
    
    subscribe(eventTypes) {
        if (eventTypes.length === 0) {
            console.log('Usage: subscribe <event_type1> [event_type2...]');
            console.log('Example: subscribe users products');
            return;
        }
        
        this.ws.send(JSON.stringify({
            action: 'subscribe',
            data: eventTypes
        }));
    }
    
    unsubscribe(eventTypes) {
        if (eventTypes.length === 0) {
            console.log('Usage: unsubscribe <event_type1> [event_type2...]');
            console.log('Example: unsubscribe orders');
            return;
        }
        
        this.ws.send(JSON.stringify({
            action: 'unsubscribe',
            data: eventTypes
        }));
    }
    
    getHistory(args) {
        const options = {};
        
        if (args.includes('--type')) {
            const typeIndex = args.indexOf('--type');
            options.event_types = args.slice(typeIndex + 1).filter(arg => !arg.startsWith('--'));
        }
        
        if (args.includes('--table')) {
            const tableIndex = args.indexOf('--table');
            options.tables = args.slice(tableIndex + 1).filter(arg => !arg.startsWith('--'));
        }
        
        if (args.includes('--limit')) {
            const limitIndex = args.indexOf('--limit');
            options.limit = parseInt(args[limitIndex + 1]) || 50;
        }
        
        this.ws.send(JSON.stringify({
            action: 'get_history',
            data: options
        }));
    }
    
    handleServerMessage(message) {
        switch (message.type) {
            case 'connection':
                console.log(`Connected as client ${message.clientId}`);
                break;
                
            case 'ack':
                console.log(`[ACK] ${message.message}`);
                break;
                
            case 'error':
                console.error(`[ERROR] ${message.message}`);
                break;
                
            case 'event_history':
                console.log(`\n=== Event History (${message.count} events) ===`);
                message.events.forEach(event => {
                    this.printEvent(event);
                });
                break;
                
            default:
                // Assume it's an event
                console.log('\n=== New Event ===');
                this.printEvent(message);
        }
    }
    
    printEvent(event) {
        console.log(`Event ID: ${event.eventId}`);
        console.log(`Type: ${event.eventType}`);
        console.log(`Table: ${event.table}`);
        console.log(`Timestamp: ${event.timestamp}`);
        
        if (event.eventType === 'UPDATE') {
            console.log('Changes:');
            console.log(event.data.changes);
        }
        
        console.log('Record:', event.data.record);
        console.log('------------------------');
    }
    
    showHelp() {
        console.log('\nAvailable commands:');
        console.log('subscribe <event_type1> [event_type2...] - Subscribe to events');
        console.log('unsubscribe <event_type1> [event_type2...] - Unsubscribe from events');
        console.log('history [--type <type>] [--table <table>] [--limit <n>] - Get event history');
        console.log('help - Show this help message');
        console.log('exit - Disconnect and exit\n');
    }
}

new EventStreamClient();
