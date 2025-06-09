// frontend/socket.js

import io from 'socket.io-client';
import firebase from './FirebaseConfig';

let socket;

export const connectSocket = async () => {
  const user = firebase.auth().currentUser;
  const token = await user.getIdToken();

  socket = io('http://192.168.0.88:5000', {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('✅ Connected to Socket.io');
  });

  socket.on('receive_message', (message) => {
    console.log('📩 New message:', message);
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from Socket.io');
  });

  socket.on('connect_error', (err) => {
    console.error('Connection Error:', err.message);
  });

  return socket;
};

export const sendMessage = (to, content) => {
  if (socket) {
    socket.emit('send_message', { to, content });
  }
};