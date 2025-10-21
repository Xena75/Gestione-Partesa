/**
 * Script di migrazione per aggiornare lo stato fatturazione dei preventivi rifiutati
 * Esegue l'aggiornamento di invoice_status = 'not_applicable' per tutti i preventivi con status = 'rejected'
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateRejectedQuotes() {
  let connection;
  
  try {
    // Connessione al database
    connection = await mysql.createConnection({
      host: process.env.VIAGGI_DB_HOST || 'localhost',
      user: process.env.VIAGGI_DB_USER || 'root',
      password: process.env.VIAGGI_DB_PASSWORD || '',
      database: process.env.VIAGGI_DB_NAME || 'viaggi_db',
      port: process.env.VIAGGI_DB_PORT || 3306
    });

    console.log('✅ Connesso al database');

    // 1. Verifica quanti record saranno interessati
    const [countResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total_rejected_quotes,
        SUM(CASE WHEN invoice_status IS NULL OR invoice_status = 'not_invoiced' THEN 1 ELSE 0 END) as quotes_to_update
      FROM maintenance_quotes 
      WHERE status = 'rejected'
    `);

    const { total_rejected_quotes, quotes_to_update } = countResult[0];
    
    console.log(`📊 Statistiche preventivi rifiutati:`);
    console.log(`   - Totale preventivi rifiutati: ${total_rejected_quotes}`);
    console.log(`   - Preventivi da aggiornare: ${quotes_to_update}`);

    if (quotes_to_update === 0) {
      console.log('✅ Nessun preventivo da aggiornare. Migrazione completata.');
      return;
    }

    // 2. Mostra alcuni esempi prima dell'aggiornamento
    const [examplesBefore] = await connection.execute(`
      SELECT 
        id,
        quote_number,
        status,
        invoice_status,
        updated_at
      FROM maintenance_quotes 
      WHERE status = 'rejected' AND (invoice_status IS NULL OR invoice_status = 'not_invoiced')
      LIMIT 5
    `);

    console.log(`\n📋 Esempi di preventivi che saranno aggiornati:`);
    examplesBefore.forEach(quote => {
      console.log(`   - ID: ${quote.id}, Numero: ${quote.quote_number}, Status: ${quote.status}, Invoice Status: ${quote.invoice_status || 'NULL'}`);
    });

    // 3. Esegui l'aggiornamento
    console.log(`\n🔄 Aggiornamento in corso...`);
    
    const [updateResult] = await connection.execute(`
      UPDATE maintenance_quotes 
      SET 
        invoice_status = 'not_applicable',
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        status = 'rejected' 
        AND (invoice_status IS NULL OR invoice_status = 'not_invoiced')
    `);

    console.log(`✅ Aggiornamento completato! Record modificati: ${updateResult.affectedRows}`);

    // 4. Verifica il risultato
    const [verificationResult] = await connection.execute(`
      SELECT 
        status,
        invoice_status,
        COUNT(*) as count
      FROM maintenance_quotes 
      WHERE status = 'rejected'
      GROUP BY status, invoice_status
    `);

    console.log(`\n📊 Verifica post-migrazione:`);
    verificationResult.forEach(row => {
      console.log(`   - Status: ${row.status}, Invoice Status: ${row.invoice_status}, Count: ${row.count}`);
    });

    // 5. Mostra alcuni esempi dopo l'aggiornamento
    const [examplesAfter] = await connection.execute(`
      SELECT 
        id,
        quote_number,
        status,
        invoice_status,
        updated_at
      FROM maintenance_quotes 
      WHERE status = 'rejected' AND invoice_status = 'not_applicable'
      LIMIT 5
    `);

    console.log(`\n📋 Esempi di preventivi aggiornati:`);
    examplesAfter.forEach(quote => {
      console.log(`   - ID: ${quote.id}, Numero: ${quote.quote_number}, Status: ${quote.status}, Invoice Status: ${quote.invoice_status}`);
    });

    console.log(`\n🎉 Migrazione completata con successo!`);

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connessione al database chiusa');
    }
  }
}

// Esegui la migrazione
if (require.main === module) {
  migrateRejectedQuotes()
    .then(() => {
      console.log('✅ Script completato');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script fallito:', error);
      process.exit(1);
    });
}

module.exports = { migrateRejectedQuotes };