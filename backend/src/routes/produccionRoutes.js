const express = require('express');
const produccionController = require('../controllers/produccionController');
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roles');

const router = express.Router();

router.use(verificarToken);

// Rutas de órdenes de producción
router.post('/ordenes', permitirRoles('admin', 'produccion'), produccionController.crearOrden);
router.get('/ordenes', produccionController.listarOrdenes);
router.put('/ordenes/:id/estado', permitirRoles('admin', 'produccion'), produccionController.cambiarEstado);
router.post('/ordenes/:id/completar', permitirRoles('admin', 'produccion'), produccionController.completarOrden);

module.exports = router;