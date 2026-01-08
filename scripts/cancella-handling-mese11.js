const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function cancellaHandlingMese11() {
  let connection = null;
  
  try {
    console.log('🗑️  CANCELLAZIONE DATI HANDLING MESE 11\n');
    console.log('='.repeat(80));
    
    // Connetti al database
    console.log(`\n🔌 Connessione al database...`);
    connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Connesso al database ${dbConfig.database}`);
    
    // Verifica quanti record ci sono per il mese 11
    console.log(`\n📊 Verifica record esistenti per il mese 11...`);
    
    const [countResult] = await connection.execute(
      `SELECT 
        COUNT(*) as totale,
        MIN(id) as min_id,
        MAX(id) as max_id,
        SUM(tot_hand) as totale_tot_hand,
        source_name,
        COUNT(DISTINCT source_name) as file_diversi
      FROM fatt_handling 
      WHERE mese = 11`
    );
    
    const stats = countResult[0];
    
    console.log(`\n📋 STATISTICHE RECORD MESE 11:`);
    console.log(`   Totale record: ${stats.totale}`);
    console.log(`   ID minimo: ${stats.min_id}`);
    console.log(`   ID massimo: ${stats.max_id}`);
    console.log(`   Totale tot_hand: ${parseFloat(stats.totale_tot_hand || 0).toFixed(4)}`);
    console.log(`   File importati: ${stats.file_diversi}`);
    
    // Mostra i file importati
    const [fileStats] = await connection.execute(
      `SELECT 
        source_name,
        COUNT(*) as count,
        SUM(tot_hand) as totale_tot_hand
      FROM fatt_handling 
      WHERE mese = 11
      GROUP BY source_name
      ORDER BY count DESC`
    );
    
    if (fileStats.length > 0) {
      console.log(`\n📁 FILE IMPORTATI:`);
      fileStats.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.source_name}: ${file.count} righe (tot_hand: ${parseFloat(file.totale_tot_hand || 0).toFixed(4)})`);
      });
    }
    
    if (stats.totale === 0) {
      console.log(`\n✅ Nessun record trovato per il mese 11. Niente da cancellare.`);
      return;
    }
    
    // Avviso importante
    console.log(`\n${'='.repeat(80)}`);
    console.log(`⚠️  ATTENZIONE:`);
    console.log(`   Verranno cancellati ${stats.totale} record del mese 11.`);
    console.log(`   Questa operazione NON può essere annullata!`);
    console.log(`\n   Dopo la cancellazione, potrai rifare l'import tramite:`);
    console.log(`   - Pagina web: http://localhost:3001/handling`);
    console.log(`   - Pulsante "Importa Excel"`);
    console.log(`   - File: import/Mensili/handling importato.xlsx`);
    console.log(`\n${'='.repeat(80)}`);
    
    // Esegui la cancellazione
    console.log(`\n🗑️  Esecuzione cancellazione...`);
    
    const [deleteResult] = await connection.execute(
      `DELETE FROM fatt_handling WHERE mese = 11`
    );
    
    const righeCancellate = deleteResult.affectedRows;
    
    console.log(`\n✅ CANCELLAZIONE COMPLETATA:`);
    console.log(`   Record cancellati: ${righeCancellate}`);
    
    // Verifica che siano stati cancellati
    const [verifyResult] = await connection.execute(
      `SELECT COUNT(*) as totale FROM fatt_handling WHERE mese = 11`
    );
    
    const rimasti = verifyResult[0].totale;
    
    if (rimasti === 0) {
      console.log(`   ✅ Verifica: Nessun record rimasto per il mese 11`);
    } else {
      console.log(`   ⚠️  Attenzione: Rimangono ${rimasti} record per il mese 11`);
    }
    
    console.log(`\n📝 PROSSIMI PASSI:`);
    console.log(`   1. Vai su http://localhost:3001/handling`);
    console.log(`   2. Clicca sul pulsante "Importa Excel"`);
    console.log(`   3. Seleziona il file: import/Mensili/handling importato.xlsx`);
    console.log(`   4. Attendi il completamento dell'import`);
    console.log(`   5. Verifica che il totale tot_hand corrisponda: 193983.0145`);
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
    if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      console.error('\n⚠️  Timeout: Il database è occupato. Riprova tra qualche secondo.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Esegui la cancellazione
cancellaHandlingMese11().catch(console.error);

