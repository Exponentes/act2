const fs = require('fs');
const path = require('path');

const QUESTIONS_FILE = path.join(__dirname, '../questions.json');

const gameState = {
  actividad_seleccionada: null,
  cola_debate: [],
  matches: [],
  votacionActiva: false,
  candidatosVotacion: null, // { userA: {...}, userB: {...} }
  votosA: { totalStars: 0, count: 0 },
  votosB: { totalStars: 0, count: 0 },
  usuariosVotado: [],
  
  // New logic
  availableUsers: [], // nombres de los disponibles
  usedUsers: [], // nombres de los que ya pasaron
  scores: {}, // { "nombre": { totalScore: 0, matchesPlayed: 0 } }
  
  preguntasActivas: [] // preguntas dinámicas configuradas por el host
};

const emitAvailableUsers = (io, room) => {
  const disponibles = gameState.cola_debate.filter(u => gameState.availableUsers.includes(u.nombre));
  io.to(room).emit('update_users', disponibles);
};

const emitLeaderboardAndQueue = (io, room) => {
  const leaderboard = Object.entries(gameState.scores).map(([nombre, data]) => {
    return { nombre, score: data.totalScore };
  }).sort((a,b) => b.score - a.score);

  io.to(room).emit('leaderboard_update', {
    leaderboard,
    availableCount: gameState.availableUsers.length,
    usedCount: gameState.usedUsers.length
  });
};

module.exports = function setupSockets(io) {
  io.on('connection', (socket) => {
    
    // 1. Unirse a una sala única
    socket.on('join_room', ({ role, room = 'sala-debate-unica-123' }) => {
      socket.join(room);
      console.log(`[${role}] se unió a la sala ${room} con id ${socket.id}`);

      // Si es Admin, mandarle el estado actual
      if (role === 'admin') {
        emitAvailableUsers(io, room);
        if (gameState.matches.length > 0) {
           socket.emit('matches_generated', gameState.matches);
        }
        emitLeaderboardAndQueue(io, room);
      } else {
        // Enviar por si acaso (para viewers que necesiten el podio)
        emitLeaderboardAndQueue(io, room);
      }
      
      // Enviar preguntas si ya fueron configuradas
      if (gameState.preguntasActivas.length > 0) {
        socket.emit('questions_ready', gameState.preguntasActivas);
      }
      
      const roomClients = io.sockets.adapter.rooms.get(room);
      io.to(room).emit('update_conexiones', roomClients ? roomClients.size : 0);
    });

    // 1.5.1 Admin: Obtener preguntas guardadas
    socket.on('get_saved_questions', () => {
      try {
        if (fs.existsSync(QUESTIONS_FILE)) {
          const data = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
          socket.emit('saved_questions', JSON.parse(data));
        } else {
          socket.emit('saved_questions', []);
        }
      } catch (err) {
        console.error(err);
        socket.emit('saved_questions', []);
      }
    });

    // 1.5.2 Admin: Guardar preguntas a disco
    socket.on('save_questions_to_disk', (questions) => {
      try {
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
        socket.emit('questions_saved');
      } catch (err) {
        console.error(err);
      }
    });

    // 1.5.3 Admin: Iniciar actividad
    socket.on('start_session', (questions, room = 'sala-debate-unica-123') => {
      gameState.preguntasActivas = questions;
      io.to(room).emit('questions_ready', questions);
    });

    // 2. Admin: Redirigir a los usuarios
    socket.on('redirect_users', ({ url, room = 'sala-debate-unica-123' }) => {
      gameState.actividad_seleccionada = url;
      io.to(room).emit('redirect', { url });
    });

    // 3. User: Enviar sus respuestas del test
    socket.on('submit_answers', ({ nombre, respuestas, room = 'sala-debate-unica-123' }) => {
      let existe = gameState.cola_debate.find(p => p.nombre === nombre);
      if (!existe) {
        existe = { id: socket.id, nombre, respuestas };
        gameState.cola_debate.push(existe);
      } else {
        // Actualizar respuesta
        existe.respuestas = respuestas;
        existe.id = socket.id;
      }

      // Solo lo agregamos a disponibles si no estaba ni en disponibles ni en los que ya pasaron
      if (!gameState.availableUsers.includes(nombre) && !gameState.usedUsers.includes(nombre)) {
        gameState.availableUsers.push(nombre);
        gameState.scores[nombre] = { totalScore: 0, matchesPlayed: 0 };
      }

      emitAvailableUsers(io, room);
      emitLeaderboardAndQueue(io, room);
      socket.emit('confirm_receipt');
    });

    // 4. Admin: Generar Matches (Manual por Tema)
    socket.on('generate_matches', ({ topic, room = 'sala-debate-unica-123' }) => {
      const poolToMatch = gameState.cola_debate.filter(u => gameState.availableUsers.includes(u.nombre));
      if (poolToMatch.length === 0 || !topic) return;

      const activeMatches = [];
      let availableToMatch = [...poolToMatch];

      const preguntaObj = gameState.preguntasActivas.find(p => p.pregunta === topic) || { opciones: ['A Favor', 'En Contra'] };
      const opcA = preguntaObj.opciones[0];
      const opcB = preguntaObj.opciones[1];

      while (availableToMatch.length >= 2) {
        let userAIndex = availableToMatch.findIndex(u => u.respuestas[topic] === opcA);
        let userBIndex = availableToMatch.findIndex(u => u.respuestas[topic] === opcB);

        if (userAIndex !== -1 && userBIndex !== -1) {
          const userA = availableToMatch[userAIndex];
          const userB = availableToMatch.splice(userBIndex, 1)[0];
          
          const finalUserAIndex = availableToMatch.findIndex(u => u.id === userA.id);
          availableToMatch.splice(finalUserAIndex, 1);

          activeMatches.push({
            topic,
            userA: { ...userA, postura: opcA },
            userB: { ...userB, postura: opcB },
            forced: false
          });
        } else {
          // Plan B: forced switch
          const userA = availableToMatch.shift();
          const userB = availableToMatch.shift();
          
          const actualPosturaA = userA.respuestas[topic] || opcA;
          const opposedPostura = actualPosturaA === opcA ? opcB : opcA;
          
          activeMatches.push({
            topic,
            userA: { ...userA, postura: actualPosturaA },
            userB: { ...userB, postura: opposedPostura },
            forced: true,
            forcedUser: userB.nombre
          });
        }
      }

      // Manejo de Impares (Reutilización)
      if (availableToMatch.length === 1) {
        const lonelyUser = availableToMatch[0];
        const others = gameState.cola_debate.filter(u => u.nombre !== lonelyUser.nombre);
        if (others.length > 0) {
          const usedPool = others.filter(u => gameState.usedUsers.includes(u.nombre));
          const targetPool = usedPool.length > 0 ? usedPool : others;
          const randomUsed = targetPool[Math.floor(Math.random() * targetPool.length)];
          
          const postureA = lonelyUser.respuestas[topic] || opcA;
          const opposedPostura = postureA === opcA ? opcB : opcA;
          
          activeMatches.push({
            topic: topic,
            userA: { ...lonelyUser, postura: postureA },
            userB: { ...randomUsed, postura: opposedPostura },
            forced: true,
            forcedUser: randomUsed.nombre,
            isOddMatch: true
          });
        }
      }

      gameState.matches = activeMatches;
      io.to(room).emit('matches_generated', activeMatches);
    });

    // 5. Admin: Lanzar Duelo Específico
    socket.on('start_duel', ({ match, room = 'sala-debate-unica-123' }) => {
      // Momento Clave: Transición de disponibles a pasados
      const moveToUsed = (nombre) => {
        const idx = gameState.availableUsers.indexOf(nombre);
        if (idx !== -1) gameState.availableUsers.splice(idx, 1);
        if (!gameState.usedUsers.includes(nombre)) gameState.usedUsers.push(nombre);
      };
      
      moveToUsed(match.userA.nombre);
      moveToUsed(match.userB.nombre);

      emitAvailableUsers(io, room);
      emitLeaderboardAndQueue(io, room);

      io.to(room).emit('show_vs_screen', { match });
    });

    // 6. Admin: Iniciar una Votación
    socket.on('start_vote', ({ candidatos, room = 'sala-debate-unica-123' }) => {
      gameState.votacionActiva = true;
      gameState.candidatosVotacion = candidatos;
      gameState.votosA = { totalStars: 0, count: 0 };
      gameState.votosB = { totalStars: 0, count: 0 };
      gameState.usuariosVotado = [];

      io.to(room).emit('vote_started', { candidatos });
    });

    // 7. User: Emitir su voto (estrellas)
    socket.on('submit_vote', ({ starsA, starsB, room = 'sala-debate-unica-123' }) => {
      if (!gameState.votacionActiva || gameState.usuariosVotado.includes(socket.id)) return;
      
      gameState.usuariosVotado.push(socket.id);
      
      gameState.votosA.totalStars += starsA;
      gameState.votosA.count += 1;
      gameState.votosB.totalStars += starsB;
      gameState.votosB.count += 1;

      const getAvg = (votos) => votos.count > 0 ? (votos.totalStars / votos.count).toFixed(1) : 0;
      
      io.to(room).emit('vote_update', {
        avgA: getAvg(gameState.votosA),
        avgB: getAvg(gameState.votosB),
        totalVotes: gameState.votosA.count
      });
    });

    // 8. Admin: Finalizar Votación
    socket.on('end_vote', ({ room = 'sala-debate-unica-123' }) => {
      gameState.votacionActiva = false;
      const getAvg = (votos) => votos.count > 0 ? parseFloat((votos.totalStars / votos.count).toFixed(1)) : 0;
      
      const avgA = getAvg(gameState.votosA);
      const avgB = getAvg(gameState.votosB);

      if (gameState.candidatosVotacion) {
        const nombreA = gameState.candidatosVotacion.userA.nombre;
        const nombreB = gameState.candidatosVotacion.userB.nombre;

        // Sumar puntaje global
        if (gameState.scores[nombreA]) {
          gameState.scores[nombreA].totalScore += avgA;
          gameState.scores[nombreA].matchesPlayed += 1;
        }
        if (gameState.scores[nombreB]) {
          gameState.scores[nombreB].totalScore += avgB;
          gameState.scores[nombreB].matchesPlayed += 1;
        }
      }

      io.to(room).emit('vote_ended', { 
        resultados: {
          avgA,
          avgB,
          totalVotes: gameState.votosA.count
        }
      });

      emitLeaderboardAndQueue(io, room);
    });

    // 9. Admin: Finalizar Actividad (Podio)
    socket.on('finish_activity', ({ room = 'sala-debate-unica-123' }) => {
      const top3 = Object.entries(gameState.scores).map(([nombre, data]) => {
        return { nombre, score: data.totalScore };
      }).sort((a,b) => b.score - a.score).slice(0, 3);
      
      io.to(room).emit('activity_finished', { podium: top3 });
    });

    // 10. Reset General
    socket.on('clear_cache', ({ room = 'sala-debate-unica-123' }) => {
      gameState.actividad_seleccionada = null;
      gameState.cola_debate = [];
      gameState.matches = [];
      gameState.votacionActiva = false;
      
      gameState.availableUsers = [];
      gameState.usedUsers = [];
      gameState.scores = {};
      gameState.preguntasActivas = [];
      
      io.to(room).emit('clear_cache');
    });

    // Desconexión
    socket.on('disconnect', () => {
      const roomClients = io.sockets.adapter.rooms.get('sala-debate-unica-123');
      io.to('sala-debate-unica-123').emit('update_conexiones', roomClients ? roomClients.size : 0);
    });
  });
};
