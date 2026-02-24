import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './index.css'
import Principal from '/src/view/Principal.jsx';
import AdminGuard from '/src/view/AdminGuard.jsx';

// Importamos las sesiones
import UserDebate from '/src/view/sessions/debate/UserDebate';
import AdminDebate from '/src/view/sessions/debate/AdminDebate';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas Base */}
        <Route path='/' element={<Principal />} />
        <Route path='/host' element={<AdminGuard />} />

        {/* Rutas de la Actividad: Debate */}
        <Route path='/actividades/debate' element={<UserDebate />} />
        <Route path='/actividades/debate/admin' element={<AdminDebate />} />
      </Routes>
    </Router>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
