import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [catalogos, setCatalogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoCatalogoNombre, setNuevoCatalogoNombre] = useState('');
  const [formError, setFormError] = useState('');

  // --- ESTADOS PARA EL MODAL DE ELIMINAR ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [catalogToDelete, setCatalogToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCatalogos = useCallback(async (idColeccion) => {
    try {
      setLoading(true);
      const response = await axios.get(`https://coleccionew.onrender.com/api/catalogos/${idColeccion}`);
      setCatalogos(response.data || []);
    } catch (error) {
      console.error("Error al obtener catálogos:", error);
      setCatalogos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('usuario');
    if (!raw) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(raw);
      setUsuario(parsedUser);

      if (parsedUser.id_coleccion) {
        fetchCatalogos(parsedUser.id_coleccion);
      } else {
        console.error("No se encontró id_coleccion");
        setLoading(false);
      }
    } catch {
      localStorage.removeItem('usuario');
      navigate('/login');
    }
  }, [navigate, fetchCatalogos]);

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };
  
  const handleProfile = () => {
    navigate('/ProfilePage');
  };

  const handleCrearCatalogo = async (event) => {
    event.preventDefault();
    setFormError('');

    const nombreTrim = (nuevoCatalogoNombre || '').trim();
    if (!nombreTrim) {
      setFormError('El nombre del catálogo no puede estar vacío.');
      return;
    }

    try {
      await axios.post('https://coleccionew.onrender.com/api/catalogos', {
        nombre: nombreTrim,
        descripcion: '',
        id_coleccion_fk: usuario.id_coleccion
      });

      setNuevoCatalogoNombre('');
      fetchCatalogos(usuario.id_coleccion);
    } catch (error) {
      console.error("Error al crear el catálogo:", error);
      setFormError('No se pudo crear el catálogo. Inténtalo de nuevo.');
    }
  };

  const handleOpenCatalogo = useCallback((catalogo) => {
    const id = catalogo.id_catalogo ?? catalogo.id ?? catalogo._id;
    if (!id) return;
    navigate(`/catalogo/${id}`);
  }, [navigate]);

  const handleKeyOpen = (e, catalogo) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenCatalogo(catalogo);
    }
  };

  // --- LÓGICA DE ELIMINACIÓN ---
  const promptDelete = (e, catalogo) => {
    e.stopPropagation(); // ¡IMPORTANTE! Evita que se abra el catálogo al hacer click en borrar
    setCatalogToDelete(catalogo);
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCatalogToDelete(null);
    setDeletePassword('');
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    if (!deletePassword) return alert("Ingresa tu contraseña");
    
    setDeleteLoading(true);
    const id = catalogToDelete.id_catalogo ?? catalogToDelete.id ?? catalogToDelete._id;

    try {
      // En axios.delete, el body va dentro de la propiedad "data"
      await axios.delete(`https://coleccionew.onrender.com/api/catalogos/${id}`, {
        data: {
          id_usuario: usuario.id_usuario,
          password: deletePassword
        }
      });

      // Si sale bien:
      alert("Catálogo eliminado correctamente.");
      setShowDeleteModal(false);
      fetchCatalogos(usuario.id_coleccion); // Recargar lista

    } catch (error) {
      console.error("Error al eliminar:", error);
      if (error.response && error.response.status === 401) {
        alert("Contraseña incorrecta.");
      } else {
        alert("Ocurrió un error al eliminar el catálogo.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">ColeccioNew</h1>
        <div className="dashboard-username">
          <button className="logout-btn" onClick={handleLogout}>Cerrar sesión</button>
          <button className="Profile-btn" onClick={handleProfile}>Perfil</button>
        </div>
      </header>

      <main>
        {usuario ? (
          <>
            <h2 className="dashboard-welcome">
              Bienvenido, {usuario.nombre_usuario || usuario.email} 🎉
            </h2>
            <p className="dashboard-description">Gestiona tus catálogos.</p>

            <section className="form-container">
              <h3 className="form-title">Crear Nuevo Catálogo</h3>
              <form onSubmit={handleCrearCatalogo} className="form-grid">
                <div className="form-field">
                  <label className="form-label">Nombre del catálogo</label>
                  <input
                    type="text"
                    placeholder="Ej: Juegos PS2"
                    className="form-input"
                    value={nuevoCatalogoNombre}
                    onChange={(e) => setNuevoCatalogoNombre(e.target.value)}
                  />
                </div>
                <button type="submit" className="form-button">Crear</button>
              </form>
              {formError && <p className="form-error">{formError}</p>}
            </section>

            <section className="catalog-section">
              <h3 className="catalog-title">Mis Catálogos</h3>
              {loading ? (
                <p className="loading-text">Cargando catálogos...</p>
              ) : (
                <ul className="catalogo-list">
                  {catalogos.length > 0 ? (
                    catalogos.map(catalogo => (
                      <li
                        key={catalogo.id_catalogo ?? catalogo.id ?? catalogo._id}
                        className="catalogo-item"
                        onClick={() => handleOpenCatalogo(catalogo)}
                      >
                        <div className="catalogo-content">
                          <strong className="catalogo-nombre">{catalogo.nombre}</strong>
                          {catalogo.descripcion && (
                            <p className="catalogo-descripcion">{catalogo.descripcion}</p>
                          )}
                        </div>
                        
                        {/* BOTÓN DE ELIMINAR */}
                        <button 
                          className="delete-catalog-btn" 
                          onClick={(e) => promptDelete(e, catalogo)}
                          title="Eliminar catálogo"
                        >
                          🗑️
                        </button>
                      </li>
                    ))
                  ) : (
                    <p className="no-catalogos">No tienes catálogos.</p>
                  )}
                </ul>
              )}
            </section>
          </>
        ) : (
          <p className="loading-text">Cargando perfil...</p>
        )}
      </main>

      {/* --- MODAL DE CONFIRMACIÓN --- */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Eliminar Catálogo</h3>
            <p>
              Estás a punto de eliminar <strong>"{catalogToDelete?.nombre}"</strong>. 
              Esto borrará también todos los objetos que contiene.
            </p>
            <p className="modal-warning">⚠️ Esta acción no se puede deshacer.</p>
            
            <form onSubmit={confirmDelete}>
              <label style={{display:'block', marginBottom:'8px', fontSize:'0.9rem'}}>
                Confirma tu contraseña:
              </label>
              <input 
                type="password" 
                className="form-input" 
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
                required
              />
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={cancelDelete}>Cancelar</button>
                <button type="submit" className="btn-confirm-delete" disabled={deleteLoading}>
                  {deleteLoading ? 'Eliminando...' : 'Eliminar Definitivamente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}