const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function correggiMeseNull() {
  let connection = null;
  
  try {
    console.log('🔧 CORREZIONE MESE NULL PER HANDLING NOVEMBRE\n');
    console.log('='.repeat(80));
    
    connection = await mysql.createConnection(dbConfig);
    
    // Verifica record con mese NULL e source_name Futura_Novembre.xlsx
    const [verifica] = await connection.execute(
      `SELECT 
        COUNT(*) as totale,
        SUM(tot_hand) as totale_tot_hand,
        MIN(id) as min_id,
        MAX(id) as max_id
      FROM fatt_handling 
      WHERE mese IS NULL 
      AND source_name = 'Futura_Novembre.xlsx'`
    );
    
    const stats = verifica[0];
    
    console.log(`\n📊 RECORD DA CORREGGERE:`);
    console.log(`   Totale: ${stats.totale}`);
    console.log(`   Totale tot_hand: ${parseFloat(stats.totale_tot_hand || 0).toFixed(4)}`);
    console.log(`   ID Range: ${stats.min_id} - ${stats.max_id}`);
    
    if (stats.totale === 0) {
      console.log(`\n✅ Nessun record da correggere!`);
      return;
    }
    
    console.log(`\n⚠️  ATTENZIONE:`);
    console.log(`   Verranno aggiornati ${stats.totale} record impostando mese = 11`);
    console.log(`   per i record con source_name = 'Futura_Novembre.xlsx' e mese IS NULL`);
    
    // Esegui l'aggiornamento
    console.log(`\n🔧 Esecuzione correzione...`);
    
    const [updateResult] = await connection.execute(
      `UPDATE fatt_handling 
       SET mese = 11 
       WHERE mese IS NULL 
       AND source_name = 'Futura_Novembre.xlsx'`
    );
    
    const righeAggiornate = updateResult.affectedRows;
    
    console.log(`\n✅ CORREZIONE COMPLETATA:`);
    console.log(`   Record aggiornati: ${righeAggiornate}`);
    
    // Verifica risultato
    const [verificaFinale] = await connection.execute(
      `SELECT 
        COUNT(*) as totale,
        SUM(tot_hand) as totale_tot_hand
      FROM fatt_handling 
      WHERE mese = 11`
    );
    
    const finale = verificaFinale[0];
    
    console.log(`\n📊 VERIFICA FINALE (mese 11):`);
    console.log(`   Totale record: ${finale.totale}`);
    console.log(`   Totale tot_hand: ${parseFloat(finale.totale_tot_hand || 0).toFixed(4)}`);
    
    if (finale.totale === righeAggiornate) {
      console.log(`\n✅ Tutti i record sono stati corretti correttamente!`);
      console.log(`   Ora dovresti vedere i dati nella pagina /handling filtrando per mese 11`);
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

correggiMeseNull().catch(console.error);

