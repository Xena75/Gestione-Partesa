const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function popolaTariffa() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();
    
    console.log('📥 Recupero record senza Tariffa...');
    
    // Recupera tutti i record che hanno ID_TARIFFA ma Tariffa NULL o 0
    const [records] = await connection.execute(`
      SELECT id, ID_TARIFFA 
      FROM resi_vuoti_non_fatturati 
      WHERE ID_TARIFFA IS NOT NULL 
        AND (Tariffa IS NULL OR Tariffa = 0)
    `);
    
    console.log(`📊 Trovati ${records.length} record da aggiornare\n`);
    
    let updated = 0;
    let notFound = 0;
    
    for (const record of records) {
      if (!record.ID_TARIFFA) {
        continue;
      }
      
      // Recupera Tariffa da tab_tariffe
      const [tariffaRows] = await connection.execute(
        `SELECT Tariffa 
         FROM tab_tariffe 
         WHERE ID_Fatt = ? 
         LIMIT 1`,
        [record.ID_TARIFFA]
      );
      
      if (tariffaRows && tariffaRows.length > 0) {
        const tariffa = parseFloat(tariffaRows[0].Tariffa);
        
        if (!isNaN(tariffa)) {
          // Aggiorna il record con la tariffa
          await connection.execute(
            `UPDATE resi_vuoti_non_fatturati 
             SET Tariffa = ? 
             WHERE id = ?`,
            [tariffa, record.id]
          );
          
          // Ricalcola anche Totale_compenso se necessario
          const [currentRecord] = await connection.execute(
            `SELECT Colli, Totale_compenso FROM resi_vuoti_non_fatturati WHERE id = ?`,
            [record.id]
          );
          
          if (currentRecord && currentRecord.length > 0) {
            const colli = currentRecord[0].Colli;
            const nuovoTotaleCompenso = colli * tariffa;
            
            await connection.execute(
              `UPDATE resi_vuoti_non_fatturati 
               SET Totale_compenso = ? 
               WHERE id = ?`,
              [nuovoTotaleCompenso, record.id]
            );
          }
          
          updated++;
          if (updated % 50 === 0) {
            console.log(`   ✅ Aggiornati ${updated} record...`);
          }
        } else {
          notFound++;
        }
      } else {
        notFound++;
        console.log(`   ⚠️  ID_TARIFFA ${record.ID_TARIFFA} non trovato in tab_tariffe`);
      }
    }
    
    await connection.commit();
    
    console.log(`\n✅ Completato!`);
    console.log(`   - Record aggiornati: ${updated}`);
    console.log(`   - Tariffe non trovate: ${notFound}`);
    
    // Verifica risultato
    const [check] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(Tariffa) as con_tariffa,
        COUNT(*) - COUNT(Tariffa) as senza_tariffa
      FROM resi_vuoti_non_fatturati
      WHERE ID_TARIFFA IS NOT NULL
    `);
    
    console.log(`\n📊 Verifica finale:`);
    console.log(`   - Totale record con ID_TARIFFA: ${check[0].total}`);
    console.log(`   - Record con Tariffa popolata: ${check[0].con_tariffa}`);
    console.log(`   - Record senza Tariffa: ${check[0].senza_tariffa}`);
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Errore:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

popolaTariffa();

