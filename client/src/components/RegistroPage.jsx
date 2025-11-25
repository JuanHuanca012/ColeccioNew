import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // Para el enlace a Login y para redirigir
import './LoginPage.css'; // ¡Importante! Reutilizamos los mismos estilos del Login

export default function RegistroPage() {
  const navigate = useNavigate(); // Hook para redirigir al usuario
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Llamamos a nuestra API de registro (POST /api/registro)
      const response = await axios.post(
        'http://localhost:5000/api/registro',
        { 
          nombre_usuario: nombreUsuario,
          email: email, 
          password: password 
        }
      );

      // Si tiene éxito, mostramos un mensaje y redirigimos al Login
      setSuccessMessage(response.data.message + " ¡Ahora puedes iniciar sesión!");
      
      // Limpiamos el formulario
      setNombreUsuario('');
      setEmail('');
      setPassword('');

      // Esperamos 2 segundos antes de redirigir para que el usuario lea el mensaje
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Error de registro:', err);
      // Manejamos los errores que nos envía el backend
      let serverMsg = err.response?.data?.message || err.response?.data || err.message || 'Error en el servidor';
      
      // Intentamos detectar si el error es por un usuario o email duplicado
      // Asumimos que el error del backend es el que pusimos (sin encriptación)
      if (typeof serverMsg === 'object' && serverMsg.constraint === 'usuarios_email_key') {
          serverMsg = 'El correo electrónico ya está registrado.';
      } else if (typeof serverMsg === 'object' && serverMsg.constraint === 'usuarios_nombre_usuario_key') {
          serverMsg = 'El nombre de usuario ya está en uso.';
      }

      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      <header className="main-header">
        <h2 className="brand">
          Coleccio <span>New</span>
        </h2>
      </header>

      <div className="login-container">
        <h1 id="form-title">Crear Cuenta</h1>
        <p id="form-subtitle">Registrate para empezar a coleccionar</p>

        <form id="registroForm" onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            id="nombre_usuario"
            placeholder="Nombre de Usuario"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            required
            className="login-input"
            aria-label="Nombre de Usuario"
          />
          
          <input
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
            aria-label="Email"
          />

          <input
            type="password"
            id="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
            aria-label="Contraseña"
          />

          <button
            type="submit"
            id="mainBtn"
            className="primary-btn" // Reutilizamos la clase
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        {/* Mensaje de error */}
        <p id="error-message" className="error-message" role="alert" aria-live="polite">
          {errorMessage}
        </p>

        {/* Mensaje de éxito */}
        {successMessage && (
            <p className="success-message" style={{color: 'green', fontSize: '14px', marginTop: '1rem', textAlign: 'center'}}>
                {successMessage}
            </p>
        )}

        {/* Enlace para volver al Login */}
        <p className="register-prompt">
          ¿Ya tenés una cuenta?{" "}
          <Link to="/login" className="register-link">
            Inicia sesión acá
          </Link>
        </p>

      </div>
    </div>
  );
}