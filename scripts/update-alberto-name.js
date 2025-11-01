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

async function updateAlbertoName() {
  let connection;
  
  try {
    console.log('🔍 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Cercare Alberto Racano nella tabella employees
    console.log('\n📋 Ricerca di Alberto Racano...');
    const [employees] = await connection.execute(
      'SELECT id, nome, cognome FROM employees WHERE nome LIKE ? AND cognome = ?',
      ['%Alberto%', 'Racano']
    );
    
    if (employees.length === 0) {
      console.log('❌ Nessun dipendente trovato con nome Alberto e cognome Racano');
      return;
    }
    
    console.log('\n📊 Dipendenti trovati:');
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ID: "${emp.id}" - Nome: "${emp.nome}" - Cognome: "${emp.cognome}"`);
    });
    
    // Trova specificamente Alberto con cognome Racano
    const targetEmployee = employees.find(emp => 
      emp.nome.includes('Alberto') && emp.cognome === 'Racano'
    );
    
    if (!targetEmployee) {
      console.log('❌ Alberto Racano non trovato');
      return;
    }
    
    console.log(`\n🎯 Dipendente target trovato:`);
    console.log(`   ID: "${targetEmployee.id}"`);
    console.log(`   Nome attuale: "${targetEmployee.nome}"`);
    console.log(`   Cognome attuale: "${targetEmployee.cognome}"`);
    
    // 2. Definire i nuovi valori
    const newNome = 'Alberto Vincenzo';
    const newCognome = 'Racano'; // Rimane uguale
    
    console.log(`\n💡 Nuovi valori proposti:`);
    console.log(`   Nome: "${newNome}"`);
    console.log(`   Cognome: "${newCognome}"`);
    
    // Verifica se il nome è già corretto
    if (targetEmployee.nome === newNome && targetEmployee.cognome === newCognome) {
      console.log('✅ Il nome è già corretto, nessuna modifica necessaria!');
      return;
    }
    
    console.log('\n⚠️  ATTENZIONE: Questa operazione aggiornerà:');
    console.log(`   - Il nome da "${targetEmployee.nome}" a "${newNome}"`);
    console.log(`   - Il cognome rimane "${newCognome}"`);
    
    console.log('\n🚀 Procedendo con l\'aggiornamento...');
    
    // Inizia transazione
    await connection.beginTransaction();
    
    try {
      // 3. Aggiornare il nome nella tabella employees
      const [result] = await connection.execute(
        'UPDATE employees SET nome = ?, cognome = ? WHERE id = ?',
        [newNome, newCognome, targetEmployee.id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Nessun record aggiornato');
      }
      
      console.log(`✅ Aggiornato record in employees (${result.affectedRows} record modificato)`);
      
      // Commit della transazione
      await connection.commit();
      console.log('\n🎉 Aggiornamento completato con successo!');
      
      // 4. Verificare la modifica
      console.log('\n🔍 Verifica finale...');
      const [updatedEmployee] = await connection.execute(
        'SELECT id, nome, cognome FROM employees WHERE id = ?',
        [targetEmployee.id]
      );
      
      if (updatedEmployee.length > 0) {
        const emp = updatedEmployee[0];
        console.log(`✅ Dipendente aggiornato:`);
        console.log(`   ID: "${emp.id}"`);
        console.log(`   Nome: "${emp.nome}"`);
        console.log(`   Cognome: "${emp.cognome}"`);
        
        // Verifica che la modifica sia corretta
        if (emp.nome === newNome && emp.cognome === newCognome) {
          console.log('🎯 Modifica verificata con successo!');
        } else {
          console.log('⚠️  ATTENZIONE: I valori non corrispondono a quelli attesi');
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
  updateAlbertoName()
    .then(() => {
      console.log('\n✨ Script completato');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script fallito:', error.message);
      process.exit(1);
    });
}

module.exports = { updateAlbertoName };