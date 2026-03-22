import React, { useState, useEffect } from 'react';
import questions from './questions.json';
import { socket } from '../../../socket';

const UserDebate = () => {
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile_debate');
    const parsed = saved ? JSON.parse(saved) : null;
    return (parsed && parsed.name) ? parsed : { name: '', completed: false, answers: {} };
  });

  const [tempName, setTempName] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Votación
  const [votacion, setVotacion] = useState(null);
  const [votoEnviado, setVotoEnviado] = useState(false);

  useEffect(() => {
    localStorage.setItem('user_profile_debate', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', { role: 'viewer' });

    socket.on('confirm_receipt', () => {
      setIsSending(false);
      setUserProfile(prev => ({ ...prev, completed: true }));
    });

    socket.on('vote_started', ({ candidatos }) => {
      setVotacion(candidatos);
      setVotoEnviado(false);
    });
    
    socket.on('vote_ended', () => {
      setVotacion(null);
      setVotoEnviado(false);
    });

    socket.on('clear_cache', () => {
      localStorage.removeItem('user_profile_debate');
      window.location.reload();
    });

    return () => {
      socket.off('confirm_receipt');
      socket.off('vote_started');
      socket.off('vote_ended');
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

  const enviarVoto = (opcion) => {
    setVotoEnviado(true);
    socket.emit('submit_vote', { votoPor: opcion }); // 'userA' o 'userB'
  };

  const handleRegisterName = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserProfile(prev => ({ ...prev, name: tempName.trim() }));
    }
  };

  if (votacion) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col justify-center items-center">
        <h1 className="text-4xl text-center font-black italic tracking-tighter mb-4 text-indigo-400">¡VOTA AL GANADOR!</h1>
        <p className="text-slate-400 text-sm mb-12 text-center">Toca el botón con el nombre de tu favorito</p>
        
        {votoEnviado ? (
          <div className="bg-indigo-600/20 border border-indigo-500 p-8 rounded-3xl backdrop-blur-md animate-pulse">
            <p className="text-center text-3xl font-black text-indigo-400 uppercase tracking-widest">¡Voto registrado ✅!</p>
            <p className="text-center text-indigo-200 text-sm mt-4">Puntaje sumado en vivo en la pantalla del host.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
             <button 
               onClick={() => enviarVoto('userA')} 
               className="bg-indigo-600 p-12 rounded-[3rem] shadow-2xl shadow-indigo-600/20 font-black text-4xl hover:bg-indigo-500 hover:scale-105 transition-all uppercase tracking-tighter">
               {votacion.userA.nombre}
               <span className="block text-sm font-bold opacity-50 mt-4 tracking-widest">Bando Azul</span>
             </button>
             <button 
               onClick={() => enviarVoto('userB')} 
               className="bg-orange-600 p-12 rounded-[3rem] shadow-2xl shadow-orange-600/20 font-black text-4xl hover:bg-orange-500 hover:scale-105 transition-all uppercase tracking-tighter">
               {votacion.userB.nombre}
               <span className="block text-sm font-bold opacity-50 mt-4 tracking-widest">Bando Fuego</span>
             </button>
          </div>
        )}
      </div>
    );
  }

  if (!userProfile.name) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <form onSubmit={handleRegisterName} className="max-w-md w-full space-y-6">
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
        <div className="max-w-xl mx-auto space-y-8 pt-10 pb-20">
          <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black italic uppercase">POSTURAS</h2>
            <div className="flex flex-col items-end">
                <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">ID: {userProfile.name}</span>
                <button onClick={() => {localStorage.clear(); window.location.reload();}} className="text-[9px] text-slate-400 hover:text-red-500 underline mt-2 font-bold transition-colors">Resetear sesión</button>
            </div>
          </header>

          {questions.map((q) => (
            <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
              <p className="text-lg font-bold mb-4 text-slate-800">{q.pregunta}</p>
              <div className="grid grid-cols-2 gap-3">
                {q.opciones.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setUserProfile(prev => ({...prev, answers: {...prev.answers, [q.id]: opt}}))}
                    className={`p-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                      userProfile.answers[q.id] === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-inner' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="fixed bottom-6 left-0 w-full px-6 pointer-events-none">
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
            Tus datos están en el servidor. Atento a la pantalla principal para tu turno.
        </p>
        <div className="bg-emerald-400 text-slate-900 text-[10px] font-black py-2 px-6 rounded-full inline-block uppercase tracking-widest shadow-lg shadow-emerald-400/20">
          Enlace al Hub: OK
        </div>
      </div>
    </div>
  );
};

export default UserDebate;
