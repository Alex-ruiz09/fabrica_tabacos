const { db } = require('../src/config/database');
const Usuario = require('../src/models/Usuario');

const rolesValidos = ['admin', 'produccion', 'bodega'];

async function run() {
    const [, , nombre, email, password, rol = 'bodega'] = process.argv;

    if (!nombre || !email || !password) {
        console.error('Uso: node scripts/createUser.js "Nombre" email password [rol]');
        process.exitCode = 1;
        return;
    }

    if (password.length < 6) {
        console.error('La contraseña debe tener al menos 6 caracteres.');
        process.exitCode = 1;
        return;
    }

    if (!rolesValidos.includes(rol)) {
        console.error(`Rol inválido. Usa uno de: ${rolesValidos.join(', ')}`);
        process.exitCode = 1;
        return;
    }

    try {
        const usuarioExistente = await Usuario.findByEmail(email);
        if (usuarioExistente) {
            console.error(`Ya existe un usuario activo con el email ${email}.`);
            process.exitCode = 1;
            return;
        }

        const id = await Usuario.create({ nombre, email, password, rol });

        console.log('Usuario creado exitosamente:');
        console.log({ id, nombre, email, rol });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error(`Ya existe un usuario con el email ${email}.`);
        } else {
            console.error('Error al crear el usuario:', error.message || error);
        }
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();