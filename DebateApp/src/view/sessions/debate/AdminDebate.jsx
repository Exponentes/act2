import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDebate = () => {
  const navigate = useNavigate();
  const [participantes, setParticipantes] = useState([]);
  const [fase, setFase] = useState('cuestionario'); 
  const [timeLeft, setTimeLeft] = useState(180);
  const [isActive, setIsActive] = useState(false);
  const [parejaActual, setParejaActual] = useState(null);
  const timerRef = useRef(null);

  // --- SINCRONIZACIÓN CON EL BUZÓN GLOBAL ---
  useEffect(() => {
    const sincronizarDatos = () => {
      const datos = JSON.parse(localStorage.getItem('cola_debate') || '[]');
      setParticipantes(datos);
    };

    sincronizarDatos();
    window.addEventListener('storage', sincronizarDatos);
    return () => window.removeEventListener('storage', sincronizarDatos);
  }, []);

  // --- LÓGICA DEL TEMPORIZADOR ---
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
  
  // NUEVAS FUNCIONES DE TIEMPO
  const añadirTiempo = (segundos) => setTimeLeft(t => t + segundos);
  const quitarTiempo = (segundos) => setTimeLeft(t => Math.max(0, t - segundos));

  const generarDuelo = () => {
    if (participantes.length < 2) return;
    const shuffled = [...participantes].sort(() => 0.5 - Math.random());
    setParejaActual({ userA: shuffled[0], userB: shuffled[1] });
    setFase('duelo');
    resetTimer();
    setIsActive(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden">
      <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl pointer-events-auto">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-center">Cronómetro</p>
          <div className="text-5xl font-mono font-black tabular-nums">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          
          {/* Lógica de control de tiempo recuperada */}
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
        </div>

        <div className="text-right">
          <h1 className="text-6xl font-black italic tracking-tighter leading-none">ARENA DE<br/>DEBATE</h1>
          <p className="text-indigo-400 font-bold text-sm mt-2 uppercase tracking-widest">Panel de Host</p>
        </div>
      </div>

      <div className="h-full flex items-center justify-center p-20">
        <div className="w-full max-w-6xl">
          {fase === 'cuestionario' ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-4xl font-black mb-2">PARTICIPANTES</h2>
                  <p className="text-slate-400 font-medium">Esperando que los usuarios envíen sus posturas...</p>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-black text-indigo-500">{participantes.length}</span>
                  <span className="block text-[10px] font-black text-slate-500 uppercase">Listos</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-12 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
                {participantes.map((p, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl animate-in zoom-in duration-300">
                    <p className="text-xs text-indigo-400 font-black mb-1 uppercase tracking-tighter">Conectado</p>
                    <p className="font-bold truncate text-lg uppercase">{p.nombre}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={generarDuelo}
                disabled={participantes.length < 2}
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-8 rounded-[2rem] text-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/20 disabled:opacity-20"
              >
                Generar Duelo Aleatorio ⚔️
              </button>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom duration-700">
               <div className="flex items-center gap-12">
                    <div className="flex-1 text-center p-12 bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[3rem]">
                      <p className="text-indigo-400 text-xs font-black mb-2 uppercase tracking-widest italic">Combatiente 1</p>
                      <h3 className="text-6xl font-black mb-6 uppercase tracking-tighter">{parejaActual.userA.nombre}</h3>
                      <div className="inline-block px-6 py-2 bg-indigo-500 rounded-full text-sm font-black uppercase">
                        {parejaActual.userA.respuestas[1] || "Bando A"}
                      </div>
                    </div>
                    <div className="text-8xl font-black italic opacity-20 select-none">VS</div>
                    <div className="flex-1 text-center p-12 bg-gradient-to-b from-orange-500/10 to-transparent border border-orange-500/20 rounded-[3rem]">
                      <p className="text-orange-400 text-xs font-black mb-2 uppercase tracking-widest italic">Combatiente 2</p>
                      <h3 className="text-6xl font-black mb-6 uppercase tracking-tighter">{parejaActual.userB.nombre}</h3>
                      <div className="inline-block px-6 py-2 bg-orange-500 rounded-full text-sm font-black uppercase">
                        {parejaActual.userB.respuestas[1] || "Bando B"}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setFase('cuestionario')} className="mt-20 w-full text-slate-500 hover:text-white font-black text-xs uppercase tracking-[0.3em]">
                    ← Volver a la lista / Siguiente Duelo
                  </button>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => navigate('/host')} className="fixed bottom-10 right-10 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest">
        Salir al Panel Principal
      </button>
    </div>
  );
};

export default AdminDebate;
