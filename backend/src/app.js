// server.js
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const wsPort = process.env.WS_PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory storage
const clients = new Map(); // Store client connections
const messages = []; // Store all messages

// Create WebSocket server
const wss = new WebSocket.Server({ port: wsPort });

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;

    ws.on('message', (data) => {
        const message = JSON.parse(data);

        switch (message.type) {
            case 'register':
                handleClientRegistration(ws, message.data, clientIp);
                break;

            default:
                handleClientMessage(ws, message);
                break;
        }
    });

    ws.on('close', () => {
        handleClientDisconnection(ws);
    });
});

function handleClientRegistration(ws, clientData, ip) {
    const clientInfo = {
        ...clientData,
        ip,
        ws,
        connectedAt: new Date().toISOString()
    };

    clients.set(clientData.clientId, clientInfo);

    console.log(`New client registered: ${clientData.companyName} - ${clientData.branchName}`);
    broadcastClientList();
}

function handleClientMessage(ws, message) {
    const client = findClientByWs(ws);
    if (!client) return;

    const storedMessage = {
        from: client.clientId,
        companyName: client.companyName,
        branchName: client.branchName,
        direction: 'from_client',
        timestamp: new Date().toISOString(),
        ...message
    };

    messages.push(storedMessage);
}

function handleClientDisconnection(ws) {
    const client = findClientByWs(ws);
    if (client) {
        clients.delete(client.clientId);
        broadcastClientList();
    }
}

function findClientByWs(ws) {
    for (const [clientId, client] of clients.entries()) {
        if (client.ws === ws) return client;
    }
    return null;
}

function broadcastClientList() {
    const clientList = Array.from(clients.values()).map(client => ({
        clientId: client.clientId,
        companyName: client.companyName,
        branchName: client.branchName,
        ip: client.ip,
        connectedAt: client.connectedAt
    }));

    wss.clients.forEach(client => {
        client.send(JSON.stringify({
            type: 'client_list',
            data: clientList
        }));
    });
}

// API Routes

// Get all connected clients grouped by company and branch
app.get('/api/clients', (req, res) => {
    const clientList = Array.from(clients.values()).map(client => ({
        clientId: client.clientId,
        companyName: client.companyName,
        branchName: client.branchName,
        ip: client.ip,
        connectedAt: client.connectedAt
    }));

    // Group clients by company and branch
    const grouped = clientList.reduce((acc, client) => {
        if (!acc[client.companyName]) {
            acc[client.companyName] = {};
        }
        if (!acc[client.companyName][client.branchName]) {
            acc[client.companyName][client.branchName] = [];
        }
        acc[client.companyName][client.branchName].push(client);
        return acc;
    }, {});

    res.json(grouped);
});

// Get messages for a specific client
app.get('/api/messages/:clientId', (req, res) => {
    const clientMessages = messages.filter(msg =>
        msg.from === req.params.clientId || msg.to === req.params.clientId
    );
    res.json(clientMessages);
});

// Send message to specific client
app.post('/api/messages/:clientId', (req, res) => {
    const client = clients.get(req.params.clientId);
    if (!client) {
        return res.status(404).json({ error: 'Client not found' });
    }

    const message = {
        to: req.params.clientId,
        direction: 'from_server',
        timestamp: new Date().toISOString(),
        ...req.body
    };

    messages.push(message);

    client.ws.send(JSON.stringify({
        type: 'server_command',
        data: req.body
    }));

    res.json({ success: true, message });
});

app.listen(port, () => {
    console.log(`HTTP Server running on port ${port}`);
    console.log(`WebSocket Server running on port ${wsPort}`);
});