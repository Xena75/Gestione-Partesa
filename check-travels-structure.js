const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: Number(process.env.DB_VIAGGI_PORT) || 3306,
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
};

async function checkTable() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('🔍 Controllo struttura tabella travels...');
    
    const [columns] = await connection.execute('DESCRIBE travels');
    console.log('\n📋 Colonne attuali:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    // Controlliamo se esiste già un campo mese
    const meseExists = columns.some(col => col.Field === 'mese');
    console.log(`\n🔍 Campo 'mese' esiste: ${meseExists ? 'SÌ' : 'NO'}`);
    
    // Controlliamo se esiste data_viaggio
    const dataViaggioExists = columns.some(col => col.Field === 'data_viaggio');
    console.log(`🔍 Campo 'data_viaggio' esiste: ${dataViaggioExists ? 'SÌ' : 'NO'}`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

checkTable();
