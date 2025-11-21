const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  multipleStatements: true // Permette di eseguire più statement SQL
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database gestionelogistica\n');
    
    // Leggi il file SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_resi_vuoti_non_fatturati.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Esecuzione migration...');
    console.log('='.repeat(70));
    
    // Esegui la migration
    const [results] = await connection.query(sql);
    
    console.log('✅ Migration eseguita con successo!\n');
    
    // Verifica che la tabella sia stata creata
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'resi_vuoti_non_fatturati'"
    );
    
    if (tables.length > 0) {
      console.log('✅ Tabella resi_vuoti_non_fatturati creata correttamente\n');
      
      // Mostra struttura tabella
      const [columns] = await connection.execute('DESCRIBE resi_vuoti_non_fatturati');
      console.log('📋 Struttura tabella:');
      console.log('='.repeat(70));
      columns.forEach((col, index) => {
        console.log(`${String(index + 1).padStart(2)}. ${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key || ''}`);
      });
      
      // Mostra indici
      const [indexes] = await connection.execute(
        "SHOW INDEXES FROM resi_vuoti_non_fatturati"
      );
      console.log('\n📊 Indici creati:');
      console.log('='.repeat(70));
      indexes.forEach((idx, index) => {
        console.log(`${index + 1}. ${idx.Key_name} su colonna ${idx.Column_name}`);
      });
      
    } else {
      console.log('❌ Errore: tabella non trovata dopo la migration');
    }
    
  } catch (error) {
    console.error('❌ Errore durante la migration:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

runMigration();

