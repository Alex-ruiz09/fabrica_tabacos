const { db } = require('../src/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, password_hash, rol, activo, created_at FROM usuarios WHERE email = ?',
      ['admin@fabrica.com']
    );

    console.log('rows length:', rows.length);
    if (rows.length === 0) {
      console.log('No se encontró el usuario admin@fabrica.com');
      process.exit(0);
    }

    const user = rows[0];
    console.log('activo:', user.activo);
    console.log('hash:', user.password_hash);
    const match = await bcrypt.compare('Admin123!', user.password_hash);
    console.log('match:', match);
    console.log('hash length:', user.password_hash ? user.password_hash.length : 0);
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    process.exit(0);
  }
})();
