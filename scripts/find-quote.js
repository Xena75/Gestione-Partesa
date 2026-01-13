const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
});

async function findQuote() {
  const [rows] = await pool.query(
    `SELECT * FROM maintenance_quotes 
     WHERE quote_number IN ('883', '887') 
     ORDER BY id DESC LIMIT 5`
  );
  
  console.log('🔍 Preventivi trovati:\n');
  rows.forEach(row => {
    console.log(`ID: ${row.id} | N°: ${row.quote_number} | Veicolo: ${row.vehicle_id}`);
  });
  
  if (rows.length > 0) {
    console.log('\n📋 Colonne disponibili:', Object.keys(rows[0]).join(', '));
  }
  
  await pool.end();
}

findQuote().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});

