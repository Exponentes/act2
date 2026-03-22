// Memoria del estado de la sala activa
const gameState = {
  actividad_seleccionada: null,
  cola_debate: [],
  votacionActiva: false,
  candidatosVotacion: null, // { userA: {...}, userB: {...} }
  votos: { userA: 0, userB: 0 },
  usuariosVotado: [] // Para evitar votos dobles
};

module.exports = function setupSockets(io) {
  io.on('connection', (socket) => {
    
    // 1. Unirse a una sala única
    socket.on('join_room', ({ role, room = 'sala-debate-unica-123' }) => {
      socket.join(room);
      console.log(`[${role}] se unió a la sala ${room}`);

      // Si es Admin, mandarle el estado actual
      if (role === 'admin') {
        socket.emit('update_cola', gameState.cola_debate);
      }
      
      const roomClients = io.sockets.adapter.rooms.get(room);
      io.to(room).emit('update_conexiones', roomClients ? roomClients.size : 0);
    });

    // 2. Admin: Redirigir a los usuarios
    socket.on('redirect_users', ({ url, room = 'sala-debate-unica-123' }) => {
      gameState.actividad_seleccionada = url;
      io.to(room).emit('redirect', { url });
    });

    // 3. User: Enviar sus respuestas del test
    socket.on('submit_answers', ({ nombre, respuestas, room = 'sala-debate-unica-123' }) => {
      const existe = gameState.cola_debate.find(p => p.nombre === nombre);
      if (!existe) {
        gameState.cola_debate.push({ id: socket.id, nombre, respuestas });
        io.to(room).emit('update_cola', gameState.cola_debate);
      }
      socket.emit('confirm_receipt');
    });

    // 4. Admin: Iniciar una Votación
    socket.on('start_vote', ({ candidatos, room = 'sala-debate-unica-123' }) => {
      gameState.votacionActiva = true;
      gameState.candidatosVotacion = candidatos;
      gameState.votos = { userA: 0, userB: 0 };
      gameState.usuariosVotado = [];

      io.to(room).emit('vote_started', { candidatos });
    });

    // 5. User: Emitir su voto
    socket.on('submit_vote', ({ votoPor, room = 'sala-debate-unica-123' }) => {
      if (!gameState.votacionActiva || gameState.usuariosVotado.includes(socket.id)) return;
      
      gameState.usuariosVotado.push(socket.id);
      if (votoPor === 'userA') gameState.votos.userA++;
      if (votoPor === 'userB') gameState.votos.userB++;

      io.to(room).emit('vote_update', gameState.votos);
    });

    // 6. Admin: Finalizar Votación
    socket.on('end_vote', ({ room = 'sala-debate-unica-123' }) => {
      gameState.votacionActiva = false;
      io.to(room).emit('vote_ended', { resultados: gameState.votos });
    });

    // 7. Reset General
    socket.on('clear_cache', ({ room = 'sala-debate-unica-123' }) => {
      gameState.actividad_seleccionada = null;
      gameState.cola_debate = [];
      gameState.votacionActiva = false;
      io.to(room).emit('clear_cache');
    });

    // Desconexión
    socket.on('disconnect', () => {
      const roomClients = io.sockets.adapter.rooms.get('sala-debate-unica-123');
      io.to('sala-debate-unica-123').emit('update_conexiones', roomClients ? roomClients.size : 0);
    });
  });
};
