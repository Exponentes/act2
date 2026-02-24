import React, { useState, useEffect } from 'react';
import { Peer } from 'peerjs';
import { useNavigate } from 'react-router-dom';
import actividadesData from '../data/initial.json';

// --- VARIABLES GLOBALES (Singleton) ---
// Al estar fuera del componente, sobreviven aunque el Admin navegue a otra pantalla
let globalPeer = null;
let conexionesGlobales = [];

const AdminPanel = () => {
  const navigate = useNavigate();
  const [actividadActiva, setActividadActiva] = useState(() => {
    const saved = localStorage.getItem('actividad_seleccionada');
    return saved ? JSON.parse(saved) : null;
  });
  const [numConectados, setNumConectados] = useState(conexionesGlobales.length);

  useEffect(() => {
    // 1. Inicializar el servidor Peer SOLO si no existe aún
    if (!globalPeer || globalPeer.destroyed) {
      globalPeer = new Peer('sala-debate-unica-123');

      globalPeer.on('connection', (conn) => {
        conn.on('open', () => {
          // --- SUSURRO AUTOMÁTICO DINÁMICO ---
          // Leemos del localStorage en el momento exacto para no depender de estados viejos de React
          const actividadGuardada = JSON.parse(localStorage.getItem('actividad_seleccionada'));
          if (actividadGuardada) {
            conn.send({ action: 'REDIRECT', url: actividadGuardada.src });
          }

          if (!conexionesGlobales.find(c => c.peer === conn.peer)) {
            conexionesGlobales.push(conn);
            // Avisar a la interfaz que hay un nuevo dispositivo
            window.dispatchEvent(new CustomEvent('update_conexiones'));
          }
        });

        // --- RECEPCIÓN DE DATOS EN BACKGROUND ---
        conn.on('data', (data) => {
          if (data.type === 'SUBMIT_ANSWERS') {
            const actual = JSON.parse(localStorage.getItem('cola_debate') || '[]');
            const existe = actual.find(p => p.nombre === data.nombre);
            
            if (!existe) {
              const nuevaLista = [...actual, { nombre: data.nombre, respuestas: data.respuestas }];
              localStorage.setItem('cola_debate', JSON.stringify(nuevaLista));
              // Esto despierta a AdminDebate.jsx si el administrador lo está viendo
              window.dispatchEvent(new Event('storage'));
            }
            conn.send({ type: 'CONFIRM_RECEIPT' });
          }
        });

        conn.on('close', () => {
          conexionesGlobales = conexionesGlobales.filter(c => c.peer !== conn.peer);
          window.dispatchEvent(new CustomEvent('update_conexiones'));
        });
      });
    }

    // 2. Sincronizar la UI del contador de dispositivos
    const updateConectados = () => setNumConectados(conexionesGlobales.length);
    window.addEventListener('update_conexiones', updateConectados);
    updateConectados(); // Carga inicial al montar el componente

    return () => {
      // IMPORTANTE: NO destruimos el globalPeer aquí. 
      // Solo dejamos de escuchar los cambios en la UI porque nos vamos a otra pantalla.
      window.removeEventListener('update_conexiones', updateConectados);
    };
  }, []);

  const enviarOrden = (actividad) => {
    setActividadActiva(actividad);
    localStorage.setItem('actividad_seleccionada', JSON.stringify(actividad));
    
    // Usamos el array global para enviar la orden a todos
    conexionesGlobales.forEach(conn => {
      if (conn.open) {
        conn.send({ action: 'REDIRECT', url: actividad.src });
      }
    });
  };

  const resetearTodo = () => {
    localStorage.removeItem('actividad_seleccionada');
    localStorage.removeItem('cola_debate'); 
    setActividadActiva(null);
    conexionesGlobales.forEach(conn => {
      if (conn.open) conn.send({ action: 'RESET' });
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">CONTROL HUB</h1>
            <p className="text-slate-500 text-sm">Gestionando sesión en tiempo real</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
              <span className="block text-[10px] font-black text-indigo-400 uppercase">Dispositivos</span>
              <span className="text-2xl font-bold text-indigo-600">{numConectados}</span>
            </div>
            <button onClick={resetearTodo} className="bg-red-50 text-red-500 px-6 py-3 rounded-2xl border border-red-100 font-bold hover:bg-red-100 transition-colors">
              Reset Global
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actividadesData.map((act) => {
            const isSelected = actividadActiva?.id === act.id;
            return (
              <div
                key={act.id}
                onClick={() => enviarOrden(act)}
                className={`p-6 rounded-3xl border-4 transition-all cursor-pointer shadow-sm ${
                  isSelected ? 'border-indigo-600 bg-white' : 'border-white bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{act.titulo || act.Debate}</h3>
                  {isSelected && <span className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-md font-black">ACTIVA</span>}
                </div>
                <p className="text-sm text-slate-500 mb-6">{act.descripcion}</p>
                <div className="flex justify-between items-center">
                  <code className="text-[10px] text-slate-400">{act.src}</code>
                  {isSelected && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`${act.src}/admin`); }}
                      className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800"
                    >
                      Gestionar Panel →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
