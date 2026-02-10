const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function backupTable() {
  let connection = null;
  
  try {
    console.log('🔄 BACKUP TABELLA fatt_handling');
    console.log('='.repeat(80));
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database:', dbConfig.database);
    
    // Nome tabella backup con timestamp (solo numeri e underscore per compatibilità MySQL)
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').replace(/\./g, '_').slice(0, 19);
    const backupTableName = `fatt_handling_backup_${timestamp}`;
    
    console.log(`\n📋 Creazione tabella backup: ${backupTableName}`);
    
    // 1. Crea tabella backup con stessa struttura
    const [createResult] = await connection.execute(`
      CREATE TABLE \`${backupTableName}\` LIKE fatt_handling
    `);
    console.log('✅ Struttura tabella backup creata');
    
    // 2. Copia tutti i dati
    console.log('\n📊 Copia dati...');
    const [copyResult] = await connection.execute(`
      INSERT INTO \`${backupTableName}\` 
      SELECT * FROM fatt_handling
    `);
    console.log(`✅ Dati copiati: ${copyResult.affectedRows} record`);
    
    // 3. Verifica conteggio record
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM \`${backupTableName}\`
    `);
    const backupCount = countResult[0].count;
    
    const [originalCountResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM fatt_handling
    `);
    const originalCount = originalCountResult[0].count;
    
    console.log(`\n📊 Verifica conteggio:`);
    console.log(`   Originale: ${originalCount} record`);
    console.log(`   Backup: ${backupCount} record`);
    
    if (backupCount === originalCount) {
      console.log('✅ Backup completato con successo!');
      console.log(`\n📝 Nome tabella backup: ${backupTableName}`);
      console.log(`\n⚠️  IMPORTANTE: Salva questo nome per eventuale ripristino!`);
    } else {
      console.log('⚠️  ATTENZIONE: Il numero di record non corrisponde!');
    }
    
    // 4. Salva informazioni backup in file JSON
    const backupInfo = {
      timestamp: new Date().toISOString(),
      backupTableName: backupTableName,
      originalTableName: 'fatt_handling',
      recordCount: backupCount,
      originalRecordCount: originalCount,
      migration: 'add_mese_anno_fatturazione_to_fatt_handling'
    };
    
    const backupInfoPath = path.join(__dirname, `backup-info-handling-${timestamp}.json`);
    fs.writeFileSync(backupInfoPath, JSON.stringify(backupInfo, null, 2));
    console.log(`\n💾 Informazioni backup salvate in: ${backupInfoPath}`);
    
  } catch (error) {
    console.error('❌ Errore durante il backup:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

// Esegui backup
backupTable()
  .then(() => {
    console.log('\n✅ Backup completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore durante il backup:', error);
    process.exit(1);
  });
