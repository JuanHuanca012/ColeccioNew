// 1. Importar las librerías
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// 2. Inicializar la aplicación
const app = express();

// --- CAMBIO 1: PUERTO DINÁMICO ---
// Render asigna un puerto en process.env.PORT. Si no existe, usa 5000 (para local).
const PORT = process.env.PORT || 5000;

// --- CAMBIO 2: CONEXIÓN A BASE DE DATOS (NEON vs LOCAL) ---
// Verificamos si existe la variable DATABASE_URL (que pondrás en Render)
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        // Configuración para PRODUCCIÓN (Render + Neon)
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false, // Necesario para conectar con Neon
        },
      }
    : {
        // Configuración para LOCAL (Tu computadora)
        user: 'postgres',
        host: 'localhost',
        database: 'coleccionew',
        password: 'TU_CONTRASEÑA_LOCAL', // Cambia esto si corres el server en tu PC
        port: 5432,
      }
);

// --- Función de Autodiagnóstico ---
async function testDbConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ ¡Conexión a la base de datos exitosa!");
    client.release();
    return true;
  } catch (err) {
    console.error("❌ ERROR FATAL: No se pudo conectar a la base de datos.");
    console.error("Error detallado:", err.message);
    return false;
  }
}

// 4. Middleware
app.use(express.json());
app.use(cors()); // Permite peticiones desde cualquier origen (útil para empezar)

// Configuración para servir las imágenes subidas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Configuración de Multer ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Asegúrate de que esta carpeta exista en tu proyecto
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Limpiamos el nombre del archivo para evitar caracteres raros
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ================= RUTAS DE LA API =================

// 5. Rutas de Usuarios
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre_usuario, email, password } = req.body;
    
    // NOTA: Recuerda implementar encriptación (bcrypt) en el futuro
    const nuevoUsuarioQuery = `
      INSERT INTO usuarios (nombre_usuario, email, contraseña) 
      VALUES ($1, $2, $3) 
      RETURNING id_usuario, nombre_usuario, email;
    `;
    const nuevoUsuarioResult = await pool.query(nuevoUsuarioQuery, [nombre_usuario, email, password]);
    const usuarioCreado = nuevoUsuarioResult.rows[0];
    
    const nuevaColeccionQuery = `
      INSERT INTO colecciones (nombre, id_usuario_fk)
      VALUES ($1, $2)
      RETURNING id_coleccion;
    `;
    await pool.query(nuevaColeccionQuery, [`Colección de ${usuarioCreado.nombre_usuario}`, usuarioCreado.id_usuario]);
    
    res.status(201).json({
      message: 'Usuario y colección principal creados exitosamente',
      usuario: usuarioCreado
    });
  } catch (err) {
    console.error("--- ERROR EN REGISTRO ---", err);
    res.status(500).send('Error en el servidor al registrar');
  }
});

app.post('/api/login', async (req, res) => {
    console.log("Petición recibida en /api/login");
    try {
        const { email, password } = req.body;
        const usuarioQuery = "SELECT * FROM usuarios WHERE email = $1";
        const usuarioResult = await pool.query(usuarioQuery, [email]);

        if (usuarioResult.rows.length === 0) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }
        const usuario = usuarioResult.rows[0];

        // Comparación de texto plano (Implementar bcrypt luego)
        if (password !== usuario.contraseña) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }

        const coleccionQuery = "SELECT id_coleccion FROM colecciones WHERE id_usuario_fk = $1";
        const coleccionResult = await pool.query(coleccionQuery, [usuario.id_usuario]);
        const id_coleccion = coleccionResult.rows[0]?.id_coleccion; 

        res.status(200).json({
            message: "Inicio de sesión exitoso",
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre_usuario: usuario.nombre_usuario,
                email: usuario.email,
                id_coleccion: id_coleccion,
                fecha_registro: usuario.fecha_registro 
            }
        });
    } catch (err) {
        console.error("--- ERROR EN LOGIN ---", err);
        res.status(500).send("Error en el servidor al iniciar sesión");
    }
});

// 6. Rutas de Catálogos
app.post('/api/catalogos', async (req, res) => {
  try {
    const { nombre, descripcion, id_coleccion_fk } = req.body;
    const nuevoCatalogoQuery = `
            INSERT INTO catalogos (nombre, descripcion, id_coleccion_fk)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
    const nuevoCatalogoResult = await pool.query(nuevoCatalogoQuery, [nombre, descripcion, id_coleccion_fk]);
    res.status(201).json({
      message: "Catálogo creado exitosamente",
      catalogo: nuevoCatalogoResult.rows[0]
    });
  } catch (err) {
    console.error("Error al crear catálogo", err);
    res.status(500).send("Error interno");
  }
});

app.get('/api/catalogos/:id_coleccion', async (req, res) => {
  try {
    const { id_coleccion } = req.params;
    const obtenerCatalogosQuery = `SELECT * FROM catalogos WHERE id_coleccion_fk = $1;`;
    const resultado = await pool.query(obtenerCatalogosQuery, [id_coleccion]);
    res.status(200).json(resultado.rows);
  } catch (err) {
    console.error("Error al obtener catálogos", err);
    res.status(500).send("Error interno");
  }
});

// 7. Rutas de Objetos
app.post('/api/objetos', async (req, res) => {
  try {
    const { nombre, tipo, anio, precio, estado, notas, id_catalogo_fk, fotoUrl } = req.body;
    const nuevoObjetoQuery = `
            INSERT INTO objetos (nombre, tipo, anio, precio, estado, notas, id_catalogo_fk)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
    const result = await pool.query(nuevoObjetoQuery, [nombre, tipo, anio, precio, estado, notas, id_catalogo_fk]);
    const objetoCreado = result.rows[0];

    if (fotoUrl) {
      const nuevaFotoQuery = `INSERT INTO fotos (url, es_principal, id_objeto_fk) VALUES ($1, $2, $3)`;
      await pool.query(nuevaFotoQuery, [fotoUrl, true, objetoCreado.id_objeto]);
    }
    res.status(201).json({ message: "Objeto agregado", objeto: objetoCreado });
  } catch (err) {
    console.error("Error al agregar objeto", err);
    res.status(500).send("Error interno");
  }
});

