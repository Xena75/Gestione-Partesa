/**
 * Script per creare un backup della tabella fatt_delivery prima della migration
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_DB || 'gestionelogistica',
  multipleStatements: true
};

async function backupTable() {
  let connection = null;
  
  try {
    console.log('🔄 Creazione backup tabella fatt_delivery\n');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database\n');
    
    // Usa un formato timestamp compatibile con MySQL (solo numeri e underscore)
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').replace(/\./g, '_').slice(0, 19);
    const backupTableName = `fatt_delivery_backup_${timestamp}`;
    
    console.log(`📋 Nome tabella backup: ${backupTableName}\n`);
    
    // Crea la tabella di backup con la stessa struttura
    console.log('1️⃣ Creazione struttura tabella backup...');
    await connection.execute(`
      CREATE TABLE \`${backupTableName}\` LIKE fatt_delivery
    `);
    console.log('   ✅ Struttura creata\n');
    
    // Copia tutti i dati (escludendo colonne generate: mese, anno, settimana, ID_fatt)
    // Queste verranno calcolate automaticamente dalla tabella di backup
    console.log('2️⃣ Copia dati...');
    const [result] = await connection.execute(`
      INSERT INTO \`${backupTableName}\` (
        id, source_name, appalto, ordine, cod_vettore, descr_vettore, viaggio, 
        consegna_num, cod_cliente, ragione_sociale, cod_articolo, descr_articolo,
        gr_stat, descr_gruppo_st, classe_prod, descr_classe_prod, classe_tariffa,
        anomalia, data_mov_merce, colli, tariffa, tariffa_vuoti, compenso,
        tr_cons, tot_compenso, bu, \`div\`, dep, tipologia, cod_em_fat,
        emittente_fattura, oda
      )
      SELECT 
        id, source_name, appalto, ordine, cod_vettore, descr_vettore, viaggio,
        consegna_num, cod_cliente, ragione_sociale, cod_articolo, descr_articolo,
        gr_stat, descr_gruppo_st, classe_prod, descr_classe_prod, classe_tariffa,
        anomalia, data_mov_merce, colli, tariffa, tariffa_vuoti, compenso,
        tr_cons, tot_compenso, bu, \`div\`, dep, tipologia, cod_em_fat,
        emittente_fattura, oda
      FROM fatt_delivery
    `);
    const rowCount = result.affectedRows || 0;
    console.log(`   ✅ ${rowCount.toLocaleString('it-IT')} record copiati\n`);
    
    // Verifica che il backup sia completo
    console.log('3️⃣ Verifica integrità backup...');
    const [originalCount] = await connection.execute('SELECT COUNT(*) as count FROM fatt_delivery');
    const [backupCount] = await connection.execute(`SELECT COUNT(*) as count FROM \`${backupTableName}\``);
    
    const originalRows = originalCount[0].count;
    const backupRows = backupCount[0].count;
    
    console.log(`   Record originali: ${originalRows.toLocaleString('it-IT')}`);
    console.log(`   Record nel backup: ${backupRows.toLocaleString('it-IT')}`);
    
    if (originalRows === backupRows) {
      console.log('   ✅ Backup completato con successo!\n');
    } else {
      console.log('   ⚠️ ATTENZIONE: Il numero di record non corrisponde!\n');
    }
    
    // Salva informazioni sul backup in un file
    const backupInfo = {
      timestamp: new Date().toISOString(),
      backupTableName: backupTableName,
      originalRows: originalRows,
      backupRows: backupRows,
      status: originalRows === backupRows ? 'success' : 'warning'
    };
    
    const backupInfoPath = path.join(__dirname, '..', 'backups', 'fatt_delivery_backup_info.json');
    await fs.mkdir(path.dirname(backupInfoPath), { recursive: true });
    await fs.writeFile(backupInfoPath, JSON.stringify(backupInfo, null, 2));
    
    console.log('📄 Informazioni backup salvate in: backups/fatt_delivery_backup_info.json\n');
    
    console.log('✅ Backup completato!');
    console.log(`\n💾 Tabella backup: ${backupTableName}`);
    console.log(`\n⚠️ IMPORTANTE: Per ripristinare il backup, usa:`);
    console.log(`   DROP TABLE IF EXISTS fatt_delivery;`);
    console.log(`   RENAME TABLE \`${backupTableName}\` TO fatt_delivery;\n`);
    
  } catch (error) {
    console.error('❌ Errore durante il backup:', error);
    
    // Se la tabella di backup esiste ma c'è stato un errore, eliminala
    if (connection) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupTableName = `fatt_delivery_backup_${timestamp}`;
        await connection.execute(`DROP TABLE IF EXISTS \`${backupTableName}\``);
        console.log('🗑️ Tabella backup incompleta eliminata');
      } catch (e) {
        // Ignora
      }
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

backupTable()
  .then(() => {
    console.log('\n✅ Script completato');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });
