const mysql = require('mysql2/promise');

async function checkUserSessionsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_GESTIONE_HOST || 'localhost',
    port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
    user: process.env.DB_GESTIONE_USER || 'root',
    password: process.env.DB_GESTIONE_PASS || '',
    database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
  });

  try {
    console.log('Checking user_sessions table structure...');
    const [rows] = await connection.execute('DESCRIBE user_sessions');
    console.log('Table structure:');
    console.table(rows);
    
    console.log('\nChecking existing data...');
    const [data] = await connection.execute('SELECT * FROM user_sessions LIMIT 5');
    console.log('Sample data:');
    console.table(data);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUserSessionsTable();