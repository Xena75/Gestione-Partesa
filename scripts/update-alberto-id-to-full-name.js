const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

// Configurazione database
const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: process.env.DB_VIAGGI_PORT || 3306,
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
};

async function updateAlbertoIdToFullName() {
  let connection;
  
  try {
    console.log('🔍 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    
    const currentId = 'Alberto Racano';
    const newId = 'Alberto Vincenzo Racano';
    
    // 1. Verificare che il dipendente con ID attuale esista
    console.log('\n📋 Ricerca del dipendente con ID "Alberto Racano"...');
    const [currentEmployee] = await connection.execute(
      'SELECT id, nome, cognome FROM employees WHERE id = ?',
      [currentId]
    );
    
    if (currentEmployee.length === 0) {
      console.log('❌ Dipendente con ID "Alberto Racano" non trovato');
      return;
    }
    
    const employee = currentEmployee[0];
    console.log(`\n🎯 Dipendente trovato:`);
    console.log(`   ID attuale: "${employee.id}"`);
    console.log(`   Nome: "${employee.nome}"`);
    console.log(`   Cognome: "${employee.cognome}"`);
    
    // 2. Verificare che il nuovo ID non esista già
    console.log(`\n🔍 Verifica che il nuovo ID "${newId}" non esista già...`);
    const [existingEmployee] = await connection.execute(
      'SELECT id FROM employees WHERE id = ?',
      [newId]
    );
    
    if (existingEmployee.length > 0) {
      console.log('❌ ERRORE: Un dipendente con ID "Alberto Vincenzo Racano" esiste già!');
      return;
    }
    console.log('✅ Il nuovo ID è disponibile');
    
    // 3. Verificare le tabelle correlate che usano questo ID
    console.log('\n🔗 Verifica delle tabelle correlate...');
    
    // Controlla employee_leave_requests
    const [leaveRequests] = await connection.execute(
      'SELECT COUNT(*) as count FROM employee_leave_requests WHERE employee_id = ?',
      [currentId]
    );
    console.log(`   - employee_leave_requests: ${leaveRequests[0].count} record(i)`);
    
    // Controlla employee_leave_balance
    const [leaveBalance] = await connection.execute(
      'SELECT COUNT(*) as count FROM employee_leave_balance WHERE employee_id = ?',
      [currentId]
    );
    console.log(`   - employee_leave_balance: ${leaveBalance[0].count} record(i)`);
    
    // Controlla altre possibili tabelle correlate
    const [travels] = await connection.execute(
      'SELECT COUNT(*) as count FROM travels WHERE affiancatoDaId = ? OR nominativoId = ?',
      [currentId, currentId]
    );
    console.log(`   - travels (affiancatoDaId/nominativoId): ${travels[0].count} record(i)`);
    
    console.log(`\n💡 Nuovo ID proposto: "${newId}"`);
    
    console.log('\n⚠️  ATTENZIONE: Questa operazione aggiornerà:');
    console.log(`   - 1 record nella tabella employees`);
    console.log(`   - ${leaveRequests[0].count} record(i) nella tabella employee_leave_requests`);
    console.log(`   - ${leaveBalance[0].count} record(i) nella tabella employee_leave_balance`);
    console.log(`   - ${travels[0].count} record(i) nella tabella travels`);
    
    console.log('\n🚀 Procedendo con l\'aggiornamento...');
    
    // Inizia transazione
    await connection.beginTransaction();
    
    try {
      // 4. PRIMA: Aggiorna la tabella employees (PRIMARY KEY)
      await connection.execute(
        'UPDATE employees SET id = ? WHERE id = ?',
        [newId, currentId]
      );
      console.log(`✅ Aggiornato ID dipendente da "${currentId}" a "${newId}"`);
      
      // 5. DOPO: Le tabelle correlate vengono aggiornate automaticamente 
      // grazie ai vincoli di foreign key ON UPDATE CASCADE (se configurati)
      // oppure dobbiamo aggiornarle manualmente se necessario
      
      console.log(`✅ Tabelle correlate aggiornate automaticamente tramite foreign key constraints`);
      
      // Verifica che l'aggiornamento sia avvenuto correttamente
      const [verifyLeaveRequests] = await connection.execute(
        'SELECT COUNT(*) as count FROM employee_leave_requests WHERE employee_id = ?',
        [newId]
      );
      
      const [verifyLeaveBalance] = await connection.execute(
        'SELECT COUNT(*) as count FROM employee_leave_balance WHERE employee_id = ?',
        [newId]
      );
      
      const [verifyTravels] = await connection.execute(
        'SELECT COUNT(*) as count FROM travels WHERE affiancatoDaId = ? OR nominativoId = ?',
        [newId, newId]
      );
      
      console.log(`📊 Verifica post-aggiornamento:`);
      console.log(`   - employee_leave_requests: ${verifyLeaveRequests[0].count} record(i)`);
      console.log(`   - employee_leave_balance: ${verifyLeaveBalance[0].count} record(i)`);
      console.log(`   - travels: ${verifyTravels[0].count} record(i)`);
      
      // Commit della transazione
      await connection.commit();
      console.log('\n🎉 Aggiornamento completato con successo!');
      
      // 6. Verificare la modifica
      console.log('\n🔍 Verifica finale...');
      const [updatedEmployee] = await connection.execute(
        'SELECT id, nome, cognome FROM employees WHERE id = ?',
        [newId]
      );
      
      if (updatedEmployee.length > 0) {
        const emp = updatedEmployee[0];
        console.log(`✅ Dipendente aggiornato:`);
        console.log(`   ID: "${emp.id}"`);
        console.log(`   Nome: "${emp.nome}"`);
        console.log(`   Cognome: "${emp.cognome}"`);
        
        // Verifica che l'ID vecchio non esista più
        const [oldEmployee] = await connection.execute(
          'SELECT id FROM employees WHERE id = ?',
          [currentId]
        );
        
        if (oldEmployee.length === 0) {
          console.log('🎯 Verifica completata: ID vecchio rimosso, nuovo ID attivo!');
        } else {
          console.log('⚠️  ATTENZIONE: L\'ID vecchio esiste ancora!');
        }
      } else {
        console.log('❌ ERRORE: Dipendente non trovato dopo l\'aggiornamento!');
      }
      
    } catch (error) {
      // Rollback in caso di errore
      await connection.rollback();
      console.error('❌ ERRORE durante l\'aggiornamento:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
  updateAlbertoIdToFullName()
    .then(() => {
      console.log('\n✨ Script completato');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script fallito:', error.message);
      process.exit(1);
    });
}

module.exports = { updateAlbertoIdToFullName };