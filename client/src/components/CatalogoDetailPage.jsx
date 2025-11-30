import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "./CatalogoDetailPage.css";

export default function CatalogoDetailPage() {
  const { idCatalogo } = useParams();

  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingObjeto, setEditingObjeto] = useState(null);

  // Formulario -------------------------------------
  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "",
    anio: "",
    precio: "",
    estado: "",
    notas: "",
  });

  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [formError, setFormError] = useState("");

  // ============================================================
  // Cargar objetos del catálogo
  // ============================================================
  const fetchObjetos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `https://coleccionew.onrender.com/api/objetos/${idCatalogo}`
      );
      setObjetos(res.data);
    } catch (error) {
      console.error("Error al obtener objetos:", error);
    } finally {
      setLoading(false);
    }
  }, [idCatalogo]);

  useEffect(() => {
    fetchObjetos();
  }, [fetchObjetos]);

  // ============================================================
  // Manejo de inputs
  // ============================================================
  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFotoChange = (e) => {
    setFotoArchivo(e.target.files[0]);
  };

  // ============================================================
  // Empezar edición
  // ============================================================
  const handleStartEdit = (objeto) => {
    setEditingObjeto(objeto);
    setFormData({
      nombre: objeto.nombre || "",
      tipo: objeto.tipo || "",
      anio: objeto.anio || "",
      precio: objeto.precio || "",
      estado: objeto.estado || "",
      notas: objeto.notas || "",
    });
    setFotoArchivo(null);
    window.scrollTo(0, 0);
  };

  // ============================================================
  // Cancelar edición
  // ============================================================
  const handleCancelEdit = () => {
    setEditingObjeto(null);
    setFormData({
      nombre: "",
      tipo: "",
      anio: "",
      precio: "",
      estado: "",
      notas: "",
    });
    setFotoArchivo(null);
    setFormError("");
  };

  // ============================================================
  // Guardar / Crear Objeto
  // ============================================================
  const handleSubmitObjeto = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.nombre) {
      setFormError("El nombre del objeto es obligatorio.");
      return;
    }

    let fotoUrlParaGuardar = null;

    try {
      // SUBIR FOTO SI SELECCIONÓ UNA
      if (fotoArchivo) {
        const formDataFoto = new FormData();
        formDataFoto.append("foto", fotoArchivo);

        const resFoto = await axios.post(
          "https://coleccionew.onrender.com/api/upload",
          formDataFoto,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        fotoUrlParaGuardar = resFoto.data.url;
      }

      if (editingObjeto && !fotoUrlParaGuardar) {
        fotoUrlParaGuardar = editingObjeto.foto_url;
      }

      const objetoData = {
        nombre: formData.nombre,
        tipo: formData.tipo || null,
        anio: formData.anio ? parseInt(formData.anio) : null,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        estado: formData.estado || null,
        notas: formData.notas || null,
        id_catalogo_fk: parseInt(idCatalogo),
        fotoUrl: fotoUrlParaGuardar,
      };

      if (editingObjeto) {
        await axios.put(
          `https://coleccionew.onrender.com/api/objetos/${editingObjeto.id_objeto}`,
          objetoData
        );
      } else {
        await axios.post("https://coleccionew.onrender.com/api/objetos", objetoData);
      }

      handleCancelEdit();
      fetchObjetos();
    } catch (error) {
      console.error("Error al guardar objeto:", error);
      setFormError("No se pudo guardar el objeto.");
    }
  };

  // ============================================================
  // Eliminar objeto
  // ============================================================
  const handleDeleteObjeto = async (idObjeto) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este objeto? Esta acción no se puede deshacer."
      )
    )
      return;

    try {
      await axios.delete(`https://coleccionew.onrender.com/api/objetos/${idObjeto}`);
      fetchObjetos();
    } catch (error) {
      console.error("Error al eliminar objeto:", error);
    }
  };

  return (
    <div className="catalogo-container">
      {/* Encabezado */}
      <div className="catalogo-header">
        <Link to="/dashboard" className="back-link">
          ← Volver a Mis Catálogos
        </Link>
        <h1 className="catalogo-title">Objetos en Catálogo #{idCatalogo}</h1>
      </div>

      {/* ===================== FORMULARIO ===================== */}
      <div className="objeto-form-container">
        <h3 className="objeto-form-title">
          {editingObjeto ? "Modificar Objeto" : "Agregar Nuevo Objeto"}
        </h3>

        <form onSubmit={handleSubmitObjeto} className="objeto-form-grid">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre del objeto *"
            className="objeto-input"
            value={formData.nombre}
            onChange={handleFormChange}
          />

          <input
            type="text"
            name="tipo"
            placeholder="Tipo (ej: Moneda)"
            className="objeto-input"
            value={formData.tipo}
            onChange={handleFormChange}
          />

          <input
            type="number"
            name="anio"
            placeholder="Año"
            className="objeto-input"
            value={formData.anio}
            onChange={handleFormChange}
          />

          <input
            type="number"
            step="0.01"
            name="precio"
            placeholder="Precio (ej: 5.50)"
            className="objeto-input"
            value={formData.precio}
            onChange={handleFormChange}
          />

          <input
            type="text"
            name="estado"
            placeholder="Estado (ej: Bueno)"
            className="objeto-input"
            value={formData.estado}
            onChange={handleFormChange}
          />

          <textarea
            name="notas"
            placeholder="Notas adicionales..."
            rows="3"
            className="objeto-textarea"
            value={formData.notas}
            onChange={handleFormChange}
          />

          {!editingObjeto && (
            <input
              type="file"
              className="objeto-file"
              onChange={handleFotoChange}
            />
          )}

          <button className="objeto-btn">
            {editingObjeto ? "Guardar Cambios" : "Agregar Objeto"}
          </button>

          {editingObjeto && (
            <button
              type="button"
              className="objeto-btn cancel-btn"
              onClick={handleCancelEdit}
            >
              Cancelar edición
            </button>
          )}

          {formError && <p className="form-error">{formError}</p>}
        </form>
      </div>

      {/* ===================== LISTA ===================== */}
      <h3 className="objeto-form-title">Mis Objetos</h3>

      {loading ? (
        <p className="loading-text">Cargando objetos...</p>
      ) : objetos.length === 0 ? (
        <p className="no-objetos">
          No tienes ningún objeto en este catálogo. ¡Crea uno!
        </p>
      ) : (
        <ul className="objeto-list">
          {objetos.map((objeto) => (
            <li key={objeto.id_objeto} className="objeto-item">
              {objeto.foto_url ? (
                <img
                  src={objeto.foto_url}
                  alt={objeto.nombre}
                  className="objeto-img"
                />
              ) : (
                <div className="objeto-img"></div>
              )}

              <div className="objeto-content">
                <div className="objeto-nombre">{objeto.nombre}</div>
                <div className="objeto-tipo">{objeto.tipo || "Sin tipo"}</div>

                <div className="objeto-detalles">
                  Año: {objeto.anio || "N/A"} | Estado:{" "}
                  {objeto.estado || "N/A"} | Precio: ${objeto.precio || "0.00"}
                </div>

                {objeto.notas && (
                  <div className="objeto-notas">Notas: {objeto.notas}</div>
                )}

                <div className="objeto-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleStartEdit(objeto)}
                  >
                    Modificar
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteObjeto(objeto.id_objeto)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
