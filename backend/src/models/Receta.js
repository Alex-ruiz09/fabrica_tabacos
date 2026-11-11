const { db } = require('../config/database');

class Receta {
    // Crear una receta (asociar producto con materia prima y cantidad)
    static async create({ producto_id, materia_prima_id, cantidad_necesaria }) {
        const [result] = await db.query(
            `INSERT INTO recetas (producto_id, materia_prima_id, cantidad_necesaria) 
            VALUES (?, ?, ?)`,
            [producto_id, materia_prima_id, cantidad_necesaria]
        );
        return result.insertId;
    }

    // Obtener todas las recetas de un producto
    static async findByProducto(producto_id) {
        const [rows] = await db.query(
            `SELECT r.*, mp.nombre as materia_prima_nombre, mp.unidad_medida 
            FROM recetas r
            JOIN materias_primas mp ON mp.id = r.materia_prima_id
            WHERE r.producto_id = ?`,
            [producto_id]
        );
        return rows;
    }

    // Eliminar una receta (por id)
    static async delete(id) {
        const [result] = await db.query(
            `DELETE FROM recetas WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // Eliminar todas las recetas de un producto (útil al actualizar)
    static async deleteByProducto(producto_id) {
        const [result] = await db.query(
            `DELETE FROM recetas WHERE producto_id = ?`,
            [producto_id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Receta;
