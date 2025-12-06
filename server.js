const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('public'));

const messages = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-profile', (profile) => {
        socket.join('chat-room');
        socket.profile = profile;
        socket.emit('load-messages', messages);
        console.log(`User ${socket.id} joined as ${profile}`);
    });

    socket.on('send-message', (data) => {
        const { profile, message, time } = data;

        const messageData = {
            text: message,
            time: time,
            sender: socket.id,
            profile: profile
        };

        messages.push(messageData);

        io.to('chat-room').emit('receive-message', messageData);
        console.log(`Message sent from ${profile}:`, messageData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
