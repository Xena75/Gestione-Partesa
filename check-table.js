require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkTable() {
  const pool = mysql.createPool({
    host: process.env.DB_VIAGGI_HOST,
    port: Number(process.env.DB_VIAGGI_PORT),
    user: process.env.DB_VIAGGI_USER,
    password: process.env.DB_VIAGGI_PASS,
    database: process.env.DB_VIAGGI_NAME
  });

  try {
    const [rows] = await pool.query('DESCRIBE travels');
    console.log('Struttura tabella travels:');
    console.table(rows);
    
    // Mostra anche i primi 3 record per vedere i dati
    const [dataRows] = await pool.query('SELECT * FROM travels LIMIT 3');
    console.log('\nPrimi 3 record:');
    console.table(dataRows);
    
  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await pool.end();
  }
}

checkTable();
