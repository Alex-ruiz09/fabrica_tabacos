const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Crear pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fabrica_tabacos',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convertir a Promises para usar async/await
const db = pool.promise();

// Probar conexión
async function testConnection() {
    try {
        const [rows] = await db.query('SELECT 1');
        console.log('✅ Conectado a MySQL correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.error('💡 Verifica que:');
        console.error('   1. MySQL esté corriendo (XAMPP/WAMP)');
        console.error('   2. Las credenciales en .env sean correctas');
        console.error('   3. La base de datos "fabrica_tabacos" exista');
        return false;
    }
}

module.exports = { db, testConnection };