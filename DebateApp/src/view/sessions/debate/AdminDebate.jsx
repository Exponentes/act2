import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../../socket';

const AdminDebate = () => {
  const navigate = useNavigate();
  const [participantes, setParticipantes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [fase, setFase] = useState('setup'); // setup | cuestionario | duelos-lista | duelo
  const [timeLeft, setTimeLeft] = useState(180);
  const [isActive, setIsActive] = useState(false);
  const [parejaActual, setParejaActual] = useState(null);
  const [votacionActiva, setVotacionActiva] = useState(false);
  const [votos, setVotos] = useState({ avgA: 0, avgB: 0, totalVotes: 0 });
  const timerRef = useRef(null);

  // Dynamic Config & Topic Selectors
  const [preguntasSetup, setPreguntasSetup] = useState([
    { id: Date.now(), pregunta: '', opciones: ['', ''] }
  ]);
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [temaSeleccionado, setTemaSeleccionado] = useState('');

  // Leaderboard & Queue Stats
  const [leaderboard, setLeaderboard] = useState([]);
  const [availableCount, setAvailableCount] = useState(0);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', { role: 'admin' });
    socket.emit('get_saved_questions');

    socket.on('saved_questions', (qs) => {
      if (qs && qs.length > 0) setPreguntasSetup(qs);
    });

    socket.on('questions_saved', () => {
      setShowSaveMsg(true);
      setTimeout(() => setShowSaveMsg(false), 3000);
    });

    socket.on('questions_ready', (qs) => {
      setActiveQuestions(qs);
      if (qs.length > 0 && !temaSeleccionado) {
        setTemaSeleccionado(qs[0].pregunta);
      }
    });

    socket.on('update_users', (lista) => setParticipantes(lista));
    socket.on('matches_generated', (lista) => {
      setMatches(lista);
      setFase('duelos-lista');
    });
    socket.on('vote_update', (data) => setVotos(data));
    socket.on('vote_ended', ({ resultados }) => setVotos(resultados));
    
    socket.on('leaderboard_update', (data) => {
      setLeaderboard(data.leaderboard);
      setAvailableCount(data.availableCount);
    });

    return () => {
      socket.off('saved_questions');
      socket.off('questions_saved');
      socket.off('questions_ready');
      socket.off('update_users');
      socket.off('matches_generated');
      socket.off('vote_update');
      socket.off('vote_ended');
      socket.off('leaderboard_update');
    };
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(180); };
  const añadirTiempo = (s) => setTimeLeft(t => t + s);
  const quitarTiempo = (s) => setTimeLeft(t => Math.max(0, t - s));

  const guardarPreguntas = () => {
    const validas = preguntasSetup.filter(p => p.pregunta.trim() && p.opciones[0].trim() && p.opciones[1].trim());
    if (validas.length > 0) {
      socket.emit('save_questions_to_disk', validas);
    } else {
      alert('Debes tener al menos una pregunta válida para guardar en el banco.');
    }
  };

  const publicarPreguntas = () => {
    const validas = preguntasSetup.filter(p => p.pregunta.trim() && p.opciones[0].trim() && p.opciones[1].trim());
    if (validas.length > 0) {
      socket.emit('start_session', validas);
      setFase('cuestionario');
    } else {
      alert('Debes agregar al menos una pregunta válida con sus 2 opciones y título.');
    }
  };

  const solicitarMatches = () => { socket.emit('generate_matches', {}); };

  const lanzarDuelo = (match) => {
    setParejaActual(match);
    setFase('duelo');
    resetTimer();
    setIsActive(true);
    setVotacionActiva(false);
    setVotos({ avgA: 0, avgB: 0, totalVotes: 0 });
    socket.emit('start_duel', { match });
  };

  const iniciarVotacion = () => {
    setVotacionActiva(true);
    setVotos({ avgA: 0, avgB: 0, totalVotes: 0 });
    socket.emit('start_vote', { candidatos: parejaActual });
  };

  const cerrarVotacion = () => {
    setVotacionActiva(false);
    socket.emit('end_vote', {});
  };

  const finalizarActividad = () => {
    socket.emit('finish_activity', {});
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden">
      <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none z-50">
        
        {/* SIDEBAR IZQUIERDO: Timer y Leaderboard (Oculto en Setup) */}
        {fase !== 'setup' && (
          <div className="flex flex-col gap-4 pointer-events-auto w-72">
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-center">Cronómetro</p>
              <div className="text-5xl font-mono font-black tabular-nums border-b border-white/20 pb-4 mb-4 text-center">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => añadirTiempo(30)} className="bg-white/10 hover:bg-white/20 py-1 rounded text-[9px] font-bold">+30s</button>
                <button onClick={() => quitarTiempo(30)} className="bg-white/10 hover:bg-white/20 py-1 rounded text-[9px] font-bold">-30s</button>
                <button onClick={toggleTimer} className="col-span-2 bg-white text-slate-900 text-[10px] font-black py-2 rounded-lg hover:bg-indigo-400 transition-colors uppercase">
                  {isActive ? 'Pausar' : 'Iniciar'}
                </button>
                <button onClick={resetTimer} className="col-span-2 bg-white/10 text-[10px] font-black px-3 py-2 rounded-lg hover:bg-red-500 transition-colors uppercase">
                  Reiniciar
                </button>
              </div>
              {fase === 'duelo' && (
                <div className="mt-6 pt-4 border-t border-white/20 text-center">
                  {!votacionActiva ? (
                    <button onClick={iniciarVotacion} className="w-full bg-indigo-500 text-white text-[10px] font-black py-3 rounded-lg hover:bg-indigo-400 uppercase">
                      Abrir UI de Votación (1-5 ⭐️)
                    </button>
                  ) : (
                    <button onClick={cerrarVotacion} className="w-full bg-red-500 text-white text-[10px] font-black py-3 rounded-lg hover:bg-red-400 uppercase animate-pulse">
                      Cerrar Votación
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                <span>🏆 Ranking Global</span>
              </h3>
              
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2 mb-4">
                {leaderboard.length === 0 && <p className="text-xs text-slate-500 text-center">Sin puntuaciones aún</p>}
                {leaderboard.map((l, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="font-bold text-sm truncate flex-1">
                      <span className="text-slate-500 mr-2">#{i+1}</span>{l.nombre}
                    </span>
                    <span className="text-yellow-400 font-black flex items-center gap-1 text-sm bg-yellow-400/10 px-2 py-1 rounded">
                      <span className="text-[10px]">★</span>{l.score.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/20 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  En Espera: <span className="text-white text-lg font-black bg-indigo-500 px-3 py-1 rounded-lg ml-2">{availableCount}</span>
                </p>
                
                {availableCount === 0 && leaderboard.length > 0 && (
                  <button 
                    onClick={finalizarActividad} 
                    className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 border-none px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all animate-pulse shadow-lg shadow-emerald-500/20"
                  >
                    Finalizar / Ver Gandores
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        <div className="text-right pointer-events-auto w-full max-w-28 absolute top-8 right-8">
          <h1 className="text-5xl font-black italic tracking-tighter leading-none">ARENA DE<br/>DEBATE</h1>
          <p className="text-indigo-400 font-bold text-[10px] mt-2 uppercase tracking-widest">Panel de Host</p>
        </div>
      </div>

      <div className={`h-full flex items-center justify-center p-20 ${fase !== 'setup' ? 'pl-96 pt-32' : ''}`}>
        <div className="w-full max-w-5xl">
          
          {fase === 'setup' && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12 w-full animate-in slide-in-from-bottom duration-500">
              <h2 className="text-4xl font-black mb-2 uppercase">Configuración de Temas</h2>
              <p className="text-slate-400 font-medium mb-8">Define las preguntas y sus dos posturas contrarias para este debate.</p>
              
              <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar mb-8">
                {preguntasSetup.map((q, idx) => (
                  <div key={q.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl relative">
                     {preguntasSetup.length > 1 && (
                      <button 
                        onClick={() => setPreguntasSetup(prev => prev.filter(p => p.id !== q.id))}
                        className="absolute top-6 right-6 text-slate-500 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors"
                      >
                        Eliminar
                      </button>
                     )}
                    <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Tema / Pregunta {idx + 1}</label>
                    <input 
                      value={q.pregunta}
                      onChange={(e) => {
                         const newArr = [...preguntasSetup];
                         newArr[idx].pregunta = e.target.value;
                         setPreguntasSetup(newArr);
                      }}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none mb-4 transition-colors font-bold text-lg"
                      placeholder="Ej: ¿Pizza con o sin piña?"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bando A</label>
                        <input 
                          value={q.opciones[0]}
                          onChange={(e) => {
                            const newArr = [...preguntasSetup];
                            newArr[idx].opciones[0] = e.target.value;
                            setPreguntasSetup(newArr);
                          }}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:border-indigo-400 outline-none transition-colors"
                          placeholder="Con piña"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bando B</label>
                        <input 
                          value={q.opciones[1]}
                          onChange={(e) => {
                            const newArr = [...preguntasSetup];
                            newArr[idx].opciones[1] = e.target.value;
                            setPreguntasSetup(newArr);
                          }}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600 focus:border-orange-400 outline-none transition-colors"
                          placeholder="Sin piña"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setPreguntasSetup(prev => [...prev, { id: Date.now(), pregunta: '', opciones: ['', ''] }])}
                  className="w-1/4 bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all text-slate-300"
                >
                  + Pregunta
                </button>
                <div className="flex-1 flex gap-4 relative">
                  <button 
                    onClick={guardarPreguntas}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all text-white border border-slate-600 relative overflow-hidden"
                  >
                    💾 Guardar en Disco
                  </button>
                  <button 
                    onClick={publicarPreguntas}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-600/20 text-white"
                  >
                    Iniciar Debate 🚀
                  </button>
                  {showSaveMsg && (
                    <div className="absolute -top-12 left-1/4 -translate-x-1/2 bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-lg animate-bounce shadow-lg shadow-emerald-500/50">
                      ¡Banco Guardado!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {fase === 'cuestionario' && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-4xl font-black mb-2">PARTICIPANTES</h2>
                  <p className="text-slate-400 font-medium">Esperando respuestas del Socket...</p>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-black text-indigo-500">{participantes.length}</span>
                  <span className="block text-[10px] font-black text-slate-500 uppercase">Listos</span>
                </div>
              </div>

              {participantes.length > 0 && activeQuestions.length > 0 && (
                <div className="mb-8 border border-white/5 bg-black/20 p-6 rounded-3xl">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">💬 Selecciona el Tema a Debatir</label>
                  <div className="flex flex-wrap gap-3">
                    {activeQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTemaSeleccionado(q.pregunta)}
                        className={`px-5 py-3 rounded-full font-bold text-sm transition-all border outline-none ${
                          temaSeleccionado === q.pregunta 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-105' 
                          : 'bg-transparent border-white/20 text-slate-400 hover:border-white/50 hover:bg-white/5'
                        }`}
                      >
                        {q.pregunta}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 mb-12 max-h-[25vh] overflow-y-auto pr-4 custom-scrollbar">
                {participantes.map((p, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl animate-in zoom-in duration-300">
                    <p className="text-xs text-indigo-400 font-black mb-1 uppercase tracking-tighter">Disponible</p>
                    <p className="font-bold truncate text-lg uppercase">{p.nombre}</p>
                  </div>
                ))}
              </div>

              {participantes.length === 0 ? (
                <button 
                  onClick={finalizarActividad}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 py-8 rounded-[2rem] text-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-emerald-600/20"
                >
                  🏆 Finalizar Actividad / Ver Ganadores
                </button>
              ) : (
                <button 
                  onClick={() => socket.emit('generate_matches', { topic: temaSeleccionado })}
                  disabled={availableCount < 1 || !temaSeleccionado}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-8 rounded-[2rem] text-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/20 disabled:opacity-20 disabled:scale-100 transform active:scale-[0.98]"
                >
                  Generar Duelo: {temaSeleccionado ? "Lanzar Cola ⚔️" : "Selecciona un tema primero"}
                </button>
              )}
            </div>
          )}

          {fase === 'duelos-lista' && (
             <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12">
               <h2 className="text-4xl font-black mb-6 uppercase text-center">Siguientes Duelos</h2>
               <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                 {matches.map((m, idx) => (
                   <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-colors">
                     <div className="flex-1">
                       <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-2">Tema: {m.topic}</p>
                       <div className="flex items-center gap-6 text-xl font-bold uppercase">
                         <span className="text-indigo-300 w-1/3 text-right">{m.userA.nombre} <br/><span className="text-[10px] text-slate-400">({m.userA.postura})</span></span>
                         <span className="text-slate-500 italic font-black text-3xl">VS</span>
                         <span className="text-orange-300 w-1/3 text-left">{m.userB.nombre} <br/>
                            <span className="text-[10px] text-slate-400">
                              ({m.userB.postura}) {m.forced && <span className="text-red-400 animate-pulse ml-1 text-[10px] border border-red-500/50 px-1 rounded bg-red-500/10">Forzado</span>}
                              {m.isStaffWildcard && <span className="text-emerald-400 animate-pulse ml-1 text-[10px] border border-emerald-500/50 px-1 rounded bg-emerald-500/10">Staff</span>}
                            </span>
                         </span>
                       </div>
                     </div>
                     <button onClick={() => lanzarDuelo(m)} className="ml-8 bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-600/20">
                       Lanzar
                     </button>
                   </div>
                 ))}
               </div>
               <button onClick={() => setFase('cuestionario')} className="mt-8 text-slate-500 hover:text-white font-black text-xs uppercase tracking-[0.2em] w-full text-center">
                 Volver a Participantes
               </button>
             </div>
          )}

          {fase === 'duelo' && parejaActual && (
            <div className="animate-in slide-in-from-bottom duration-700 w-full max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <span className="bg-white/10 text-white/50 px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest border border-white/10">
                  Tema: {parejaActual.topic}
                </span>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex-1 text-center p-10 bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[3rem] relative">
                  <p className="text-indigo-400 text-xs font-black mb-2 uppercase tracking-widest italic">Combatiente 1</p>
                  <h3 className="text-5xl font-black mb-6 uppercase tracking-tighter">{parejaActual.userA.nombre}</h3>
                  <div className="inline-block px-6 py-2 bg-indigo-500 rounded-full text-sm font-black uppercase mb-4 shadow-lg shadow-indigo-500/20">
                    {parejaActual.userA.postura}
                  </div>
                  {(votacionActiva || votos.totalVotes > 0) && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 px-8 py-4 rounded-full border-4 border-slate-900 shadow-xl flex items-center gap-2">
                       <span className="text-yellow-400 text-2xl">★</span>
                       <span className="text-4xl font-black">{votos.avgA}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-7xl font-black italic opacity-20 select-none">VS</div>
                
                <div className="flex-1 text-center p-10 bg-gradient-to-b from-orange-500/10 to-transparent border border-orange-500/20 rounded-[3rem] relative">
                  <p className="text-orange-400 text-xs font-black mb-2 uppercase tracking-widest italic">Combatiente 2</p>
                  <h3 className="text-5xl font-black mb-6 uppercase tracking-tighter">{parejaActual.userB.nombre}</h3>
                  <div className="inline-block px-6 py-2 bg-orange-500 rounded-full text-sm font-black uppercase mb-4 shadow-lg shadow-orange-500/20">
                    {parejaActual.userB.postura}
                    {parejaActual.forced && <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-[10px]">Forzado</span>}
                    {parejaActual.isStaffWildcard && <span className="ml-2 bg-emerald-500 text-white px-2 py-1 rounded text-[10px]">Staff</span>}
                  </div>
                  {(votacionActiva || votos.totalVotes > 0) && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-orange-600 px-8 py-4 rounded-full border-4 border-slate-900 shadow-xl flex items-center gap-2">
                      <span className="text-yellow-400 text-2xl">★</span>
                      <span className="text-4xl font-black">{votos.avgB}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center mt-20 opacity-50 font-bold text-sm tracking-widest uppercase">
                Votos Totales en Racha: {votos.totalVotes}
              </div>
              <button 
                onClick={() => setFase('duelos-lista')} 
                className="mt-12 w-full text-slate-500 hover:text-white font-black text-xs uppercase tracking-[0.3em]"
              >
                ← Volver a la Lista de Duelos
              </button>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => navigate('/host')} className="fixed bottom-10 right-10 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors z-50">
        Salir al Panel Principal
      </button>
    </div>
  );
};

export default AdminDebate;
