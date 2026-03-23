import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

const Leaderboard = () => {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    // Escucha PRINCIPAL del evento dedicado de ranking global
    const handleGlobalRankingUpdate = (listaGlobalOrdenada) => {
      console.log("[DEBUG FRONTEND] Data de 'update_global_ranking' recibida:", listaGlobalOrdenada);
      setRanking(listaGlobalOrdenada || []);
    };

    socket.on('update_global_ranking', handleGlobalRankingUpdate);

    // Escucha del evento original (por si el usuario se conecta a mitad de sala y el backend usa emitLeaderboardAndQueue)
    const handleLeaderboardUpdate = (data) => {
      console.log("[DEBUG FRONTEND] Data de 'leaderboard_update' recibida:", data);
      setRanking(data.leaderboard || []);
    };
    
    socket.on('leaderboard_update', handleLeaderboardUpdate);

    return () => {
      socket.off('update_global_ranking', handleGlobalRankingUpdate);
      socket.off('leaderboard_update', handleLeaderboardUpdate);
    };
  }, []);

  if (ranking.length === 0) return null;

  // Renderizador dinámico de estrellas iterando según el score
  const renderStars = (score) => {
    const totalStars = Math.round(score); // Redondeo (ej. 4.7 => 5 estrellas)
    if (totalStars <= 0) return <span className="text-slate-600 text-[10px] mt-1 italic">Sin puntos</span>;

    return (
      <div className="flex gap-[2px] mt-1 text-sm drop-shadow-md">
        {Array.from({ length: totalStars }).map((_, i) => (
          <span key={i} className="text-yellow-400 animate-in zoom-in duration-300 transition-all delay-75">★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl mt-8 animate-in slide-in-from-bottom duration-500">
      <div className="bg-slate-900/40 p-5 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
          🏆 Ranking Global
        </h2>
        <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full animate-pulse shadow-lg shadow-indigo-500/20">
          En Vivo
        </span>
      </div>

      <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
        {ranking.map((user, index) => {
          const isFirst = index === 0;
          const bgClass = isFirst ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10';
          const medal = index === 0 ? '👑' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));

          return (
            <div key={user.nombre} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${bgClass}`}>
              <div className="flex items-center gap-4">
                <span className={`w-8 text-center text-xl font-black ${isFirst ? 'text-yellow-500' : 'text-slate-500'}`}>
                  {medal}
                </span>
                <span className={`font-bold text-base uppercase truncate max-w-[150px] ${isFirst ? 'text-yellow-400' : 'text-slate-300'}`}>
                  {user.nombre}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`font-black text-sm px-3 py-1 rounded-lg ${isFirst ? 'bg-yellow-500 text-yellow-900' : 'bg-white/10 text-indigo-300'}`}>
                  {user.score.toFixed(1)} pts
                </span>
                {renderStars(user.score)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
