const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const setupSockets = require('./controllers/roomController');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Inicializar sockets
setupSockets(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor Socket.io corriendo en http://localhost:${PORT}`);
});
