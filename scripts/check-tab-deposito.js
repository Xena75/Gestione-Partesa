const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function checkTabDeposito() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('📄 Struttura tabella tab_deposito:');
    console.log('='.repeat(70));
    const [description] = await connection.execute(`DESCRIBE tab_deposito`);
    description.forEach((col) => {
      console.log(` ${String(col.Field).padEnd(25)} | ${String(col.Type).padEnd(20)} | ${String(col.Null).padEnd(2)} | ${String(col.Key).padEnd(3)}`);
    });
    
    console.log('\n📊 Esempi dati (prime 5 righe):');
    const [rows] = await connection.execute(`SELECT * FROM tab_deposito LIMIT 5`);
    rows.forEach((row, index) => {
      console.log(`\nRiga ${index + 1}:`);
      for (const key in row) {
        console.log(`  ${key}: ${row[key]}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTabDeposito();

