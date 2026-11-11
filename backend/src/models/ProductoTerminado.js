const { db } = require('../config/database');

class ProductoTerminado {
    // Crear un nuevo producto
    static async create({ nombre, descripcion, categoria, precio_venta, stock_minimo }) {
        const [result] = await db.query(
            `INSERT INTO productos_terminados 
            (nombre, descripcion, categoria, precio_venta, stock_minimo) 
            VALUES (?, ?, ?, ?, ?)`,
            [nombre, descripcion || null, categoria || null, precio_venta, stock_minimo || 0]
        );
        return result.insertId;
    }

    // Obtener todos los productos activos
    static async findAll() {
        const [rows] = await db.query(
            `SELECT * FROM productos_terminados WHERE activo = true ORDER BY nombre`
        );
        return rows;
    }

    // Obtener un producto por ID
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT * FROM productos_terminados WHERE id = ? AND activo = true`,
            [id]
        );
        return rows[0] || null;
    }

    // Actualizar un producto
    static async update(id, { nombre, descripcion, categoria, precio_venta, stock_minimo }) {
        const [result] = await db.query(
            `UPDATE productos_terminados SET 
                nombre = ?, 
                descripcion = ?, 
                categoria = ?, 
                precio_venta = ?, 
                stock_minimo = ? 
            WHERE id = ? AND activo = true`,
            [nombre, descripcion, categoria, precio_venta, stock_minimo, id]
        );
        return result.affectedRows > 0;
    }

    // Eliminar lógico (desactivar)
    static async delete(id) {
        const [result] = await db.query(
            `UPDATE productos_terminados SET activo = false WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // Obtener stock total de un producto (suma de lotes disponibles)
    static async getStock(productoId) {
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(cantidad_disponible), 0) as stock_total 
            FROM lotes_producto 
            WHERE producto_id = ? AND activo = true`,
            [productoId]
        );
        return parseInt(rows[0].stock_total) || 0;
    }
}

module.exports = ProductoTerminado;