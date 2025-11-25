import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProfilePage.css'; // <--- Importamos los estilos aquí

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Datos simulados para estadísticas
  const stats = {
    itemsCount: 12,
    favorites: 5
  };

  const [formData, setFormData] = useState({
    nombre_usuario: '',
    email: '',
    currentPassword: ''
  });

  // --- FUNCIÓN DE FECHA: FORMATO LARGO ---
  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Fecha desconocida';
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  useEffect(() => {
    const rawUser = localStorage.getItem('usuario');
    if (!rawUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(rawUser);
    setUser(parsedUser);
    
    setFormData({
      nombre_usuario: parsedUser.nombre_usuario || '',
      email: parsedUser.email || '',
      currentPassword: ''
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const handleBack = () => navigate('/dashboard');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.currentPassword) {
      alert("Por seguridad, ingresa tu contraseña actual.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`http://localhost:5000/api/usuarios/${user.id_usuario}`, formData);
      
      const updatedUser = { ...user, ...response.data.usuario };
      
      localStorage.setItem('usuario', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData(prev => ({ ...prev, currentPassword: '' }));
      setIsEditing(false);
      alert('Perfil actualizado correctamente.');
    } catch (error) {
      console.error('Error:', error);
      if (error.response && error.response.status === 401) {
        alert("Error: La contraseña es incorrecta.");
      } else {
        alert('Error al conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-wrapper">
      <div className="dashboard-container2">
        
        {/* === IZQUIERDA: PERFIL === */}
        <div className="left-column">
          <div className="back-btn" onClick={handleBack}>
             <span>←</span> Volver al Dashboard
          </div>
          
          <div className="profile-card">
            <div className="banner"></div>
            <div className="avatar-section">
              <div className="avatar">
                {user.nombre_usuario ? user.nombre_usuario.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div className="user-meta">
              <h2 className="user-name">{user.nombre_usuario}</h2>
              <p className="user-email">{user.email}</p>
              <span className="user-badge">Coleccionista</span>
              
              <div style={{marginTop: '25px'}}>
                <button className="btn btn-danger" style={{width: '100%'}} onClick={handleLogout}>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* === DERECHA: CONTENIDO === */}
        <div className="content-area">
          
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.itemsCount}</span>
              <span className="stat-label">Coleccionables</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.favorites}</span>
              <span className="stat-label">Favoritos</span>
            </div>
            <div className="stat-card">
              <span className="stat-number" style={{fontSize: '1.4rem'}}>
                {user.id_coleccion ? `#${user.id_coleccion}` : '--'}
              </span>
              <span className="stat-label">ID Colección</span>
            </div>
          </div>

          {/* Detalles */}
          <div className="details-card">
            <div className="section-header">
              <h3 className="section-title">Información de Cuenta</h3>
              {!isEditing && (
                <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                  Editar Datos
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Nombre de Usuario</label>
                  <input
                    type="text"
                    name="nombre_usuario"
                    className="form-input"
                    value={formData.nombre_usuario}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="confirm-box">
                  <label className="form-label" style={{color: '#856404', fontSize: '0.95rem'}}>
                    🔒 Confirmar cambios
                  </label>
                  <p style={{margin: '0 0 10px', fontSize: '0.85rem', color: '#856404'}}>
                    Ingresa tu contraseña actual para guardar.
                  </p>
                  <input
                    type="password"
                    name="currentPassword"
                    placeholder="Tu contraseña actual"
                    className="form-input"
                    style={{borderColor: '#ffeeba'}}
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="info-display">
                <div className="info-row">
                  <span className="label">Nombre</span>
                  <span className="value">{user.nombre_usuario}</span>
                </div>
                <div className="info-row">
                  <span className="label">Correo</span>
                  <span className="value">{user.email}</span>
                </div>
                
                <div className="info-row">
                  <span className="label">Miembro desde</span>
                  <span className="value" style={{ textTransform: 'capitalize' }}>
                    {formatearFecha(user.fecha_registro || user.created_at)}
                  </span>
                </div>
                
                <div className="info-row">
                  <span className="label">Estado</span>
                  <span className="value" style={{color: 'var(--primary)', fontWeight:'bold'}}>
                    ● Cuenta Activa
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}