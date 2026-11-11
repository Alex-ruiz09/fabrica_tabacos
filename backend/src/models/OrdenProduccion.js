const { db } = require('../config/database');

class OrdenProduccion {
    // Crear una orden de producción
    static async create({ producto_id, usuario_id, cantidad_planificada, fecha_inicio }) {
        const [result] = await db.query(
            `INSERT INTO ordenes_produccion 
            (producto_id, usuario_id, cantidad_planificada, estado, fecha_inicio) 
            VALUES (?, ?, ?, 'pendiente', ?)`,
            [producto_id, usuario_id, cantidad_planificada, fecha_inicio || new Date()]
        );
        return result.insertId;
    }

    // Obtener todas las órdenes con información relacionada
    static async findAll() {
        const [rows] = await db.query(
            `SELECT op.*, 
                pt.nombre as producto_nombre, 
                u.nombre as usuario_nombre
            FROM ordenes_produccion op
            JOIN productos_terminados pt ON pt.id = op.producto_id
            JOIN usuarios u ON u.id = op.usuario_id
            ORDER BY op.created_at DESC`
        );
        return rows;
    }

    // Obtener una orden por ID
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT op.*, 
                pt.nombre as producto_nombre, 
                u.nombre as usuario_nombre
            FROM ordenes_produccion op
            JOIN productos_terminados pt ON pt.id = op.producto_id
            JOIN usuarios u ON u.id = op.usuario_id
            WHERE op.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    // Actualizar estado de la orden
    static async updateEstado(id, estado) {
        const [result] = await db.query(
            `UPDATE ordenes_produccion SET estado = ? WHERE id = ?`,
            [estado, id]
        );
        return result.affectedRows > 0;
    }

    // Actualizar cantidad producida y fecha fin
    static async completar(id, cantidad_producida) {
        const [result] = await db.query(
            `UPDATE ordenes_produccion 
            SET estado = 'completada', 
                cantidad_producida = ?, 
                fecha_fin = CURRENT_DATE
            WHERE id = ?`,
            [cantidad_producida, id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = OrdenProduccion;