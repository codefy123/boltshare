const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Allow requests from your deployed frontend URL
const io = new Server(server, {
    cors: {
        origin: "*", // In production, replace with your actual frontend URL
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    // Get IP for auto-discovery
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    
    // Default: Join room based on IP (Auto-discovery)
    socket.join(ip);
    socket.emit('my-info', { id: socket.id, ip });

    // Notify others on this IP
    socket.to(ip).emit('user-found', { id: socket.id, name: `User ${socket.id.substr(0, 4)}` });

    // Mode 2: Join by Custom Code
    socket.on('join-room', (code) => {
        socket.leave(ip); // Leave IP room
        socket.join(code);
        socket.emit('joined-room', code);
        socket.to(code).emit('user-found', { id: socket.id, name: `User ${socket.id.substr(0, 4)}` });
    });

    // WebRTC Signaling Relay
    socket.on('signal', (data) => {
        io.to(data.target).emit('signal', {
            sender: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        io.emit('user-disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
