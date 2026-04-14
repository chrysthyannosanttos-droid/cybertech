const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100MB limit
});

// Store active connections
// key: 6-digit ID, value: { agentId, techId }
const rooms = new Map();
// reverse lookup: socketId -> roomId
const socketToRoom = new Map();

io.on('connection', (socket) => {
  console.log('[CONN] New socket connected:', socket.id);

  // 1. Agent Registration (from Windows PC)
  socket.on('register-agent', (customId) => {
    const id = customId || Math.floor(100000 + Math.random() * 900000).toString();
    rooms.set(id, { agentId: socket.id, techId: null });
    socketToRoom.set(socket.id, id);
    socket.join(id);
    socket.emit('42["registered",{"id":"' + id + '"}]'); // Specific for raw WS agent
    // Standard emit for socket.io clients
    socket.emit('registered', { id });
    console.log(`[AGENT] Registered: ${id}`);
  });

  // 2. Technician Join (from Web Panel)
  socket.on('join-room', (id) => {
    const room = rooms.get(id);
    if (room) {
      room.techId = socket.id;
      socketToRoom.set(socket.id, id);
      socket.join(id);
      io.to(id).emit('tech-joined', { techId: socket.id });
      console.log(`[TECH] Joined room: ${id}`);
    } else {
      socket.emit('error-msg', 'ID Inválido ou Offline');
    }
  });

  // 3. Raw Binary Handling (Agent -> Tech relay)
  socket.on('message', (data) => {
    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        // Relay screen frame to everyone else in the room (the technician)
        socket.to(roomId).volatile.emit('screen-frame', data);
      }
    }
  });

  // 4. Input Command Relay (Tech -> Agent)
  socket.on('mouse-event', ({ roomId, event }) => {
    socket.to(roomId).emit('remote-mouse', event);
  });

  socket.on('keyboard-event', ({ roomId, event }) => {
    socket.to(roomId).emit('remote-keyboard', event);
  });

  // 5. Cleanup
  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room && room.agentId === socket.id) {
        console.log(`[AGENT] Disconnected: ${roomId}`);
        rooms.delete(roomId);
      }
      socketToRoom.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SERVER] RemoteDesk Signaling running on port ${PORT}`);
});
