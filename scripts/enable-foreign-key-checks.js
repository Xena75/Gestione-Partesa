const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

async function enableForeignKeyChecks() {
  let connection;
  
  try {
    console.log('🔍 Connessione al database...');
    
    // Connessione al database
    connection = await mysql.createConnection({
      host: process.env.DB_VIAGGI_HOST,
      user: process.env.DB_VIAGGI_USER,
      password: process.env.DB_VIAGGI_PASS,
      database: process.env.DB_VIAGGI_NAME,
      port: process.env.DB_VIAGGI_PORT
    });

    console.log('✅ Connesso al database viaggi_db');

    // 1. Verifica lo stato attuale dei controlli foreign key
    console.log('\n📋 Verifica stato attuale dei controlli foreign key...');
    const [currentStatus] = await connection.execute(
      "SHOW VARIABLES LIKE 'foreign_key_checks'"
    );
    
    if (currentStatus.length > 0) {
      const status = currentStatus[0].Value;
      const isEnabled = status === '1' || status.toUpperCase() === 'ON';
      console.log(`   Stato attuale: ${isEnabled ? '✅ ABILITATI' : '❌ DISABILITATI'} (${status})`);
      
      if (isEnabled) {
        console.log('✅ I controlli delle foreign key sono già abilitati!');
        console.log('   Il database applica correttamente tutti i vincoli di integrità referenziale.');
        return;
      }
    }

    // 2. Riabilita i controlli delle foreign key
    console.log('\n🔧 Riabilitazione controlli foreign key...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Comando SET FOREIGN_KEY_CHECKS = 1 eseguito');

    // 3. Verifica che siano stati riabilitati
    console.log('\n🔍 Verifica post-riabilitazione...');
    const [newStatus] = await connection.execute(
      "SHOW VARIABLES LIKE 'foreign_key_checks'"
    );
    
    if (newStatus.length > 0) {
      const status = newStatus[0].Value;
      const isEnabled = status === '1' || status.toUpperCase() === 'ON';
      console.log(`   Nuovo stato: ${isEnabled ? '✅ ABILITATI' : '❌ DISABILITATI'} (${status})`);
      
      if (isEnabled) {
        console.log('\n🎉 Controlli foreign key riabilitati con successo!');
        console.log('   Il database ora applicherà tutti i vincoli di integrità referenziale.');
      } else {
        console.log('\n❌ Errore: I controlli non sono stati riabilitati correttamente');
      }
    }

    // 4. Informazioni aggiuntive
    console.log('\n📝 Informazioni:');
    console.log('   - I controlli foreign key garantiscono l\'integrità referenziale');
    console.log('   - Prevengono operazioni che violerebbero i vincoli tra tabelle');
    console.log('   - È importante mantenerli sempre abilitati in produzione');

  } catch (error) {
    console.error('❌ Errore durante la riabilitazione:', error.message);
    
    // Tentativo di riabilitazione di emergenza
    if (connection) {
      try {
        console.log('\n🚨 Tentativo di riabilitazione di emergenza...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Riabilitazione di emergenza completata');
      } catch (emergencyError) {
        console.error('❌ Errore anche nella riabilitazione di emergenza:', emergencyError.message);
      }
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

// Esegui lo script
console.log('🔧 Script per riabilitazione controlli Foreign Key');
console.log('=' .repeat(50));
enableForeignKeyChecks();