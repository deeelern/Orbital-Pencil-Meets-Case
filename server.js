// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});

// Socket.io authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.userId = decodedToken.uid;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    next(new Error('Authentication error'));
  }
});

// On client connect
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.userId}`);

  socket.join(socket.userId);

  socket.on('send_message', (data) => {
    const message = {
      from: socket.userId,
      to: data.to,
      content: data.content,
      timestamp: new Date().toISOString(),
    };

    // TODO: Store message into database (Firestore / MongoDB)

    io.to(data.to).emit('receive_message', message);
    socket.emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});