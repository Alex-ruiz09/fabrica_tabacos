const { db } = require('../config/database');

const materiaPrimaController = {
    // Crear nueva materia prima
    async create(req, res) {
        try {
            const { nombre, unidad_medida, stock_minimo } = req.body;

            if (!nombre || !unidad_medida) {
                return res.status(400).json({ 
                    error: 'Nombre y unidad de medida son obligatorios' 
                });
            }

            const [result] = await db.query(
                'INSERT INTO materias_primas (nombre, unidad_medida, stock_minimo) VALUES (?, ?, ?)',
                [nombre, unidad_medida, stock_minimo || 0]
            );

            const [newMateriaPrima] = await db.query(
                'SELECT * FROM materias_primas WHERE id = ?',
                [result.insertId]
            );

            res.status(201).json({
                mensaje: 'Materia prima creada exitosamente',
                materia_prima: newMateriaPrima[0]
            });

        } catch (error) {
            console.error('Error en create materia prima:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'El nombre ya existe' });
            }
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Listar todas las materias primas
    async findAll(req, res) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM materias_primas WHERE activo = true ORDER BY nombre'
            );
            res.json(rows);
        } catch (error) {
            console.error('Error en findAll materia prima:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Ingresar nuevo lote de materia prima
    async ingresarLote(req, res) {
        try {
            const { 
                materia_prima_id, 
                codigo_lote, 
                proveedor, 
                cantidad, 
                fecha_cosecha, 
                fecha_caducidad 
            } = req.body;

            // Validaciones
            if (!materia_prima_id || !codigo_lote || !cantidad) {
                return res.status(400).json({ 
                    error: 'Materia prima, código de lote y cantidad son obligatorios' 
                });
            }

            if (cantidad <= 0) {
                return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
            }

            // Verificar que la materia prima existe
            const [mp] = await db.query(
                'SELECT id FROM materias_primas WHERE id = ? AND activo = true',
                [materia_prima_id]
            );
            if (mp.length === 0) {
                return res.status(404).json({ error: 'Materia prima no encontrada' });
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
                [result.insertId, cantidad, req.user.id, 'Ingreso de lote']
            );

            res.status(201).json({
                mensaje: 'Lote ingresado exitosamente',
                lote_id: result.insertId,
                codigo_lote,
                cantidad
            });

        } catch (error) {
            console.error('Error en ingresarLote:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ 
                    error: 'El código de lote ya existe' 
                });
            }
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Ver stock actual de materias primas
    async getStock(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT 
                    mp.id,
                    mp.nombre,
                    mp.unidad_medida,
                    mp.stock_minimo,
                    COALESCE(SUM(lmp.cantidad_disponible), 0) AS stock_total,
                    COUNT(lmp.id) AS cantidad_lotes
                FROM materias_primas mp
                LEFT JOIN lotes_materia_prima lmp 
                    ON mp.id = lmp.materia_prima_id 
                    AND lmp.activo = true
                WHERE mp.activo = true
                GROUP BY mp.id, mp.nombre, mp.unidad_medida, mp.stock_minimo
                ORDER BY mp.nombre
            `);

            // Marcar los que están por debajo del mínimo
            const resultado = rows.map(row => ({
                ...row,
                stock_bajo: parseFloat(row.stock_total) < parseFloat(row.stock_minimo)
            }));

            res.json(resultado);

        } catch (error) {
            console.error('Error en getStock:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Listar lotes de materia prima
    async findLotes(req, res) {
        
        try {
            const [rows] = await db.query(`
                SELECT
                    lmp.id,
                    lmp.materia_prima_id,
                    mp.nombre AS materia_prima_nombre,
                    lmp.codigo_lote,
                    lmp.proveedor,
                    lmp.cantidad_inicial,
                    lmp.cantidad_disponible,
                    lmp.fecha_cosecha,
                    lmp.fecha_caducidad,
                    lmp.activo,
                    lmp.created_at
                FROM lotes_materia_prima lmp
                JOIN materias_primas mp ON mp.id = lmp.materia_prima_id
                WHERE lmp.activo = true
                ORDER BY lmp.fecha_caducidad ASC, lmp.id DESC
            `);

            res.json(rows);

        } catch (error) {
            console.error('Error en findLotes materia prima:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = materiaPrimaController;