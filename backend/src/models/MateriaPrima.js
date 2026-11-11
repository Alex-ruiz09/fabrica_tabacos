const { db } = require('../config/database');

class MateriaPrima {
    // ========== CRUD BÁSICO ==========
    
    // Crear nueva materia prima
    static async create({ nombre, unidad_medida, stock_minimo = 0 }) {
        const [result] = await db.query(
            `INSERT INTO materias_primas (nombre, unidad_medida, stock_minimo) 
             VALUES (?, ?, ?)`,
            [nombre, unidad_medida, stock_minimo]
        );
        return result.insertId;
    }

    // Obtener todas las materias primas (activas)
    static async findAll() {
        const [rows] = await db.query(
            `SELECT * FROM materias_primas 
             WHERE activo = true 
             ORDER BY nombre`
        );
        return rows;
    }

    // Obtener una materia prima por ID
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT * FROM materias_primas 
             WHERE id = ? AND activo = true`,
            [id]
        );
        return rows[0] || null;
    }

    // Actualizar materia prima
    static async update(id, { nombre, unidad_medida, stock_minimo }) {
        const [result] = await db.query(
            `UPDATE materias_primas 
             SET nombre = ?, unidad_medida = ?, stock_minimo = ? 
             WHERE id = ?`,
            [nombre, unidad_medida, stock_minimo, id]
        );
        return result.affectedRows > 0;
    }

    // Eliminar (borrado lógico)
    static async delete(id) {
        const [result] = await db.query(
            `UPDATE materias_primas 
             SET activo = false 
             WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // ========== GESTIÓN DE LOTES ==========
    
