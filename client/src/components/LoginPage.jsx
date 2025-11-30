import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const toggleCard = () => {
    setErrorMessage("");
    setIsFlipped(!isFlipped);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.post("https://coleccionew.onrender.com/api/login", {
        email: formData.email,
        password: formData.password,
      });

      const usuario = res.data?.usuario ?? res.data;
      localStorage.setItem("usuario", JSON.stringify(usuario));
      if (res.data?.token) localStorage.setItem("token", res.data.token);

      navigate("/dashboard");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Error en el servidor");
    } finally {
      setLoading(false);
    }
  };

  // REGISTER
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.post("https://coleccionew.onrender.com/api/registro", {
        nombre_usuario: formData.nombre,
        email: formData.email,
        password: formData.password,
      });

      const usuario = res.data?.usuario ?? res.data;
      localStorage.setItem("usuario", JSON.stringify(usuario));
      if (res.data?.token) localStorage.setItem("token", res.data.token);

      navigate("/dashboard");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Error en el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      <div className="scene">
        <div className={`card ${isFlipped ? "is-flipped" : ""}`}>

          {/* LOGIN */}
          <div className="card-face card-front">
            <h2>
              Iniciar sesión en <span>ColeccioNew</span>
            </h2>
            <p>Ingresá tus datos para continuar</p>

            <form onSubmit={handleLogin} className="form">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button className="btn" disabled={loading}>
                {loading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>

            <p>
              ¿No tenés cuenta?{" "}
              <span className="toggle-link" onClick={toggleCard}>
                Registrate
              </span>
            </p>

            <p className="error-message">{errorMessage}</p>
          </div>

          {/* REGISTER */}
          <div className="card-face card-back">
            <h2>
              Crear cuenta en <span>ColeccioNew</span>
            </h2>
            <p>Registrate para empezar</p>

            <form onSubmit={handleRegister} className="form">
              <input
                type="text"
                name="nombre"
                placeholder="Nombre completo"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button className="btn" disabled={loading}>
                {loading ? "Registrando..." : "Registrarse"}
              </button>
            </form>

            <p>
              ¿Ya tenés cuenta?{" "}
              <span className="toggle-link" onClick={toggleCard}>
                Iniciá sesión
              </span>
            </p>

            <p className="error-message">{errorMessage}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
