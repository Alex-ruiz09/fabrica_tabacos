const OrdenProduccion = require('../models/OrdenProduccion');
const ProductoTerminado = require('../models/ProductoTerminado');
const { db } = require('../config/database');

// Función auxiliar para obtener lotes de materia prima con FIFO
async function getLotesMPFIFO(materia_prima_id, cantidad_necesaria) {
    const [lotes] = await db.query(
        `SELECT id, cantidad_disponible 
        FROM lotes_materia_prima 
        WHERE materia_prima_id = ? AND cantidad_disponible > 0 AND activo = true
        ORDER BY fecha_ingreso ASC`,
        [materia_prima_id]
    );

    if (lotes.length === 0) {
        throw new Error(`No hay stock disponible de la materia prima ID ${materia_prima_id}`);
    }

    const lotesAUsar = [];
    let cantidadRestante = cantidad_necesaria;

    for (const lote of lotes) {
        if (cantidadRestante <= 0) break;

        const cantidadAUsar = Math.min(lote.cantidad_disponible, cantidadRestante);
        lotesAUsar.push({
            lote_id: lote.id,
            cantidad: cantidadAUsar
        });
        cantidadRestante -= cantidadAUsar;
    }

    if (cantidadRestante > 0) {
        throw new Error(`Stock insuficiente. Faltan ${cantidadRestante} unidades`);
    }

    return lotesAUsar;
}