app.get('/api/objetos/:id_catalogo', async (req, res) => {
    try {
        const { id_catalogo } = req.params;
        const query = `
            SELECT o.*, f.url as foto_url
            FROM objetos o
            LEFT JOIN fotos f ON o.id_objeto = f.id_objeto_fk AND f.es_principal = true
            WHERE o.id_catalogo_fk = $1;
        `;
        const resultado = await pool.query(query, [id_catalogo]);
        res.status(200).json(resultado.rows);
    } catch (err) {
        console.error("Error al obtener objetos", err);
        res.status(500).send("Error interno");
    }
});

app.put('/api/objetos/:id_objeto', async (req, res) => {
  try {
    const { id_objeto } = req.params;
    const { nombre, tipo, anio, precio, estado, notas, id_catalogo_fk } = req.body;
    const query = `
            UPDATE objetos
            SET nombre = $1, tipo = $2, anio = $3, precio = $4, estado = $5, notas = $6, id_catalogo_fk = $7
            WHERE id_objeto = $8
            RETURNING *; 
        `;
    const resultado = await pool.query(query, [nombre, tipo, anio, precio, estado, notas, id_catalogo_fk, id_objeto]);
    if (resultado.rows.length === 0) return res.status(404).json({ message: "Objeto no encontrado" });
    
    res.status(200).json({ message: "Objeto modificado", objeto: resultado.rows[0] });
  } catch (err) {
    console.error("Error al modificar objeto", err);
    res.status(500).send("Error interno");
  }
});

app.delete('/api/objetos/:id_objeto', async (req, res) => {
  try {
    const { id_objeto } = req.params;
    await pool.query("DELETE FROM fotos WHERE id_objeto_fk = $1", [id_objeto]);
    const resultado = await pool.query("DELETE FROM objetos WHERE id_objeto = $1 RETURNING *;", [id_objeto]);
    
    if (resultado.rows.length === 0) return res.status(404).json({ message: "Objeto no encontrado" });
    
    res.status(200).json({ message: "Objeto eliminado", objeto_eliminado: resultado.rows[0] });
  } catch (err) {
    console.error("Error al eliminar objeto", err);
    res.status(500).send("Error interno");
  }
});

// --- CAMBIO 3: RUTA DE UPLOAD CON URL DINÁMICA ---
app.post('/api/upload', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se subió ningún archivo.');
  }
  
  // Detecta automáticamente si es https (Render) o http (localhost) y el dominio correcto
  const protocol = req.protocol; 
  const host = req.get('host'); 
  
  // Construye la URL completa dinámicamente
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  
  // NOTA IMPORTANTE: En Render (plan gratuito), los archivos subidos aquí
  // DESAPARECERÁN cada vez que el servidor se reinicie (aprox cada 15-30 min de inactividad).
  // Para un proyecto final, necesitarás usar Cloudinary o Firebase Storage.
  
  res.status(201).json({
    message: "Archivo subido exitosamente",
    url: fileUrl 
  });
});

// 9. Actualizar perfil de usuario
app.put('/api/usuarios/:id_usuario', async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { nombre_usuario, email, currentPassword } = req.body;

    const checkResult = await pool.query("SELECT contraseña FROM usuarios WHERE id_usuario = $1", [id_usuario]);
    if (checkResult.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    if (checkResult.rows[0].contraseña !== currentPassword) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    const result = await pool.query(
      `UPDATE usuarios SET nombre_usuario = $1, email = $2 WHERE id_usuario = $3 RETURNING id_usuario, nombre_usuario, email;`,
      [nombre_usuario, email, id_usuario]
    );

    res.status(200).json({ message: "Perfil actualizado", usuario: result.rows[0] });
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    res.status(500).send("Error interno");
  }
});

// 11. Eliminar Catálogo
app.delete('/api/catalogos/:id_catalogo', async (req, res) => {
  try {
    const { id_catalogo } = req.params;
    const { id_usuario, password } = req.body;

    const checkResult = await pool.query("SELECT contraseña FROM usuarios WHERE id_usuario = $1", [id_usuario]);
    if (checkResult.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    if (checkResult.rows[0].contraseña !== password) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    await pool.query("DELETE FROM fotos WHERE id_objeto_fk IN (SELECT id_objeto FROM objetos WHERE id_catalogo_fk = $1)", [id_catalogo]);
    await pool.query("DELETE FROM objetos WHERE id_catalogo_fk = $1", [id_catalogo]);
    
    const result = await pool.query("DELETE FROM catalogos WHERE id_catalogo = $1 RETURNING *", [id_catalogo]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Catálogo no existe" });

    res.status(200).json({ message: "Catálogo eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar catálogo:", err);
    res.status(500).send("Error interno");
  }
});

// 10. Iniciar servidor
// Quitamos el condicional de testDbConnection para que Render no falle en el startup
// (Render tiene un timeout y si la BD tarda en responder, el deploy falla)
testDbConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });
});