const express = require('express');
const materiaPrimaController = require('../controllers/materiaPrimaController');
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roles');

const router = express.Router();

// Todas las rutas de materia prima requieren autenticación
router.use(verificarToken);

// Rutas para materia prima
router.post('/', permitirRoles('admin', 'produccion'), materiaPrimaController.create);
router.get('/', materiaPrimaController.findAll);
router.get('/stock', materiaPrimaController.getStock);
router.get('/lotes', permitirRoles('admin', 'produccion', 'bodega'), materiaPrimaController.findLotes);
router.post('/lotes', permitirRoles('admin', 'produccion', 'bodega'), materiaPrimaController.ingresarLote);

module.exports = router;