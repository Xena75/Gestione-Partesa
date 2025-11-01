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

async function updateAlbertoRacanoId() {
  let connection;
  
  try {
    console.log('🔍 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Cercare Alberto Racano nella tabella employees
    console.log('\n📋 Ricerca di Alberto Racano...');
    const [employees] = await connection.execute(
      'SELECT id, nome, cognome FROM employees WHERE id = ? OR (nome LIKE ? AND cognome = ?)',
      ['Alberto Racano', '%Alberto%', 'Racano']
    );
    
    if (employees.length === 0) {
      console.log('❌ Nessun dipendente trovato con ID "Alberto Racano" o nome Alberto e cognome Racano');
      return;
    }
    
    console.log('\n📊 Dipendenti trovati:');
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ID: "${emp.id}" - Nome: "${emp.nome}" - Cognome: "${emp.cognome}"`);
    });
    
    // Trova specificamente Alberto Racano (ID attuale)
    const targetEmployee = employees.find(emp => 
      emp.id === 'Alberto Racano' || (emp.nome.includes('Alberto') && emp.cognome === 'Racano')
    );
    
    if (!targetEmployee) {
      console.log('❌ Alberto Racano non trovato');
      return;
    }
    
    const currentId = targetEmployee.id;
    console.log(`\n🎯 Dipendente target trovato:`);
    console.log(`   ID attuale: "${currentId}"`);
    console.log(`   Nome: "${targetEmployee.nome}"`);
    console.log(`   Cognome: "${targetEmployee.cognome}"`);
    
    // 2. Verificare le tabelle correlate che usano questo ID
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
    
    // 3. Proporre il nuovo ID corretto
    const newId = 'Alberto Racano Vincenzo';
    console.log(`\n💡 ID proposto: "${newId}"`);
    
    // Verifica se il nuovo ID esiste già
    const [existingEmployee] = await connection.execute(
      'SELECT id FROM employees WHERE id = ?',
      [newId]
    );
    
    if (existingEmployee.length > 0) {
      console.log('❌ ERRORE: Un dipendente con questo ID esiste già!');
      return;
    }
    
    console.log('\n⚠️  ATTENZIONE: Questa operazione aggiornerà:');
    console.log(`   - 1 record nella tabella employees`);
    console.log(`   - ${leaveRequests[0].count} record(i) nella tabella employee_leave_requests`);
    console.log(`   - ${leaveBalance[0].count} record(i) nella tabella employee_leave_balance`);
    
    // Simulazione - in un ambiente reale dovresti chiedere conferma
    console.log('\n🚀 Procedendo con l\'aggiornamento...');
    
    // Inizia transazione
    await connection.beginTransaction();
    
    try {
      // 4. Aggiornare le tabelle correlate prima (foreign keys)
      if (leaveRequests[0].count > 0) {
        await connection.execute(
          'UPDATE employee_leave_requests SET employee_id = ? WHERE employee_id = ?',
          [newId, currentId]
        );
        console.log(`✅ Aggiornati ${leaveRequests[0].count} record(i) in employee_leave_requests`);
      }
      
      if (leaveBalance[0].count > 0) {
        await connection.execute(
          'UPDATE employee_leave_balance SET employee_id = ? WHERE employee_id = ?',
          [newId, currentId]
        );
        console.log(`✅ Aggiornati ${leaveBalance[0].count} record(i) in employee_leave_balance`);
      }
      
      // 5. Aggiornare la tabella employees (primary key)
      await connection.execute(
        'UPDATE employees SET id = ? WHERE id = ?',
        [newId, currentId]
      );
      console.log('✅ Aggiornato record in employees');
      
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
  updateAlbertoRacanoId()
    .then(() => {
      console.log('\n✨ Script completato');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script fallito:', error.message);
      process.exit(1);
    });
}

module.exports = { updateAlbertoRacanoId };