const produccionController = {
    // Crear una orden de producción (con validación de stock de MP)
    async crearOrden(req, res) {
        try {
            const { producto_id, cantidad_planificada } = req.body;
            const usuario_id = req.user.id;

            // Validaciones
            if (!producto_id || !cantidad_planificada || cantidad_planificada <= 0) {
                return res.status(400).json({ 
                    error: 'producto_id y cantidad_planificada (>0) son obligatorios' 
                });
            }

            // Verificar que el producto existe
            const producto = await ProductoTerminado.findById(producto_id);
            if (!producto) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            // Obtener recetas del producto
            const [recetas] = await db.query(
                `SELECT r.*, mp.nombre as mp_nombre 
                FROM recetas r
                JOIN materias_primas mp ON mp.id = r.materia_prima_id
                WHERE r.producto_id = ?`,
                [producto_id]
            );

            if (recetas.length === 0) {
                return res.status(400).json({ 
                    error: 'El producto no tiene recetas asignadas. Asigne recetas primero.' 
                });
            }

            // Validar stock de cada materia prima
            const materialesNecesarios = [];
            for (const receta of recetas) {
                const cantidadNecesaria = receta.cantidad_necesaria * cantidad_planificada;
                materialesNecesarios.push({
                    materia_prima_id: receta.materia_prima_id,
                    nombre: receta.mp_nombre,
                    cantidad_necesaria: cantidadNecesaria,
                    unidad: receta.unidad_medida
                });

                // Verificar disponibilidad con FIFO
                await getLotesMPFIFO(receta.materia_prima_id, cantidadNecesaria);
            }

            // Crear la orden
            const ordenId = await OrdenProduccion.create({
                producto_id,
                usuario_id,
                cantidad_planificada,
                fecha_inicio: new Date()
            });

            res.status(201).json({
                mensaje: 'Orden de producción creada exitosamente',
                orden_id: ordenId,
                materiales_necesarios: materialesNecesarios
            });

        } catch (error) {
            console.error('Error en crearOrden:', error);
            res.status(400).json({ error: error.message });
        }
    },

    // Listar todas las órdenes
    async listarOrdenes(req, res) {
        try {
            const ordenes = await OrdenProduccion.findAll();
            res.json(ordenes);
        } catch (error) {
            console.error('Error en listarOrdenes:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Completar una orden (consumir MP, generar lote de PT)
    async completarOrden(req, res) {
        const connection = await db.getConnection();
        try {
            const { id } = req.params;
            const { cantidad_producida } = req.body;

            // Validar cantidad producida
            if (!cantidad_producida || cantidad_producida <= 0) {
                return res.status(400).json({ 
                    error: 'cantidad_producida es obligatoria y debe ser > 0' 
                });
            }

            // Obtener la orden
            const orden = await OrdenProduccion.findById(id);
            if (!orden) {
                return res.status(404).json({ error: 'Orden no encontrada' });
            }

            if (orden.estado !== 'pendiente') {
                return res.status(400).json({ 
                    error: `La orden está en estado "${orden.estado}". Solo se pueden completar órdenes pendientes.` 
                });
            }

            if (cantidad_producida > orden.cantidad_planificada) {
                return res.status(400).json({ 
                    error: `La cantidad producida (${cantidad_producida}) no puede exceder la planificada (${orden.cantidad_planificada})` 
                });
            }

            // Obtener recetas del producto
            const [recetas] = await db.query(
                `SELECT r.* FROM recetas r WHERE r.producto_id = ?`,
                [orden.producto_id]
            );

            if (recetas.length === 0) {
                return res.status(400).json({ 
                    error: 'El producto no tiene recetas. No se puede producir.' 
                });
            }

            // Iniciar transacción
            await connection.beginTransaction();

            // 1. Consumir materia prima de los lotes (FIFO)
            const consumos = [];
            for (const receta of recetas) {
                const cantidadNecesaria = receta.cantidad_necesaria * cantidad_producida;
                const lotesAUsar = await getLotesMPFIFO(receta.materia_prima_id, cantidadNecesaria);

                for (const loteInfo of lotesAUsar) {
                    // Descontar del lote
                    await connection.query(
                        `UPDATE lotes_materia_prima 
                        SET cantidad_disponible = cantidad_disponible - ? 
                        WHERE id = ?`,
                        [loteInfo.cantidad, loteInfo.lote_id]
                    );

                    // Registrar movimiento de salida de MP
                    await connection.query(
                        `INSERT INTO movimientos_inventario 
                        (tipo, lote_materia_prima_id, cantidad, usuario_id, referencia_id, motivo) 
                        VALUES ('salida_mp_produccion', ?, ?, ?, ?, ?)`,
                        [loteInfo.lote_id, loteInfo.cantidad, req.user.id, id, `Consumo para orden #${id}`]
                    );

                    consumos.push({
                        lote_id: loteInfo.lote_id,
                        cantidad: loteInfo.cantidad
                    });
                }
            }

            // 2. Crear el lote de producto terminado
            const codigoLote = `PT-${orden.producto_id}-${Date.now()}`;
            const [loteResult] = await connection.query(
                `INSERT INTO lotes_producto 
                (producto_id, codigo_lote, cantidad_inicial, cantidad_disponible, fecha_produccion) 
                VALUES (?, ?, ?, ?, CURDATE())`,
                [orden.producto_id, codigoLote, cantidad_producida, cantidad_producida]
            );
            const loteId = loteResult.insertId;

            // 3. Registrar movimiento de entrada de PT
            await connection.query(
                `INSERT INTO movimientos_inventario 
                (tipo, lote_producto_id, cantidad, usuario_id, referencia_id, motivo) 
                VALUES ('entrada_pt', ?, ?, ?, ?, ?)`,
                [loteId, cantidad_producida, req.user.id, id, `Producción orden #${id}`]
            );

            // 4. Actualizar la orden a completada
            await connection.query(
                `UPDATE ordenes_produccion 
                SET estado = 'completada', 
                    cantidad_producida = ?, 
                    fecha_fin = CURDATE() 
                WHERE id = ?`,
                [cantidad_producida, id]
            );

            // Confirmar transacción
            await connection.commit();

            res.json({
                mensaje: 'Orden completada exitosamente',
                orden_id: id,
                lote_producto_id: loteId,
                codigo_lote: codigoLote,
                cantidad_producida: cantidad_producida,
                consumos: consumos
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error en completarOrden:', error);
            res.status(400).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Cambiar estado de una orden (cancelar, pausar, etc.)
    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            const estadosValidos = ['pendiente', 'en_produccion', 'completada', 'cancelada'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({ 
                    error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` 
                });
            }

            const orden = await OrdenProduccion.findById(id);
            if (!orden) {
                return res.status(404).json({ error: 'Orden no encontrada' });
            }

            // No permitir cambiar a completada desde este endpoint (usar /completar)
            if (estado === 'completada') {
                return res.status(400).json({ 
                    error: 'Use el endpoint /completar para finalizar una orden' 
                });
            }

            const actualizado = await OrdenProduccion.updateEstado(id, estado);
            if (!actualizado) {
                return res.status(400).json({ error: 'No se pudo actualizar el estado' });
            }

            res.json({
                mensaje: `Estado de orden actualizado a "${estado}"`,
                orden_id: id,
                estado: estado
            });
        } catch (error) {
            console.error('Error en cambiarEstado:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = produccionController;