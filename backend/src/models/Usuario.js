const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

class Usuario {
    // Crear usuario
    static async create({ nombre, email, password, rol }) {
        const passwordHash = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
            [nombre, email, passwordHash, rol || 'bodega']
        );
        
        return result.insertId;
    }

    // Buscar por email
    static async findByEmail(email) {
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE email = ? AND activo = true',
            [email]
        );
        return rows[0] || null;
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await db.query(
            'SELECT id, nombre, email, rol, activo, created_at FROM usuarios WHERE id = ? AND activo = true',
            [id]
        );
        return rows[0] || null;
    }

    // Verificar contraseña
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // Listar todos (para admin)
    static async findAll() {
        const [rows] = await db.query(
            'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC'
        );
        return rows;
    }
}

module.exports = Usuario;