import React, { useState } from 'react';
import AdminPanel from './Admin'; // Admin

const AdminGuard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Verifica si ya se logueó previamente
    return localStorage.getItem('admin_session') === 'true';
  });
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Definición de la contraseña
  const ADMIN_PASSWORD = "admin123"; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_session', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    setIsAuthenticated(false);
  };

  // Si no está autenticado, muestra el formulario
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Acceso Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 border rounded-lg outline-none transition-all ${
                  error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-indigo-500'
                }`}
                placeholder="Introducir clave..."
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-1">Contraseña incorrecta</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Entrar al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Si está autenticado, muestra el Panel y un botón de cerrar sesión
  return (
    <>
      <div className="bg-indigo-900 text-white text-right px-4 py-1 text-xs">
        Sesión Administrador activa | 
        <button onClick={handleLogout} className="ml-2 underline hover:text-indigo-200">Cerrar Sesión</button>
      </div>
      <AdminPanel />
    </>
  );
};

export default AdminGuard;
