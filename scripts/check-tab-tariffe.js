const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function checkTabTariffe() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Descrivi la struttura di tab_tariffe
    const [columns] = await connection.execute('DESCRIBE tab_tariffe');
    console.log('📄 Struttura tabella "tab_tariffe":');
    console.log('='.repeat(70));
    columns.forEach((col, index) => {
      console.log(`${String(index + 1).padStart(2)}. ${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'}`);
    });
    
    // Mostra alcuni esempi di dati
    const [sample] = await connection.execute('SELECT * FROM tab_tariffe LIMIT 5');
    if (sample.length > 0) {
      console.log(`\n📊 Esempi dati (prime 5 righe):`);
      sample.forEach((row, idx) => {
        console.log(`\n   Riga ${idx + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`     ${key}: ${row[key]}`);
        });
      });
    }
    
    // Verifica formato ID_fatt
    const [idFattExamples] = await connection.execute('SELECT DISTINCT ID_fatt FROM tab_tariffe LIMIT 10');
    console.log(`\n🔍 Esempi di ID_fatt (formato):`);
    idFattExamples.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.ID_fatt}`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTabTariffe();

