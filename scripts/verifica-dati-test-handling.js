const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestionelogistica',
};

async function verificaDati() {
  let connection = null;
  
  try {
    console.log('🔍 Verifica dati nella tabella fatt_handling...');
    console.log('='.repeat(60));
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database:', dbConfig.database);
    
    // Verifica se ci sono record con source_name del file di test
    const [testRows] = await connection.execute(
      `SELECT COUNT(*) as count, source_name, mese
       FROM fatt_handling 
       WHERE source_name LIKE '%Handling_da_importare%' 
          OR source_name LIKE '%Futura_Dicembre%'
       GROUP BY source_name, mese`
    );
    
    if (testRows.length > 0) {
      console.log('\n⚠️  TROVATI RECORD POTENZIALMENTE DAL TEST:');
      testRows.forEach(row => {
        console.log(`   - source_name: "${row.source_name}"`);
        console.log(`     mese: ${row.mese}`);
        console.log(`     count: ${row.count} record`);
      });
      
      // Chiedi conferma per eliminare
      console.log('\n🗑️  Vuoi eliminare questi record?');
      console.log('   (Lo script di test ha fatto rollback, quindi questi potrebbero essere dati precedenti)');
      
      // Mostra anche i record con mese 12 e source_name che inizia con "Futura"
      const [mese12Rows] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM fatt_handling 
         WHERE mese = 12 
           AND (source_name LIKE 'Futura%' OR source_name LIKE '%Dicembre%')`
      );
      
      console.log(`\n📋 Record con mese=12 e source_name "Futura" o "Dicembre": ${mese12Rows[0].count}`);
      
    } else {
      console.log('\n✅ Nessun record trovato con source_name del file di test');
      console.log('   Il test ha fatto rollback correttamente, nessun dato inserito.');
    }
    
    // Mostra statistiche generali
    const [totalRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM fatt_handling'
    );
    console.log(`\n📊 Totale record nella tabella fatt_handling: ${totalRows[0].count}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificaDati().catch(console.error);
