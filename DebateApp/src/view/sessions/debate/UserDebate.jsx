import React, { useState, useEffect } from 'react';
import { socket } from '../../../socket';
import Leaderboard from '../../../components/Leaderboard';

const StarRating = ({ value, onChange, color }) => (
  <div className="flex gap-2 justify-center mt-6">
    {[1, 2, 3, 4, 5].map(star => (
      <button 
        key={star} 
        onClick={() => onChange(star)} 
        className={`w-12 h-12 transition-all transform hover:scale-110 ${star <= value ? color : 'text-slate-600'}`}
      >
        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </button>
    ))}
  </div>
);

const UserDebate = () => {
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile_debate');
    const parsed = saved ? JSON.parse(saved) : null;
    return (parsed && parsed.name) ? parsed : { name: '', completed: false, answers: {} };
  });

  const [tempName, setTempName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [questions, setQuestions] = useState([]); // Array reactivo de preguntas

  // Estados del Duelo y Votación
  const [currentMatch, setCurrentMatch] = useState(null);
  const [votacion, setVotacion] = useState(null);
  const [votoEnviado, setVotoEnviado] = useState(false);
  const [starsA, setStarsA] = useState(0);
  const [starsB, setStarsB] = useState(0);

  // Nuevo estado para la pantalla final
  const [podium, setPodium] = useState(null);

  useEffect(() => {
    localStorage.setItem('user_profile_debate', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', { role: 'viewer', nombre: userProfile.name });

    socket.on('questions_ready', (qs) => {
       setQuestions(qs);
    });

    socket.on('confirm_receipt', () => {
      setIsSending(false);
      setUserProfile(prev => ({ ...prev, completed: true }));
    });

    socket.on('show_vs_screen', ({ match }) => {
      setCurrentMatch(match);
      setVotacion(null);
      setVotoEnviado(false);
      setStarsA(0);
      setStarsB(0);
    });

    socket.on('vote_started', ({ candidatos }) => {
      setVotacion(candidatos);
      setVotoEnviado(false);
    });
    
    socket.on('sync_vote_state', ({ hasVoted }) => {
      setVotoEnviado(hasVoted);
    });

    socket.on('vote_ended', () => {
      setVotacion(null);
      setCurrentMatch(null);
    });

    socket.on('activity_finished', ({ podium: top3 }) => {
      setPodium(top3);
    });

    socket.on('clear_cache', () => {
      localStorage.removeItem('user_profile_debate');
      window.location.reload();
    });

    return () => {
      socket.off('questions_ready');
      socket.off('confirm_receipt');
      socket.off('show_vs_screen');
      socket.off('vote_started');
      socket.off('sync_vote_state');
      socket.off('vote_ended');
      socket.off('activity_finished');
      socket.off('clear_cache');
    };
  }, []);

  const enviarAlAdmin = () => {
    setIsSending(true);
    socket.emit('submit_answers', {
      nombre: userProfile.name,
      respuestas: userProfile.answers
    });
  };

  const enviarVoto = () => {
    setVotoEnviado(true);
    socket.emit('submit_vote', { nombre: userProfile.name, starsA, starsB });
  };

  const handleRegisterName = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserProfile(prev => ({ ...prev, name: tempName.trim() }));
    }
  };

  if (podium) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-yellow-500/20 via-slate-900 to-slate-900"></div>
        
        <div className="z-10 animate-in slide-in-from-bottom duration-1000 w-full max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-4 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">🏆 CAMPEONES DEL DEBATE</h1>
          <p className="text-slate-400 mb-16 uppercase tracking-[0.3em] text-sm">Fin de la Actividad</p>
  
          <div className="flex items-end justify-center gap-4 h-64 mt-10">
            {/* Segundo Lugar */}
            {podium[1] && (
              <div className="w-28 md:w-40 bg-slate-300 text-slate-800 rounded-t-lg relative flex flex-col items-center justify-end pb-4 transition-all" style={{ height: '70%' }}>
                <span className="text-4xl absolute -top-12">🥈</span>
                <p className="font-black text-xs md:text-sm uppercase text-center px-1 mb-2 truncate w-full">{podium[1].nombre}</p>
                <p className="font-bold text-[10px] md:text-xs bg-black/10 px-2 py-1 rounded">{podium[1].score.toFixed(1)} ⭐️</p>
              </div>
            )}
            
            {/* Primer Lugar */}
            {podium[0] && (
              <div className="w-32 md:w-48 bg-yellow-400 text-yellow-900 rounded-t-lg relative flex flex-col items-center justify-end pb-4 shadow-[0_0_50px_rgba(250,204,21,0.4)] z-10" style={{ height: '100%' }}>
                <span className="text-6xl absolute -top-16 drop-shadow-xl animate-bounce">👑</span>
                <p className="font-black text-sm md:text-lg uppercase text-center px-2 mb-2 truncate w-full">{podium[0].nombre}</p>
                <p className="font-bold text-xs md:text-sm bg-black/10 px-3 py-1 rounded">{podium[0].score.toFixed(1)} ⭐️</p>
              </div>
            )}
  
            {/* Tercer Lugar (Si existe) */}
            {podium[2] && (
              <div className="w-28 md:w-40 bg-amber-700 text-orange-100 rounded-t-lg relative flex flex-col items-center justify-end pb-4" style={{ height: '50%' }}>
                <span className="text-4xl absolute -top-12">🥉</span>
                <p className="font-black text-xs md:text-sm uppercase text-center px-1 mb-2 truncate w-full">{podium[2].nombre}</p>
                <p className="font-bold text-[10px] md:text-xs bg-black/20 px-2 py-1 rounded">{podium[2].score.toFixed(1)} ⭐️</p>
              </div>
            )}
          </div>
          
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-16 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors z-20 relative">
            ← Salir al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (votacion) {
    const isDebater = userProfile.name === votacion.userA.nombre || userProfile.name === votacion.userB.nombre;

    if (isDebater) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center shadow-inner">
          <div className="text-6xl mb-6 animate-spin">⏳</div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">¡Gran Debate!</h2>
          <p className="text-slate-400">El público está votando tu desempeño. Espera los resultados...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center pt-20">
        <h1 className="text-4xl text-center font-black italic tracking-tighter mb-2 text-indigo-400">¡VOTA AL GANADOR!</h1>
        <p className="text-slate-400 text-sm mb-12 text-center uppercase tracking-widest">Califica de 1 a 5 estrellas</p>
        
        {votoEnviado ? (
          <div className="bg-emerald-500/20 border border-emerald-500 p-8 rounded-3xl backdrop-blur-md animate-in zoom-in duration-500">
            <p className="text-center text-3xl font-black text-emerald-400 uppercase tracking-widest">¡Voto registrado ✅!</p>
            <p className="text-center text-emerald-100 text-sm mt-4">Puntaje sumado en vivo en la pantalla del host.</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="bg-white/5 border border-indigo-500/30 p-8 rounded-[3rem] text-center shadow-2xl">
              <h3 className="text-3xl font-black uppercase mb-2">{votacion.userA.nombre} <span className="text-sm font-bold text-indigo-400 block mt-2 opacity-80">{votacion.userA.postura}</span></h3>
              <StarRating value={starsA} onChange={setStarsA} color="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            </div>
            
            <div className="bg-white/5 border border-orange-500/30 p-8 rounded-[3rem] text-center shadow-2xl">
              <h3 className="text-3xl font-black uppercase mb-2">{votacion.userB.nombre} <span className="text-sm font-bold text-orange-400 block mt-2 opacity-80">{votacion.userB.postura}</span></h3>
              <StarRating value={starsB} onChange={setStarsB} color="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            </div>
      
            <button 
              disabled={starsA === 0 || starsB === 0}
              onClick={enviarVoto}
              className="w-full bg-indigo-600 py-6 rounded-full font-black text-2xl uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-30 disabled:scale-100 transform active:scale-95 transition-all mt-8 shadow-xl shadow-indigo-600/20"
            >
              Enviar Votación
            </button>
          </div>
        )}
      </div>
    );
  }

  if (currentMatch) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900"></div>
        <div className="z-10 w-full max-w-5xl text-center">
           <div className="inline-block bg-white/10 px-10 py-4 rounded-full border border-white/20 mb-16 shadow-[0_0_30px_rgba(255,255,255,0.1)] backdrop-blur-md animate-in slide-in-from-top duration-700">
             <h2 className="text-2xl md:text-3xl text-indigo-300 font-black uppercase tracking-widest break-words leading-snug">{currentMatch.topic}</h2>
           </div>
           
           <div className="flex flex-col md:flex-row items-center justify-center gap-12">
              <div className="flex-1 w-full bg-gradient-to-tr from-indigo-600/20 to-transparent p-12 rounded-[3rem] border border-indigo-500/30 transform transition-all hover:scale-105 animate-in slide-in-from-left duration-700 shadow-2xl">
                 <p className="text-indigo-400 text-sm font-black tracking-widest uppercase mb-4">Combatiente 1</p>
                 <h3 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">{currentMatch.userA.nombre}</h3>
                 <span className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm uppercase shadow-lg shadow-indigo-600/50">{currentMatch.userA.postura}</span>
              </div>
              
              <div className="text-8xl font-black italic text-white/20 select-none animate-pulse">VS</div>
              
              <div className="flex-1 w-full relative overflow-hidden bg-gradient-to-tl from-orange-600/20 to-transparent p-12 rounded-[3rem] border border-orange-500/30 transform transition-all hover:scale-105 animate-in slide-in-from-right duration-700 shadow-2xl">
                 {currentMatch.isStaffWildcard && (
                   <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl shadow-lg uppercase tracking-widest">
                     Comodín Staff
                   </div>
                 )}
                 <p className="text-orange-400 text-sm font-black tracking-widest uppercase mb-4">Combatiente 2</p>
                 <h3 className={`text-5xl font-black uppercase tracking-tighter mb-4 ${currentMatch.isStaffWildcard ? 'text-emerald-300' : 'text-white'}`}>{currentMatch.userB.nombre}</h3>
                 <span className="bg-orange-600 text-white px-6 py-2 rounded-full font-bold text-sm uppercase shadow-lg shadow-orange-600/50">{currentMatch.userB.postura}</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // NUEVA PANTALLA: Carga Activa asumiendo que el Admin está configurando The Arena
  if (!userProfile.name) {
    if (questions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl mb-6 animate-pulse">⚙️</div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-indigo-400">Preparando la Arena</h2>
          <p className="text-slate-400 text-sm tracking-widest uppercase">El Administrador está configurando los temas del debate...</p>
        </div>
      );
    }
  
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <form onSubmit={handleRegisterName} className="max-w-md w-full space-y-6 animate-in zoom-in duration-300">
          <h1 className="text-4xl font-black italic tracking-tighter text-center">ARENA DE DEBATE</h1>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl text-center shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">Tu nombre o Alias</label>
            <input 
              autoFocus
              className="w-full bg-transparent border-b-2 border-white/20 text-3xl font-bold py-4 outline-none focus:border-indigo-500 transition-all text-center"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Escribe aquí..."
              required
            />
            <button className="w-full mt-8 bg-indigo-600 py-4 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest text-sm">
              Entrar al Debate
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!userProfile.completed) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-xl mx-auto space-y-8 pt-10 pb-20 animate-in slide-in-from-bottom duration-500">
          <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black italic uppercase">POSTURAS</h2>
            <div className="flex flex-col items-end">
                <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">ID: {userProfile.name}</span>
                <button onClick={() => {localStorage.clear(); window.location.reload();}} className="text-[9px] text-slate-400 hover:text-red-500 underline mt-2 font-bold transition-colors">Resetear sesión</button>
            </div>
          </header>

          {/* Omitiremos importar questions.json y usaremos el array en vivo del backend */}
          {questions.map((q) => (
            <div key={q.id || q.pregunta} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
              <p className="text-lg font-bold mb-4 text-slate-800">{q.pregunta}</p>
              <div className="grid grid-cols-2 gap-3">
                {q.opciones.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setUserProfile(prev => ({...prev, answers: {...prev.answers, [q.pregunta]: opt}}))}
                    className={`p-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                      userProfile.answers[q.pregunta] === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-inner' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="fixed bottom-6 left-0 w-full px-6 pointer-events-none z-50">
            <button 
                disabled={Object.keys(userProfile.answers).length < questions.length || isSending}
                onClick={enviarAlAdmin}
                className="pointer-events-auto w-full max-w-xl mx-auto block bg-slate-900 hover:bg-slate-800 text-white py-6 rounded-3xl font-black text-xl shadow-2xl disabled:opacity-30 disabled:hover:bg-slate-900 transition-all active:scale-[0.98] uppercase tracking-widest"
            >
                {isSending ? 'Sincronizando...' : 'Enviar Respuestas'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-600 text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="bg-white/10 p-10 rounded-[3rem] backdrop-blur-md border border-white/20 shadow-2xl max-w-sm w-full">
        <div className="text-6xl mb-6 animate-bounce">📡</div>
        <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tighter">¡Respuestas Listas!</h2>
        <p className="text-indigo-100 mb-8 max-w-xs mx-auto text-sm">
            Tus datos están en el servidor. Atento a la pantalla principal para el próximo duelo.
        </p>
        <div className="bg-emerald-400 text-slate-900 text-[10px] font-black py-2 px-6 rounded-full inline-block uppercase tracking-widest shadow-lg shadow-emerald-400/20">
          Enlace al Hub: OK
        </div>
      </div>
      
      <Leaderboard />
    </div>
  );
};

export default UserDebate;
