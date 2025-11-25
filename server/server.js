// 1. Importar las librerías
const express = require('express');
const { Pool } = require('pg');
// const bcrypt = require('bcrypt'); // <-- ¡ELIMINADO!
const cors = require('cors');
const multer = require('multer'); 
const path = require('path');     

// 2. Inicializar la aplicación
const app = express();
const PORT = 5000;

// 3. Configurar la conexión a la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'coleccionew',
  password: '12345678', // ¡RECUERDA PONER TU CONTRASEÑA REAL AQUÍ!
  port: 5432,
});

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
app.use(cors()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- Configuración de Multer ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });


// 5. Rutas de la API (Usuarios)
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre_usuario, email, password } = req.body;
    
    // --- SIN BCRYPT ---
    // Usamos la columna "contraseña" y guardamos el password en texto plano
    const nuevoUsuarioQuery = `
      INSERT INTO usuarios (nombre_usuario, email, contraseña) 
      VALUES ($1, $2, $3) 
      RETURNING id_usuario, nombre_usuario, email;
    `;
    // Pasamos el password directamente
    const nuevoUsuarioResult = await pool.query(nuevoUsuarioQuery, [nombre_usuario, email, password]);
    const usuarioCreado = nuevoUsuarioResult.rows[0];
    
    // Creamos su colección principal
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
    console.error("--- ERROR DETALLADO EN REGISTRO ---", err);
    res.status(500).send('Error en el servidor al registrar');
  }
});

app.post('/api/login', async (req, res) => {
    console.log("Petición recibida en /api/login");
    try {
        const { email, password } = req.body;

        // 1. Buscar al usuario
        const usuarioQuery = "SELECT * FROM usuarios WHERE email = $1";
        const usuarioResult = await pool.query(usuarioQuery, [email]);

        if (usuarioResult.rows.length === 0) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }
        const usuario = usuarioResult.rows[0];

        // 2. Comparar la contraseña
        // --- SIN BCRYPT --- Comparamos el texto plano directamente
        const esValida = (password === usuario.contraseña); 
        if (!esValida) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }

        // 3. Buscar la colección del usuario
        const coleccionQuery = "SELECT id_coleccion FROM colecciones WHERE id_usuario_fk = $1";
        const coleccionResult = await pool.query(coleccionQuery, [usuario.id_usuario]);
        
        const id_coleccion = coleccionResult.rows[0]?.id_coleccion; 

        // 4. Enviar respuesta exitosa
       
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
        console.error("--- ERROR DETALLADO EN LOGIN ---", err);
        res.status(500).send("Error en el servidor al iniciar sesión");
    }
});


// 6. Rutas de la API (Catálogos)
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
    console.error("--- ERROR DETALLADO AL CREAR CATÁLOGO ---", err);
    res.status(500).send("Error en el servidor al crear el catálogo");
  }
});

app.get('/api/catalogos/:id_coleccion', async (req, res) => {
  try {
    const { id_coleccion } = req.params;
    const obtenerCatalogosQuery = `
            SELECT * FROM catalogos WHERE id_coleccion_fk = $1;
        `;
    const resultado = await pool.query(obtenerCatalogosQuery, [id_coleccion]);
    res.status(200).json(resultado.rows);
  } catch (err) {
    console.error("--- ERROR DETALLADO AL OBTENER CATÁLOGOS ---", err);
    res.status(500).send("Error en el servidor al obtener los catálogos");
  }
});


