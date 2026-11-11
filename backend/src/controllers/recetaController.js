const Receta = require('../models/Receta');
const ProductoTerminado = require('../models/ProductoTerminado');
const { db } = require('../config/database');

const recetaController = {
    // Asignar recetas a un producto (recibe un arreglo de materias primas y cantidades)
    async asignarRecetas(req, res) {
        try {
            const { producto_id } = req.params;
            const { recetas } = req.body; // recetas: [{ materia_prima_id, cantidad_necesaria }]

            // Validar que el producto existe
            const producto = await ProductoTerminado.findById(producto_id);
            if (!producto) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            // Validar que recetas sea un arreglo no vacío
            if (!Array.isArray(recetas) || recetas.length === 0) {
                return res.status(400).json({ error: 'Debe enviar al menos una receta' });
            }

            // Validar cada receta
            for (const receta of recetas) {
                if (!receta.materia_prima_id || !receta.cantidad_necesaria || receta.cantidad_necesaria <= 0) {
                    return res.status(400).json({ 
                        error: 'Cada receta debe tener materia_prima_id y cantidad_necesaria > 0' 
                    });
                }

                // Verificar que la materia prima existe
                const [mp] = await db.query(
                    'SELECT id FROM materias_primas WHERE id = ? AND activo = true',
                    [receta.materia_prima_id]
                );
                if (mp.length === 0) {
                    return res.status(404).json({ 
                        error: `Materia prima con ID ${receta.materia_prima_id} no encontrada` 
                    });
                }
            }

            // Eliminar recetas anteriores del producto
            await Receta.deleteByProducto(producto_id);

            // Insertar nuevas recetas
            const nuevasRecetas = [];
            for (const receta of recetas) {
                const id = await Receta.create({
                    producto_id,
                    materia_prima_id: receta.materia_prima_id,
                    cantidad_necesaria: receta.cantidad_necesaria
                });
                nuevasRecetas.push({ id, ...receta });
            }

            res.status(201).json({
                mensaje: 'Recetas asignadas exitosamente',
                producto: producto.nombre,
                recetas: nuevasRecetas
            });
        } catch (error) {
            console.error('Error en asignarRecetas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = recetaController;