const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

let rooms = [{ name: 'General', members: 0 }];

io.on('connection', (socket) => {
  console.log('✅ User connected, socket ID:', socket.id);

  socket.on('get_rooms', () => {
    console.log('📤 Client requested room list');
    socket.emit('room_list', rooms);
    console.log('📋 Sent room list:', rooms);
  });

  socket.on('join_room', ({ room, username }) => {
    console.log(`🚪 User ${username} joining room ${room}`);
    socket.join(room);
    socket.data.username = username;
    updateRoomMembers();
  });

  socket.on('leave_room', () => {
    console.log('👋 User leaving room');
    const roomsJoined = Array.from(socket.rooms).filter(r => r !== socket.id);
    roomsJoined.forEach(r => socket.leave(r));
    updateRoomMembers();
  });

  socket.on('send_message', ({ room, sender, text }) => {
    console.log(`💬 Message from ${sender} in ${room}: ${text}`);
    io.to(room).emit('message', { sender, text });
  });

  socket.on('create_room', ({ name }) => {
    console.log(`➕ Creating room: ${name}`);
    if (!rooms.find(r => r.name === name)) {
      rooms.push({ name, members: 0 });
      io.emit('room_updated');
      console.log('✅ Room created, emitting room_updated');
    }
  });

  socket.on('delete_room', ({ name }) => {
    console.log(`🗑️ Deleting room: ${name}`);
    rooms = rooms.filter(r => r.name !== name);
    io.emit('room_updated');
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
    updateRoomMembers();
  });

  function updateRoomMembers() {
    rooms.forEach(r => {
      r.members = io.sockets.adapter.rooms.get(r.name)?.size || 0;
    });
    io.emit('room_list', rooms);
    console.log('📋 Updated room list sent:', rooms);
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});