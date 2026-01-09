// Script per cancellare i dati con mese = 12 dalla tabella fatt_delivery
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function deleteDeliveryMese12() {
  let connection = null;
  
  try {
    // Connessione al database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestionelogistica',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
    });

    console.log('🔌 Connesso al database');

    // Prima conta i record da cancellare
    const [countRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM fatt_delivery WHERE mese = 12'
    );
    const countToDelete = countRows[0].count;
    
    console.log(`📊 Record trovati con mese = 12: ${countToDelete}`);

    if (countToDelete === 0) {
      console.log('✅ Nessun record da cancellare');
      return;
    }

    // Chiedi conferma (in un contesto reale potresti voler aggiungere un prompt)
    console.log(`⚠️  ATTENZIONE: Verranno cancellati ${countToDelete} record dalla tabella fatt_delivery`);
    
    // Esegui la cancellazione
    const [result] = await connection.execute(
      'DELETE FROM fatt_delivery WHERE mese = 12'
    );
    
    console.log(`✅ Cancellati ${result.affectedRows} record dalla tabella fatt_delivery`);
    
    // Verifica che siano stati cancellati
    const [verifyRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM fatt_delivery WHERE mese = 12'
    );
    const remaining = verifyRows[0].count;
    
    if (remaining === 0) {
      console.log('✅ Verifica: Tutti i record con mese = 12 sono stati cancellati');
    } else {
      console.log(`⚠️  Attenzione: Rimangono ancora ${remaining} record con mese = 12`);
    }

  } catch (error) {
    console.error('❌ Errore durante la cancellazione:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connessione chiusa');
    }
  }
}

// Esegui lo script
deleteDeliveryMese12()
  .then(() => {
    console.log('\n✅ Script completato con successo');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fallito:', error);
    process.exit(1);
  });
