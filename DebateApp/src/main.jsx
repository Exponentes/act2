import React from 'react'
import ReactDOM from 'react-dom/client'
import Principal from '/src/view/Principal.jsx';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        
        <Route path='/' element={<Principal />} />
      
      </Routes>
    </Router>
  )
}

// Render
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
