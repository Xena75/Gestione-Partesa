/**
 * Script per eliminare una tabella di backup
 */

const mysql = require('mysql2/promise');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_DB || 'gestionelogistica'
};

async function deleteBackupTable() {
  let connection = null;
  
  try {
    const tableName = process.argv[2];
    
    if (!tableName) {
      console.log('❌ Specifica il nome della tabella da eliminare');
      console.log('   Uso: node scripts/delete-backup-table.js nome_tabella');
      console.log('\n   Esempio:');
      console.log('   node scripts/delete-backup-table.js fatt_delivery_backup_2026_02_09_21_32_20');
      process.exit(1);
    }
    
    console.log(`🗑️ Eliminazione tabella: ${tableName}\n`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database\n');
    
    // Verifica che la tabella esista
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?
    `, [dbConfig.database, tableName]);
    
    if (tables[0].count === 0) {
      console.log(`⚠️ La tabella "${tableName}" non esiste`);
      process.exit(0);
    }
    
    // Conta i record nella tabella
    const [count] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const recordCount = count[0].count;
    
    console.log(`📊 Record nella tabella: ${recordCount}`);
    
    if (recordCount > 0) {
      console.log('⚠️ ATTENZIONE: La tabella contiene record!');
      console.log('   Per sicurezza, non verrà eliminata automaticamente.');
      console.log('   Se vuoi comunque eliminarla, modifica lo script.');
      process.exit(1);
    }
    
    // Elimina la tabella
    console.log(`\n🗑️ Eliminazione in corso...`);
    await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
    
    console.log(`✅ Tabella "${tableName}" eliminata con successo!`);
    
  } catch (error) {
    console.error('❌ Errore durante l\'eliminazione:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

deleteBackupTable()
  .then(() => {
    console.log('\n✅ Script completato');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });
