// lab-client.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');
const clientConfig = require('./config/config');

class LabClient {
    constructor(config) {
        this.config = {
            companyName: config.companyName,
            branchName: config.branchName,
            wsUrl: config.wsUrl || 'ws://localhost:8080',
            clientId: uuidv4()
        };

        // Setup terminal interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.connect();
        this.setupTerminalInput();
    }

    connect() {
        this.ws = new WebSocket(this.config.wsUrl);

        this.ws.on('open', () => {
            console.log('Connected to server');
            console.log(`Client ID: ${this.config.clientId}`);
            console.log(`Company: ${this.config.companyName}`);
            console.log(`Branch: ${this.config.branchName}`);
            console.log('\nType "help" for available commands\n');

            // Send registration message
            this.sendMessage({
                type: 'register',
                data: {
                    clientId: this.config.clientId,
                    companyName: this.config.companyName,
                    branchName: this.config.branchName
                }
            });
        });

        this.ws.on('message', (data) => {
            const message = JSON.parse(data);
            console.log('\nReceived message:', JSON.stringify(message, null, 2), '\n');

            if (message.type === 'server_command') {
                this.handleServerCommand(message);
            }
        });

        this.ws.on('close', () => {
            console.log('\nDisconnected from server. Reconnecting in 5 seconds...');
            setTimeout(() => this.connect(), 5000);
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    setupTerminalInput() {
        this.rl.on('line', (input) => {
            const trimmedInput = input.trim();

            if (trimmedInput === 'help') {
                this.showHelp();
                return;
            }

            if (trimmedInput === 'exit') {
                this.cleanup();
                return;
            }

            try {
                // Try to parse as JSON
                const jsonMessage = JSON.parse(trimmedInput);
                this.sendMessage(jsonMessage);
                console.log('Sent JSON message');
            } catch (e) {
                // If not JSON, send as regular text message
                this.sendMessage({
                    type: 'message',
                    data: {
                        content: trimmedInput
                    }
                });
                console.log('Sent text message');
            }

            console.log('\nType your message (or "help" for commands):');
        });
    }

    showHelp() {
        console.log('\nAvailable commands:');
        console.log('  help  - Show this help message');
        console.log('  exit  - Exit the client');
        console.log('\nSending messages:');
        console.log('1. Send text message: Just type your message and press enter');
        console.log('2. Send JSON message: Type valid JSON and press enter');
        console.log('\nExample JSON message:');
        console.log({
            type: 'test_result',
            data: {
                patientId: 'P123',
                testType: 'blood_test',
                results: {
                    hemoglobin: 14.5
                }
            }
        });
        console.log('\nType your message:');
    }

    sendMessage(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.log('Not connected to server. Message not sent.');
        }
    }

    handleServerCommand(message) {
        console.log('\nHandling server command:', message);
        // Send response back
        this.sendMessage({
            type: 'command_response',
            data: {
                commandId: message.data.commandId,
                status: 'completed',
                timestamp: new Date().toISOString()
            }
        });
    }

    cleanup() {
        console.log('\nClosing client...');
        if (this.ws) {
            this.ws.close();
        }
        this.rl.close();
        process.exit(0);
    }
}

// Setup cleanup on process termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Cleaning up...');
    if (global.labClient) {
        global.labClient.cleanup();
    }
});

// Create client instance
global.labClient = new LabClient({
    companyName: process.argv[2] || clientConfig.defaultCompany,
    branchName: process.argv[3] || clientConfig.defaultBranch,
    wsUrl: process.argv[4] || clientConfig.wsUrl
});