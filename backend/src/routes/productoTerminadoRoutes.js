const express = require('express');
const productoTerminadoController = require('../controllers/productoTerminadoController');
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roles');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// CRUD de productos terminados
router.post('/', permitirRoles('admin', 'produccion'), productoTerminadoController.create);
router.get('/', productoTerminadoController.findAll);
router.get('/:id', productoTerminadoController.findById);
router.put('/:id', permitirRoles('admin', 'produccion'), productoTerminadoController.update);
router.delete('/:id', permitirRoles('admin'), productoTerminadoController.delete);

// Recetas de un producto
router.get('/:id/recetas', productoTerminadoController.getRecetas);

module.exports = router;