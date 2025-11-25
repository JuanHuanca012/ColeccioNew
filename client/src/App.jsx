import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './components/LoginPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import CatalogoDetailPage from './components/CatalogoDetailPage.jsx'
import RegistroPage from './components/RegistroPage.jsx'
import ProfilePage from './components/ProfilePage.jsx'


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ProfilePage" element={<ProfilePage />} />
        <Route path="/catalogo/:idCatalogo" element={<CatalogoDetailPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
