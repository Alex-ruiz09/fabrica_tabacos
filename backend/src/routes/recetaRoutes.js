const express = require('express');
const recetaController = require('../controllers/recetaController');
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roles');

const router = express.Router();

router.use(verificarToken);

// Asignar recetas a un producto
router.post('/producto/:producto_id', permitirRoles('admin', 'produccion'), recetaController.asignarRecetas);

module.exports = router;