const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function exploreTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Lista tutte le tabelle
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tabelle nel database gestionelogistica:');
    console.log('='.repeat(70));
    tables.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    console.log('='.repeat(70));
    
    // Analizza tabelle specifiche che potrebbero essere correlate
    const relevantTables = ['Tab_zona', 'tab_prodotti', 'tab_vettori', 'vettori'];
    
    for (const tableName of relevantTables) {
      try {
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log(`\n📄 Struttura tabella "${tableName}":`);
        console.log('-'.repeat(70));
        columns.forEach((col, index) => {
          console.log(`${String(index + 1).padStart(2)}. ${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'}`);
        });
        
        // Mostra alcuni esempi di dati
        const [sample] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
        if (sample.length > 0) {
          console.log(`\n   Esempi dati (prime 3 righe):`);
          sample.forEach((row, idx) => {
            console.log(`   Riga ${idx + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      } catch (err) {
        console.log(`\n⚠️  Tabella "${tableName}" non trovata o errore: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

exploreTables();