// 7. Rutas de la API (Objetos)
app.post('/api/objetos', async (req, res) => {
  console.log("Petición recibida en /api/objetos");
  try {
    const { nombre, tipo, anio, precio, estado, notas, id_catalogo_fk, fotoUrl } = req.body;
    const nuevoObjetoQuery = `
            INSERT INTO objetos (nombre, tipo, anio, precio, estado, notas, id_catalogo_fk)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
    const nuevoObjetoResult = await pool.query(nuevoObjetoQuery, [nombre, tipo, anio, precio, estado, notas, id_catalogo_fk]);
    const objetoCreado = nuevoObjetoResult.rows[0];
    if (fotoUrl) {
      console.log(`Guardando foto ${fotoUrl} para el objeto ID: ${objetoCreado.id_objeto}`);
      const nuevaFotoQuery = `
        INSERT INTO fotos (url, es_principal, id_objeto_fk)
        VALUES ($1, $2, $3);
      `;
      await pool.query(nuevaFotoQuery, [fotoUrl, true, objetoCreado.id_objeto]);
    }
    res.status(201).json({
      message: "Objeto y foto agregados exitosamente",
      objeto: objetoCreado
    });
  } catch (err) {
    console.error("--- ERROR DETALLADO AL AGREGAR OBJETO ---", err);
    console.error(err);
    res.status(500).send("Error en el servidor al agregar el objeto");
  }
});

app.get('/api/objetos/:id_catalogo', async (req, res) => {
    console.log("Petición GET recibida en /api/objetos/:id_catalogo");
    try {
        const { id_catalogo } = req.params;
        
        const obtenerObjetosQuery = `
            SELECT o.*, f.url as foto_url
            FROM objetos o
            LEFT JOIN fotos f ON o.id_objeto = f.id_objeto_fk AND f.es_principal = true
            WHERE o.id_catalogo_fk = $1;
        `;

        const resultado = await pool.query(obtenerObjetosQuery, [id_catalogo]);
        
        res.status(200).json(resultado.rows);

    } catch (err) {
        console.error("--- ERROR DETALLADO AL OBTENER OBJETOS ---", err);
        console.error(err);
        res.status(500).send("Error en el servidor al obtener los objetos");
    }
});

app.put('/api/objetos/:id_objeto', async (req, res) => {
  try {
    const { id_objeto } = req.params;
    const { nombre, tipo, anio, precio, estado, notas, id_catalogo_fk } = req.body;
    const modificarObjetoQuery = `
            UPDATE objetos
            SET nombre = $1, tipo = $2, anio = $3, precio = $4, estado = $5, notas = $6, id_catalogo_fk = $7
            WHERE id_objeto = $8
            RETURNING *; 
        `;
    const resultado = await pool.query(modificarObjetoQuery, [nombre, tipo, anio, precio, estado, notas, id_catalogo_fk, id_objeto]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Objeto no encontrado" });
    }
    res.status(200).json({
      message: "Objeto modificado exitosamente",
      objeto: resultado.rows[0]
    });
  } catch (err) {
    console.error("--- ERROR DETALLADO AL MODIFICAR OBJETO ---", err);
    res.status(500).send("Error en el servidor al modificar el objeto");
  }
});

app.delete('/api/objetos/:id_objeto', async (req, res) => {
  try {
    const { id_objeto } = req.params;
    const eliminarFotosQuery = "DELETE FROM fotos WHERE id_objeto_fk = $1";
    await pool.query(eliminarFotosQuery, [id_objeto]);
    console.log(`Fotos asociadas al objeto ${id_objeto} eliminadas (si existían).`);
    const eliminarObjetoQuery = "DELETE FROM objetos WHERE id_objeto = $1 RETURNING *;";
    const resultado = await pool.query(eliminarObjetoQuery, [id_objeto]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Objeto no encontrado" });
    }
    res.status(200).json({
      message: "Objeto eliminado exitosamente",
      objeto_eliminado: resultado.rows[0]
    });
  } catch (err) {
    console.error("--- ERROR DETALLADO AL ELIMINAR OBJETO ---", err);
    res.status(500).send("Error en el servidor al eliminar el objeto");
  }
});


// 8. RUTA DE API PARA SUBIR FOTOS
app.post('/api/upload', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se subió ningún archivo.');
  }
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.status(201).json({
    message: "Archivo subido exitosamente",
    url: fileUrl 
  });
});


// 9. RUTA DE API PARA ACTUALIZAR PERFIL DE USUARIO (CON CONFIRMACIÓN DE PASSWORD)
app.put('/api/usuarios/:id_usuario', async (req, res) => {
  console.log(`📡 Recibida petición PUT para usuario ID: ${req.params.id_usuario}`);
  
  try {
    const { id_usuario } = req.params;
    // Recibimos también el 'currentPassword' para verificar
    const { nombre_usuario, email, currentPassword } = req.body;

    // 1. Primero buscamos al usuario para verificar la contraseña
    const checkQuery = "SELECT contraseña FROM usuarios WHERE id_usuario = $1";
    const checkResult = await pool.query(checkQuery, [id_usuario]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuarioDb = checkResult.rows[0];

    // 2. Comparamos la contraseña (Recuerda: actualmente usas texto plano)
    if (usuarioDb.contraseña !== currentPassword) {
      return res.status(401).json({ message: "La contraseña es incorrecta. No se aplicaron cambios." });
    }

    // 3. Si la contraseña es correcta, procedemos a actualizar
    const updateQuery = `
      UPDATE usuarios
      SET nombre_usuario = $1, email = $2
      WHERE id_usuario = $3
      RETURNING id_usuario, nombre_usuario, email;
    `;
    
    const result = await pool.query(updateQuery, [nombre_usuario, email, id_usuario]);

    console.log("✅ Usuario actualizado correctamente.");

    res.status(200).json({
      message: "Perfil actualizado exitosamente",
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error("❌ ERROR AL ACTUALIZAR USUARIO:", err);
    res.status(500).send("Error en el servidor al actualizar perfil");
  }
});
// 10. --- Iniciar el servidor SOLO si la conexión a la BD es exitosa ---
async function startServer() {
  if (await testDbConnection()) {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });
  } else {
    console.log("🔴 El servidor no se iniciará debido al error de conexión.");
  }
}
// 11. RUTA PARA ELIMINAR CATÁLOGO (CON PASSWORD)
app.delete('/api/catalogos/:id_catalogo', async (req, res) => {
  console.log(`🗑️ Petición DELETE para catálogo ID: ${req.params.id_catalogo}`);
  
  try {
    const { id_catalogo } = req.params;
    const { id_usuario, password } = req.body; // Recibimos ID de usuario y contraseña

    // 1. Verificamos la contraseña del usuario
    const checkQuery = "SELECT contraseña FROM usuarios WHERE id_usuario = $1";
    const checkResult = await pool.query(checkQuery, [id_usuario]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuarioDb = checkResult.rows[0];

    // Comparación simple de texto (según tu configuración actual)
    if (usuarioDb.contraseña !== password) {
      return res.status(401).json({ message: "Contraseña incorrecta. No se eliminó nada." });
    }

    // 2. Borramos los objetos (y sus fotos) asociados al catálogo primero
    // Nota: Si tienes configurado ON DELETE CASCADE en tu DB, esto se hace solo, 
    // pero lo hacemos manual aquí por seguridad.
    await pool.query("DELETE FROM fotos WHERE id_objeto_fk IN (SELECT id_objeto FROM objetos WHERE id_catalogo_fk = $1)", [id_catalogo]);
    await pool.query("DELETE FROM objetos WHERE id_catalogo_fk = $1", [id_catalogo]);

    // 3. Finalmente borramos el catálogo
    const deleteQuery = "DELETE FROM catalogos WHERE id_catalogo = $1 RETURNING *";
    const result = await pool.query(deleteQuery, [id_catalogo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "El catálogo no existe" });
    }

    console.log("✅ Catálogo eliminado exitosamente.");
    res.status(200).json({ message: "Catálogo eliminado correctamente" });

  } catch (err) {
    console.error("❌ ERROR AL ELIMINAR CATÁLOGO:", err);
    res.status(500).send("Error en el servidor al eliminar catálogo");
  }
});
startServer();