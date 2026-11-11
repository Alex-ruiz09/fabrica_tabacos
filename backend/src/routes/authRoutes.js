const express = require('express');
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/auth');
const { permitirRoles } = require('../middlewares/roles');

const router = express.Router();

// RUTAS PÚBLICAS
router.post('/login', authController.login);   // ← ESTA ES LA QUE DEBE FUNCIONAR
router.post('/register', verificarToken, permitirRoles('admin'), authController.register);

// RUTAS PROTEGIDAS
router.get('/profile', verificarToken, authController.getProfile);

module.exports = router;

