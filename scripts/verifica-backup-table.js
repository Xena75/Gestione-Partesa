/**
 * Script per verificare l'integrità di una tabella di backup
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

async function verificaBackup() {
  let connection = null;
  
  try {
    const tableName = process.argv[2] || 'fatt_delivery_backup_2026_02_09_21_33_38';
    
    console.log(`🔍 Verifica tabella backup: ${tableName}\n`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database\n');
    
    // Verifica che la tabella esista
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?
    `, [dbConfig.database, tableName]);
    
    if (tables[0].count === 0) {
      console.log(`❌ La tabella "${tableName}" non esiste`);
      process.exit(1);
    }
    
    console.log(`✅ Tabella "${tableName}" trovata\n`);
    
    // Conta i record
    const [backupCount] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const [originalCount] = await connection.execute('SELECT COUNT(*) as count FROM fatt_delivery');
    
    const backupRows = backupCount[0].count;
    const originalRows = originalCount[0].count;
    
    console.log('📊 Confronto record:');
    console.log(`   Tabella originale (fatt_delivery): ${originalRows.toLocaleString('it-IT')} record`);
    console.log(`   Tabella backup (${tableName}): ${backupRows.toLocaleString('it-IT')} record`);
    
    if (backupRows === originalRows) {
      console.log(`   ✅ I numeri corrispondono!\n`);
    } else {
      console.log(`   ⚠️ ATTENZIONE: Differenza di ${Math.abs(backupRows - originalRows).toLocaleString('it-IT')} record!\n`);
    }
    
    // Verifica alcune colonne chiave
    console.log('🔍 Verifica struttura colonne...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database, tableName]);
    
    console.log(`   Colonne trovate: ${columns.length}`);
    
    // Verifica colonne generate
    const generatedColumns = columns.filter(col => col.EXTRA && col.EXTRA.includes('GENERATED'));
    if (generatedColumns.length > 0) {
      console.log(`   Colonne generate: ${generatedColumns.map(c => c.COLUMN_NAME).join(', ')}`);
    }
    
    // Verifica che mese_fatturazione e anno_fatturazione non esistano ancora (saranno aggiunte dalla migration)
    const hasMeseFatturazione = columns.some(col => col.COLUMN_NAME === 'mese_fatturazione');
    const hasAnnoFatturazione = columns.some(col => col.COLUMN_NAME === 'anno_fatturazione');
    
    console.log(`   mese_fatturazione: ${hasMeseFatturazione ? '✅ presente' : '❌ assente (sarà aggiunta dalla migration)'}`);
    console.log(`   anno_fatturazione: ${hasAnnoFatturazione ? '✅ presente' : '❌ assente (sarà aggiunta dalla migration)'}\n`);
    
    // Verifica alcuni campi chiave
    console.log('📋 Verifica campi chiave (primi 5 record):');
    const [sample] = await connection.execute(`
      SELECT 
        id,
        source_name,
        consegna_num,
        data_mov_merce,
        tot_compenso,
        mese,
        anno
      FROM \`${tableName}\`
      ORDER BY id
      LIMIT 5
    `);
    
    sample.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ID: ${row.id}, Source: ${row.source_name || 'NULL'}, Consegna: ${row.consegna_num || 'NULL'}, Data: ${row.data_mov_merce || 'NULL'}, Tot: € ${Number(row.tot_compenso || 0).toFixed(2)}`);
    });
    
    console.log('\n✅ Verifica completata!');
    console.log(`\n💾 Tabella backup pronta: ${tableName}`);
    console.log(`\n⚠️ IMPORTANTE: Per ripristinare il backup, usa:`);
    console.log(`   DROP TABLE IF EXISTS fatt_delivery;`);
    console.log(`   RENAME TABLE \`${tableName}\` TO fatt_delivery;\n`);
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificaBackup()
  .then(() => {
    console.log('\n✅ Script completato');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });
