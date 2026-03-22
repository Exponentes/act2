import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import actividadesData from '../data/initial.json';
import { socket } from '../socket';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [actividadActiva, setActividadActiva] = useState(() => {
    const saved = localStorage.getItem('actividad_seleccionada');
    return saved ? JSON.parse(saved) : null;
  });
  const [numConectados, setNumConectados] = useState(0);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      socket.emit('join_room', { role: 'admin' });
      const actividadGuardada = JSON.parse(localStorage.getItem('actividad_seleccionada'));
      if (actividadGuardada) {
         socket.emit('redirect_users', { url: actividadGuardada.src });
      }
    });

    socket.on('update_conexiones', (count) => {
      setNumConectados(count);
    });

    return () => {
      socket.off('connect');
      socket.off('update_conexiones');
    };
  }, []);

  const enviarOrden = (actividad) => {
    setActividadActiva(actividad);
    localStorage.setItem('actividad_seleccionada', JSON.stringify(actividad));
    
    socket.emit('redirect_users', { url: actividad.src });
  };

  const resetearTodo = () => {
    localStorage.removeItem('actividad_seleccionada');
    localStorage.removeItem('cola_debate'); 
    setActividadActiva(null);
    socket.emit('clear_cache', {});
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
