const { db } = require('../config/database');

class Proveedor {
    // Crear proveedor
    static async create({ 
        nombre, 
        tipo_documento, 
        numero_documento, 
        telefono, 
        email, 
        direccion, 
        contacto_principal 
    }) {
        const [result] = await db.query(
            `INSERT INTO proveedores 
            (nombre, tipo_documento, numero_documento, telefono, email, direccion, contacto_principal) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nombre, tipo_documento, numero_documento, telefono, email, direccion, contacto_principal]
        );
        return result.insertId;
    }

    // Listar todos
    static async findAll() {
        const [rows] = await db.query(`
            SELECT 
                p.*,
                COUNT(lmp.id) as total_compras,
                COALESCE(SUM(lmp.cantidad_inicial), 0) as total_comprado,
                COALESCE(AVG(e.calificacion), 0) as promedio_calificacion
            FROM proveedores p
            LEFT JOIN lotes_materia_prima lmp ON p.id = lmp.proveedor_id AND lmp.activo = true
            LEFT JOIN evaluaciones_proveedor e ON p.id = e.proveedor_id
            WHERE p.activo = true
            GROUP BY p.id
            ORDER BY p.nombre
        `);
        return rows;
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT * FROM proveedores WHERE id = ? AND activo = true`,
            [id]
        );
        return rows[0] || null;
    }

    // Buscar por documento
    static async findByDocumento(numero_documento) {
        const [rows] = await db.query(
            'SELECT * FROM proveedores WHERE numero_documento = ? AND activo = true',
            [numero_documento]
        );
        return rows[0] || null;
    }

    // Actualizar
    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.nombre) { fields.push('nombre = ?'); values.push(data.nombre); }
        if (data.tipo_documento) { fields.push('tipo_documento = ?'); values.push(data.tipo_documento); }
        if (data.telefono) { fields.push('telefono = ?'); values.push(data.telefono); }
        if (data.email) { fields.push('email = ?'); values.push(data.email); }
        if (data.direccion) { fields.push('direccion = ?'); values.push(data.direccion); }
        if (data.contacto_principal) { fields.push('contacto_principal = ?'); values.push(data.contacto_principal); }
        if (data.calificacion !== undefined) { fields.push('calificacion = ?'); values.push(data.calificacion); }

        if (fields.length === 0) return null;

        values.push(id);
        const [result] = await db.query(
            `UPDATE proveedores SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    }

    // Eliminar (lógico)
    static async delete(id) {
        const [result] = await db.query(
            'UPDATE proveedores SET activo = false WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    // Obtener compras de un proveedor
    static async getCompras(id, limite = 10) {
        const [rows] = await db.query(`
            SELECT 
                lmp.*,
                mp.nombre as materia_prima_nombre,
                mp.unidad_medida
            FROM lotes_materia_prima lmp
            JOIN materias_primas mp ON lmp.materia_prima_id = mp.id
            WHERE lmp.proveedor_id = ? AND lmp.activo = true
            ORDER BY lmp.fecha_ingreso DESC
            LIMIT ?
        `, [id, limite]);
        return rows;
    }

    // Calificar proveedor
    static async calificar(proveedor_id, usuario_id, calificacion, comentario) {
        const [result] = await db.query(
            `INSERT INTO evaluaciones_proveedor (proveedor_id, usuario_id, calificacion, comentario) 
            VALUES (?, ?, ?, ?)`,
            [proveedor_id, usuario_id, calificacion, comentario]
        );

        // Actualizar calificación promedio en proveedores
        const [avg] = await db.query(
            'SELECT AVG(calificacion) as promedio FROM evaluaciones_proveedor WHERE proveedor_id = ?',
            [proveedor_id]
        );
        await db.query(
            'UPDATE proveedores SET calificacion = ? WHERE id = ?',
            [Math.round(avg[0].promedio), proveedor_id]
        );

        return result.insertId;
    }
}

module.exports = Proveedor;
