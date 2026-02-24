import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Peer } from 'peerjs';

const Principal = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Sincronizando con el servidor...');
  const [connected, setConnected] = useState(false);
  const peerRef = useRef(null);

  useEffect(() => {
    // --- 1. PERSISTENCIA INICIAL ---
    // Si el usuario refresca y ya estaba en una actividad, lo mandamos de vuelta
    const savedPath = localStorage.getItem('current_activity_path');
    if (savedPath && savedPath !== '/') {
      navigate(savedPath);
      return;
    }

    // --- 2. CONEXIÓN P2P ---
    peerRef.current = new Peer();

    peerRef.current.on('open', (id) => {
      setStatus('Buscando señal del host...');
      conectarAlAdmin();
    });

    const conectarAlAdmin = () => {
      const conn = peerRef.current.connect('sala-debate-unica-123', { reliable: true });

      conn.on('open', () => {
        setConnected(true);
        setStatus('Conectado. Esperando instrucciones...');
      });

      conn.on('data', (data) => {
        // Recibir orden de navegación
        if (data.action === 'REDIRECT') {
          localStorage.setItem('current_activity_path', data.url);
          navigate(data.url);
        }
        // Recibir orden de reset
        if (data.action === 'CLEAR_CACHE') {
          localStorage.removeItem('current_activity_path');
          window.location.reload();
        }
      });

      conn.on('error', (err) => {
        setConnected(false);
        setStatus('Host no encontrado. Reintentando...');
        setTimeout(conectarAlAdmin, 5000);
      });
      
      conn.on('close', () => {
        setConnected(false);
        setTimeout(conectarAlAdmin, 3000);
      });
    };

    return () => peerRef.current?.destroy();
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
        {connected ? 'Sincronizado' : 'Buscando Host'}
      </h1>
      
      <p className={`text-sm font-medium ${connected ? 'text-indigo-100' : 'text-slate-500 animate-pulse'}`}>
        {status}
      </p>

      <div className="mt-20 opacity-20">
        <p className="text-[10px] text-white font-bold tracking-[0.4em] uppercase">Status: P2P Active</p>
      </div>
    </div>
  );
};

export default Principal;
