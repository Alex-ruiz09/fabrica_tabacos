const { db } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'UPDATE usuarios SET password_hash = ? WHERE email = ?',
      [hash, 'admin@fabrica.com']
    );

    console.log('Password updated rows:', result.affectedRows);
    if (result.affectedRows === 0) {
      console.log('No se encontró el usuario admin@fabrica.com');
      process.exit(1);
    }

    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, activo, password_hash FROM usuarios WHERE email = ?',
      ['admin@fabrica.com']
    );

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    console.log('Hash verify match:', match);
    console.log('Usuario actualizado:', {
      id: user.id,
      email: user.email,
      rol: user.rol,
      activo: user.activo
    });
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
