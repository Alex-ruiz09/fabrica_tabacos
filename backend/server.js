const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Importar rutas
const authRoutes = require('./src/routes/authRoutes');
const materiaPrimaRoutes = require('./src/routes/materiaPrimaRoutes');
const productoTerminadoRoutes = require('./src/routes/productoTerminadoRoutes');
const recetaRoutes = require('./src/routes/recetaRoutes');
const produccionRoutes = require('./src/routes/produccionRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/materia-prima', materiaPrimaRoutes);
app.use('/api/productos', productoTerminadoRoutes);
app.use('/api/recetas', recetaRoutes);
app.use('/api/produccion', produccionRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        mensaje: 'Backend de fábrica de tabacos funcionando 🚬',
        timestamp: new Date().toISOString()
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error global:', err.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        mensaje: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
    console.log(`📋 Auth: /api/auth`);
    console.log(`📋 Materia Prima: /api/materia-prima`);
    console.log(`📋 Productos: /api/productos`);
    console.log(`📋 Recetas: /api/recetas`);
    console.log(`📋 Producción: /api/produccion`);
});

console.log('✅ Servidor iniciado correctamente');