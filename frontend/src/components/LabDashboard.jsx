import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import config from "../config/config";

const LabDashboard = () => {
    const [groupedClients, setGroupedClients] = useState({});
    const [selectedClient, setSelectedClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [command, setCommand] = useState('');

    useEffect(() => {
        // Fetch clients initially and then every 5 seconds
        fetchClients();
        const interval = setInterval(fetchClients, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Fetch messages when a client is selected
        if (selectedClient) {
            fetchMessages(selectedClient.clientId);
            const interval = setInterval(() => fetchMessages(selectedClient.clientId), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedClient]);

    const fetchClients = async () => {
        try {
            const response = await fetch(`${config.apiUrl}/api/clients`);
            const data = await response.json();
            setGroupedClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchMessages = async (clientId) => {
        try {
            const response = await fetch(`${config.apiUrl}/api/messages/${clientId}`);
            const data = await response.json();
            setMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendCommand = async () => {
        if (!command.trim() || !selectedClient) return;

        try {
            await fetch(`${config.apiUrl}/api/messages/${selectedClient.clientId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'command',
                    data: {
                        commandId: Date.now(),
                        command: command
                    }
                }),
            });

            setCommand('');
            fetchMessages(selectedClient.clientId);
        } catch (error) {
            console.error('Error sending command:', error);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Clients Panel */}
            <div className="w-1/3 p-4 bg-white overflow-auto">
                <h2 className="text-xl font-bold mb-4">Connected Labs</h2>
                {Object.entries(groupedClients).map(([company, branches]) => (
                    <div key={company} className="mb-6">
                        <h3 className="text-lg font-semibold text-blue-600 mb-2">{company}</h3>
                        {Object.entries(branches).map(([branch, clients]) => (
                            <div key={branch} className="ml-4 mb-4">
                                <h4 className="text-md font-medium text-gray-700 mb-2">{branch}</h4>
                                <div className="space-y-2">
                                    {clients.map((client) => (
                                        <div
                                            key={client.clientId}
                                            className={`p-3 rounded-lg cursor-pointer ${selectedClient?.clientId === client.clientId
                                                ? 'bg-blue-50 border border-blue-200'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                            onClick={() => setSelectedClient(client)}
                                        >
                                            <div className="font-medium">
                                                Client {client.clientId.slice(0, 8)}...
                                            </div>
                                            <div className="text-sm text-gray-500">{client.ip}</div>
                                            <div className="text-xs text-gray-400">
                                                Connected: {new Date(client.connectedAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Messages Panel */}
            <div className="flex-1 p-4 bg-gray-50">
                {selectedClient ? (
                    <>
                        <div className="mb-4">
                            <h2 className="text-xl font-bold">Messages</h2>
                            <div className="text-sm text-gray-600">
                                {selectedClient.companyName} - {selectedClient.branchName}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 mb-4">
                            <div className="space-y-4 h-[calc(100vh-280px)] overflow-auto">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`flex gap-2 ${msg.direction === 'from_server' ? 'justify-end' : ''
                                            }`}
                                    >
                                        <div
                                            className={`p-3 rounded-lg max-w-[70%] ${msg.direction === 'from_server'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <MessageSquare className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    {msg.direction === 'from_server' ? 'Server' : 'Client'}
                                                </span>
                                            </div>
                                            <pre className="text-sm whitespace-pre-wrap">
                                                {JSON.stringify(msg.data, null, 2)}
                                            </pre>
                                            <div className="text-xs mt-2 opacity-70">
                                                {new Date(msg.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex gap-2">
                                <input
                                    type="text"
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
                                    placeholder="Type a command to send..."
                                    className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={sendCommand}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Select a client to view messages
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabDashboard;