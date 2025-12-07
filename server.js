const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');

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

// Initialize SQLite database
const db = new Database('messages.db');

// Create messages table
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile TEXT NOT NULL,
        text TEXT NOT NULL,
        time TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        userName TEXT
    )
`);

// Clear messages older than 1 week
function clearOldMessages() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const stmt = db.prepare('DELETE FROM messages WHERE timestamp < ?');
    const result = stmt.run(oneWeekAgo);
    console.log(`Cleared ${result.changes} old messages`);
}

// Run cleanup on startup and every 24 hours
clearOldMessages();
setInterval(clearOldMessages, 24 * 60 * 60 * 1000);

// Get all messages from database
function getAllMessages() {
    const stmt = db.prepare('SELECT * FROM messages ORDER BY timestamp ASC');
    return stmt.all();
}

// Get messages for a specific userName
function getMessagesByUserName(userName) {
    const stmt = db.prepare('SELECT * FROM messages WHERE userName = ? ORDER BY timestamp ASC');
    return stmt.all(userName);
}

// Add message to database
function addMessage(profile, text, time, userName = null) {
    const stmt = db.prepare('INSERT INTO messages (profile, text, time, timestamp, userName) VALUES (?, ?, ?, ?, ?)');
    stmt.run(profile, text, time, Date.now(), userName);
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-profile', (data) => {
        const profile = typeof data === 'string' ? data : data.profile;
        const userName = typeof data === 'object' ? data.userName : null;

        socket.join('chat-room');
        socket.profile = profile;
        socket.userName = userName;

        // Send messages filtered by userName if provided
        const messages = userName ? getMessagesByUserName(userName) : getAllMessages();
        socket.emit('load-messages', messages);
        console.log(`User ${socket.id} joined as ${profile}${userName ? ` (${userName})` : ''}`);
    });

    socket.on('send-message', (data) => {
        const { profile, message, time, userName } = data;

        // Save to database
        addMessage(profile, message, time, userName);

        const messageData = {
            profile: profile,
            text: message,
            time: time,
            timestamp: Date.now(),
            userName: userName
        };

        // Broadcast to all clients in chat room
        io.to('chat-room').emit('receive-message', messageData);
        console.log(`Message sent from ${profile}${userName ? ` (${userName})` : ''}:`, messageData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
