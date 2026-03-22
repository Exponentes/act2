import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const Principal = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Sincronizando con el servidor...');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // --- 1. PERSISTENCIA INICIAL ---
    const savedPath = localStorage.getItem('current_activity_path');
    if (savedPath && savedPath !== '/') {
      navigate(savedPath);
      return;
    }

    // --- 2. CONEXIÓN SOCKET.IO ---
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      setStatus('Conectado al Host. Esperando...');
      socket.emit('join_room', { role: 'viewer' });
    });

    socket.on('redirect', (data) => {
      localStorage.setItem('current_activity_path', data.url);
      navigate(data.url);
    });

    socket.on('clear_cache', () => {
      localStorage.removeItem('current_activity_path');
      window.location.reload();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setStatus('Host no encontrado. Reintentando...');
    });

    return () => {
      socket.off('connect');
      socket.off('redirect');
      socket.off('clear_cache');
      socket.off('disconnect');
    };
  }, [navigate]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center transition-all duration-700 ${connected ? 'bg-indigo-600' : 'bg-slate-900'}`}>
      <div className="relative mb-10">
        <div className={`w-24 h-24 border-8 rounded-full animate-spin ${connected ? 'border-white/20 border-t-white' : 'border-slate-800 border-t-indigo-500'}`}></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl">
          {connected ? '🛰️' : '📡'}
        </div>
      </div>

      <h1 className="text-white text-3xl font-black uppercase tracking-tighter mb-2">
        {connected ? 'Sincronizado' : 'Buscando Servidor'}
      </h1>
      
      <p className={`text-sm font-medium ${connected ? 'text-indigo-100' : 'text-slate-500 animate-pulse'}`}>
        {status}
      </p>

      <div className="mt-20 opacity-20">
        <p className="text-[10px] text-white font-bold tracking-[0.4em] uppercase">Status: Socket.io Active</p>
      </div>
    </div>
  );
};

export default Principal;
