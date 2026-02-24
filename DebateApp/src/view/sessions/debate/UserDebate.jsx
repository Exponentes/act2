import React, { useState, useEffect } from 'react';
import { Peer } from 'peerjs';
import questions from './questions.json';

const UserDebate = () => {
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile_debate');
    const parsed = saved ? JSON.parse(saved) : null;
    return (parsed && parsed.name) ? parsed : { name: '', completed: false, answers: {} };
  });

  const [tempName, setTempName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(false);

  useEffect(() => {
    localStorage.setItem('user_profile_debate', JSON.stringify(userProfile));
  }, [userProfile]);

  const enviarAlAdmin = (perfilFinal) => {
    if (!perfilFinal.name) return;
    setIsSending(true);
    setErrorEnvio(false);
    
    // Creamos un peer con ID aleatorio para evitar colisiones
    const peer = new Peer();

    peer.on('open', () => {
      // Intentamos conectar al ID fijo del Admin central
      const conn = peer.connect('sala-debate-unica-123', { 
        reliable: true,
        connectionPriority: 'high'
      });

      const timerError = setTimeout(() => {
        if (!userProfile.completed) {
            setIsSending(false);
            setErrorEnvio(true);
            peer.destroy();
        }
      }, 10000); // Aumentamos a 10s para redes lentas

      conn.on('open', () => {
        conn.send({
          type: 'SUBMIT_ANSWERS',
          nombre: perfilFinal.name,
          respuestas: perfilFinal.answers
        });
      });

      conn.on('data', (data) => {
        if (data.type === 'CONFIRM_RECEIPT') {
          clearTimeout(timerError);
          setIsSending(false);
          setUserProfile(prev => ({ ...prev, completed: true }));
          peer.destroy();
        }
      });

      conn.on('error', () => {
        setIsSending(false);
        setErrorEnvio(true);
        peer.destroy();
      });
    });
  };

  const handleRegisterName = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserProfile(prev => ({ ...prev, name: tempName.trim() }));
    }
  };

  if (!userProfile.name) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <form onSubmit={handleRegisterName} className="max-w-md w-full space-y-6">
          <h1 className="text-4xl font-black italic tracking-tighter text-center italic">ARENA DE DEBATE</h1>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl text-center">
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">Tu nombre o Alias</label>
            <input 
              autoFocus
              className="w-full bg-transparent border-b-2 border-white/20 text-3xl font-bold py-4 outline-none focus:border-indigo-500 transition-all text-center"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Escribe aquí..."
              required
            />
            <button className="w-full mt-8 bg-indigo-600 py-4 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
              ENTRAR AL DEBATE
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
          <header className="flex justify-between items-center">
            <h2 className="text-2xl font-black italic uppercase italic">POSTURAS</h2>
            <div className="flex flex-col items-end">
                <span className="bg-slate-200 text-[10px] font-black px-3 py-1 rounded-full uppercase italic">ID: {userProfile.name}</span>
                <button onClick={() => {localStorage.clear(); window.location.reload();}} className="text-[9px] text-slate-400 underline mt-1">Resetear</button>
            </div>
          </header>

          {questions.map((q) => (
            <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-lg font-bold mb-4">{q.pregunta}</p>
              <div className="grid grid-cols-2 gap-3">
                {q.opciones.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setUserProfile(prev => ({...prev, answers: {...prev.answers, [q.id]: opt}}))}
                    className={`p-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                      userProfile.answers[q.id] === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="fixed bottom-6 left-0 w-full px-6">
            <button 
                disabled={Object.keys(userProfile.answers).length < questions.length || isSending}
                onClick={() => enviarAlAdmin(userProfile)}
                className="w-full max-w-xl mx-auto block bg-slate-900 text-white py-6 rounded-3xl font-black text-xl shadow-xl disabled:opacity-30 transition-all active:scale-95"
            >
                {isSending ? 'CONECTANDO...' : 'ENVIAR RESPUESTAS'}
            </button>
            {errorEnvio && (
                <p className="text-red-600 text-[10px] font-black text-center mt-2 bg-red-100 py-1 rounded-lg animate-pulse uppercase">
                    ⚠️ Host no disponible. Intenta de nuevo.
                </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-600 text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="bg-white/10 p-10 rounded-[3rem] backdrop-blur-md border border-white/20 shadow-2xl">
        <div className="text-6xl mb-6 animate-bounce">🚀</div>
        <h2 className="text-3xl font-black mb-2 uppercase italic">¡LISTO!</h2>
        <p className="text-indigo-100 mb-8 max-w-xs mx-auto text-sm italic">
            {userProfile.name}, tus datos están seguros. Mira la pantalla principal.
        </p>
        <div className="bg-emerald-400 text-slate-900 text-[10px] font-black py-2 px-6 rounded-full inline-block uppercase tracking-widest">
          Sincronizado
        </div>
      </div>
    </div>
  );
};

export default UserDebate;