    // Ingresar un nuevo lote de materia prima
    static async ingresarLote({ 
        materia_prima_id, 
        codigo_lote, 
        proveedor, 
        cantidad, 
        fecha_cosecha, 
        fecha_caducidad 
    }) {
        // Verificar que la materia prima existe
        const mp = await this.findById(materia_prima_id);
        if (!mp) {
            throw new Error('Materia prima no encontrada');
        }

        // Insertar lote
        const [result] = await db.query(
            `INSERT INTO lotes_materia_prima 
             (materia_prima_id, codigo_lote, proveedor, cantidad_inicial, 
              cantidad_disponible, fecha_cosecha, fecha_caducidad) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [materia_prima_id, codigo_lote, proveedor, cantidad, cantidad, 
             fecha_cosecha, fecha_caducidad]
        );

        // Registrar movimiento
        await db.query(
            `INSERT INTO movimientos_inventario 
             (tipo, lote_materia_prima_id, cantidad, usuario_id, motivo) 
             VALUES ('entrada_mp', ?, ?, ?, ?)`,
            [result.insertId, cantidad, 1, 'Ingreso de lote'] // usuario_id: 1 = admin
        );

        return result.insertId;
    }

    // Obtener todos los lotes de una materia prima
    static async getLotesByMateriaPrima(materia_prima_id) {
        const [rows] = await db.query(
            `SELECT * FROM lotes_materia_prima 
             WHERE materia_prima_id = ? AND activo = true 
             ORDER BY fecha_ingreso ASC`,
            [materia_prima_id]
        );
        return rows;
    }

    // Obtener stock total de una materia prima
    static async getStockTotal(materia_prima_id) {
        const [rows] = await db.query(
            `SELECT 
                COALESCE(SUM(cantidad_disponible), 0) AS total
             FROM lotes_materia_prima 
             WHERE materia_prima_id = ? AND activo = true`,
            [materia_prima_id]
        );
        return parseFloat(rows[0].total) || 0;
    }

    // ========== LÓGICA FIFO ==========
    
    // Obtener lotes disponibles para consumir (FIFO)
    static async getLotesDisponibles(materia_prima_id, cantidadNecesaria) {
        const [lotes] = await db.query(
            `SELECT * FROM lotes_materia_prima 
             WHERE materia_prima_id = ? 
               AND cantidad_disponible > 0 
               AND activo = true 
             ORDER BY fecha_ingreso ASC`,
            [materia_prima_id]
        );

        let cantidadRestante = cantidadNecesaria;
        const lotesAUsar = [];

        for (const lote of lotes) {
            if (cantidadRestante <= 0) break;

            const cantidadAUsar = Math.min(
                parseFloat(lote.cantidad_disponible), 
                cantidadRestante
            );
            
            lotesAUsar.push({
                lote_id: lote.id,
                cantidad: cantidadAUsar,
                lote: lote
            });
            
            cantidadRestante -= cantidadAUsar;
        }

        if (cantidadRestante > 0) {
            throw new Error(
                `Stock insuficiente. Faltan ${cantidadRestante} unidades`
            );
        }

        return lotesAUsar;
    }

    // Consumir cantidad de una materia prima (usando FIFO)
    static async consumir(materia_prima_id, cantidad, motivo, usuario_id = 1) {
        // Obtener lotes a consumir (FIFO)
        const lotesAUsar = await this.getLotesDisponibles(materia_prima_id, cantidad);

        // Descontar de cada lote
        for (const item of lotesAUsar) {
            await db.query(
                `UPDATE lotes_materia_prima 
                 SET cantidad_disponible = cantidad_disponible - ? 
                 WHERE id = ?`,
                [item.cantidad, item.lote_id]
            );

            // Registrar movimiento de salida
            await db.query(
                `INSERT INTO movimientos_inventario 
                 (tipo, lote_materia_prima_id, cantidad, usuario_id, motivo) 
                 VALUES ('salida_mp_produccion', ?, ?, ?, ?)`,
                [item.lote_id, -item.cantidad, usuario_id, motivo]
            );
        }

        return {
            mensaje: 'Consumo registrado exitosamente',
            lotes_utilizados: lotesAUsar.map(item => ({
                lote_id: item.lote_id,
                cantidad: item.cantidad,
                codigo_lote: item.lote.codigo_lote
            }))
        };
    }

    // ========== REPORTES ==========
    
    // Obtener materias primas con stock bajo
    static async getStockBajo() {
        const [rows] = await db.query(
            `SELECT 
                mp.id,
                mp.nombre,
                mp.unidad_medida,
                mp.stock_minimo,
                COALESCE(SUM(lmp.cantidad_disponible), 0) AS stock_actual
             FROM materias_primas mp
             LEFT JOIN lotes_materia_prima lmp 
                ON mp.id = lmp.materia_prima_id 
                AND lmp.activo = true
             WHERE mp.activo = true
             GROUP BY mp.id, mp.nombre, mp.unidad_medida, mp.stock_minimo
             HAVING stock_actual < mp.stock_minimo
             ORDER BY (stock_actual / mp.stock_minimo) ASC`
        );
        return rows;
    }

    // Obtener lotes próximos a vencer (en los próximos N días)
    static async getLotesPorVencer(dias = 30) {
        const [rows] = await db.query(
            `SELECT 
                lmp.*,
                mp.nombre AS materia_prima_nombre
             FROM lotes_materia_prima lmp
             JOIN materias_primas mp ON mp.id = lmp.materia_prima_id
             WHERE lmp.activo = true 
               AND lmp.cantidad_disponible > 0
               AND lmp.fecha_caducidad IS NOT NULL
               AND DATEDIFF(lmp.fecha_caducidad, CURDATE()) <= ?
               AND DATEDIFF(lmp.fecha_caducidad, CURDATE()) >= 0
             ORDER BY lmp.fecha_caducidad ASC`,
            [dias]
        );
        return rows;
    }

    // ========== VALIDACIONES ==========
    
    // Verificar si existe un lote por código
    static async loteExists(codigo_lote) {
        const [rows] = await db.query(
            `SELECT id FROM lotes_materia_prima 
             WHERE codigo_lote = ?`,
            [codigo_lote]
        );
        return rows.length > 0;
    }

    // Verificar si una materia prima tiene stock suficiente
    static async tieneStockSuficiente(materia_prima_id, cantidad) {
        const stockActual = await this.getStockTotal(materia_prima_id);
        return stockActual >= cantidad;
    }
}

module.exports = MateriaPrima;