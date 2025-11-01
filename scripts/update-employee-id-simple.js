const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

async function updateEmployeeId() {
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

    console.log('✅ Connesso al database');

    // Verifica che il dipendente esista
    const [existing] = await connection.execute(
      'SELECT id, nome, cognome FROM employees WHERE id = ?',
      ['Alberto Racano']
    );

    if (existing.length === 0) {
      console.log('❌ Dipendente con ID "Alberto Racano" non trovato');
      return;
    }

    console.log('🎯 Dipendente trovato:');
    console.log(`   ID attuale: "${existing[0].id}"`);
    console.log(`   Nome: "${existing[0].nome}"`);
    console.log(`   Cognome: "${existing[0].cognome}"`);

    // Verifica che il nuovo ID non esista già
    const [newIdCheck] = await connection.execute(
      'SELECT id FROM employees WHERE id = ?',
      ['Alberto Vincenzo Racano']
    );

    if (newIdCheck.length > 0) {
      console.log('❌ Un dipendente con ID "Alberto Vincenzo Racano" esiste già');
      return;
    }

    console.log('\n🚀 Aggiornamento ID dipendente e tabelle correlate...');

    // Inizia transazione
    await connection.beginTransaction();
    
    try {
      // Disabilita temporaneamente i controlli delle foreign key
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      console.log('⚠️  Foreign key checks disabilitati temporaneamente');

      // 1. Aggiorna travels (affiancatoDaId)
      const [travelsAffResult] = await connection.execute(
        'UPDATE travels SET affiancatoDaId = ? WHERE affiancatoDaId = ?',
        ['Alberto Vincenzo Racano', 'Alberto Racano']
      );
      console.log(`✅ Aggiornati ${travelsAffResult.affectedRows} record in travels (affiancatoDaId)`);

      // 2. Aggiorna travels (nominativoId)
      const [travelsNomResult] = await connection.execute(
        'UPDATE travels SET nominativoId = ? WHERE nominativoId = ?',
        ['Alberto Vincenzo Racano', 'Alberto Racano']
      );
      console.log(`✅ Aggiornati ${travelsNomResult.affectedRows} record in travels (nominativoId)`);

      // 3. Aggiorna employee_leave_requests
      const [leaveReqResult] = await connection.execute(
        'UPDATE employee_leave_requests SET employee_id = ? WHERE employee_id = ?',
        ['Alberto Vincenzo Racano', 'Alberto Racano']
      );
      console.log(`✅ Aggiornati ${leaveReqResult.affectedRows} record in employee_leave_requests`);

      // 4. Aggiorna employee_leave_balance
      const [leaveBalResult] = await connection.execute(
        'UPDATE employee_leave_balance SET employee_id = ? WHERE employee_id = ?',
        ['Alberto Vincenzo Racano', 'Alberto Racano']
      );
      console.log(`✅ Aggiornati ${leaveBalResult.affectedRows} record in employee_leave_balance`);

      // 5. Aggiorna la tabella employees (ultimo)
      const [result] = await connection.execute(
        'UPDATE employees SET id = ? WHERE id = ?',
        ['Alberto Vincenzo Racano', 'Alberto Racano']
      );
      console.log(`✅ Aggiornato ${result.affectedRows} record in employees`);

      // Riabilita i controlli delle foreign key
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Foreign key checks riabilitati');

      // Commit della transazione
      await connection.commit();
      console.log('✅ Transazione completata con successo!');

      if (result.affectedRows > 0) {
        console.log('\n🎉 ID aggiornato con successo!');
        console.log(`   Da: "Alberto Racano"`);
        console.log(`   A: "Alberto Vincenzo Racano"`);
        
        // Verifica l'aggiornamento
        const [updated] = await connection.execute(
          'SELECT id, nome, cognome FROM employees WHERE id = ?',
          ['Alberto Vincenzo Racano']
        );
        
        if (updated.length > 0) {
          console.log('\n📋 Verifica post-aggiornamento:');
          console.log(`   ID: "${updated[0].id}"`);
          console.log(`   Nome: "${updated[0].nome}"`);
          console.log(`   Cognome: "${updated[0].cognome}"`);
        }
      } else {
        console.log('❌ Nessun record aggiornato');
      }

    } catch (transactionError) {
      // Rollback in caso di errore
      await connection.rollback();
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

// Esegui lo script
updateEmployeeId();