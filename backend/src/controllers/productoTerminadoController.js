const ProductoTerminado = require('../models/ProductoTerminado');
const { db } = require('../config/database');

const productoTerminadoController = {
    // Crear producto
    async create(req, res) {
        try {
            const { nombre, descripcion, categoria, precio_venta, stock_minimo } = req.body;

            // Validaciones
            if (!nombre) {
                return res.status(400).json({ error: 'El nombre es obligatorio' });
            }
            if (!precio_venta || precio_venta <= 0) {
                return res.status(400).json({ error: 'El precio de venta debe ser mayor a 0' });
            }

            const id = await ProductoTerminado.create({ nombre, descripcion, categoria, precio_venta, stock_minimo });
            const nuevoProducto = await ProductoTerminado.findById(id);

            res.status(201).json({
                mensaje: 'Producto terminado creado exitosamente',
                producto: nuevoProducto
            });
        } catch (error) {
            console.error('Error en create producto:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Listar todos los productos
    async findAll(req, res) {
        try {
            const productos = await ProductoTerminado.findAll();
            // Agregar stock total a cada producto
            for (let producto of productos) {
                producto.stock_total = await ProductoTerminado.getStock(producto.id);
            }
            res.json(productos);
        } catch (error) {
            console.error('Error en findAll productos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Obtener un producto por ID
    async findById(req, res) {
        try {
            const { id } = req.params;
            const producto = await ProductoTerminado.findById(id);
            if (!producto) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            producto.stock_total = await ProductoTerminado.getStock(id);
            res.json(producto);
        } catch (error) {
            console.error('Error en findById producto:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Actualizar producto
    async update(req, res) {
        try {
            const { id } = req.params;
            const { nombre, descripcion, categoria, precio_venta, stock_minimo } = req.body;

            const productoExistente = await ProductoTerminado.findById(id);
            if (!productoExistente) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            const actualizado = await ProductoTerminado.update(id, { nombre, descripcion, categoria, precio_venta, stock_minimo });
            if (!actualizado) {
                return res.status(400).json({ error: 'No se pudo actualizar el producto' });
            }

            const productoActualizado = await ProductoTerminado.findById(id);
            res.json({
                mensaje: 'Producto actualizado exitosamente',
                producto: productoActualizado
            });
        } catch (error) {
            console.error('Error en update producto:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Eliminar (desactivar) producto
    async delete(req, res) {
        try {
            const { id } = req.params;
            const productoExistente = await ProductoTerminado.findById(id);
            if (!productoExistente) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            const eliminado = await ProductoTerminado.delete(id);
            if (!eliminado) {
                return res.status(400).json({ error: 'No se pudo eliminar el producto' });
            }

            res.json({ mensaje: 'Producto eliminado exitosamente' });
        } catch (error) {
            console.error('Error en delete producto:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Obtener recetas de un producto
    async getRecetas(req, res) {
        try {
            const { id } = req.params;
            const producto = await ProductoTerminado.findById(id);
            if (!producto) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            const [rows] = await db.query(
                `SELECT r.*, mp.nombre as materia_prima_nombre, mp.unidad_medida
                FROM recetas r
                JOIN materias_primas mp ON mp.id = r.materia_prima_id
                WHERE r.producto_id = ?`,
                [id]
            );

            res.json({
                producto: producto.nombre,
                recetas: rows
            });
        } catch (error) {
            console.error('Error en getRecetas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = productoTerminadoController;
