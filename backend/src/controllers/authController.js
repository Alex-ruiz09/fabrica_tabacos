const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const authController = {
    async login(req, res) {
        try {
            console.log('📩 Body recibido:', req.body);
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'Email y contraseña son obligatorios' 
                });
            }

            const user = await Usuario.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const isValidPassword = await Usuario.verifyPassword(password, user.password_hash);
            console.log('🔑 Contraseña válida:', isValidPassword);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, rol: user.rol },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                mensaje: 'Login exitoso',
                token,
                usuario: {
                    id: user.id,
                    nombre: user.nombre,
                    email: user.email,
                    rol: user.rol
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async register(req, res) {
        try {
            const { nombre, email, password, rol } = req.body;

            if (!nombre || !email || !password) {
                return res.status(400).json({ 
                    error: 'Faltan campos obligatorios: nombre, email, password' 
                });
            }

            if (password.length < 6) {
                return res.status(400).json({ 
                    error: 'La contraseña debe tener al menos 6 caracteres' 
                });
            }

            const existingUser = await Usuario.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ error: 'El email ya está registrado' });
            }

            const userId = await Usuario.create({ nombre, email, password, rol });
            
            res.status(201).json({
                mensaje: 'Usuario creado exitosamente',
                usuario: {
                    id: userId,
                    nombre,
                    email,
                    rol: rol || 'bodega'
                }
            });

        } catch (error) {
            console.error('Error en register:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getProfile(req, res) {
        try {
            const user = await Usuario.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            res.json(user);
        } catch (error) {
            console.error('Error en getProfile:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = authController;