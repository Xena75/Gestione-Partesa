const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkAdminUsers() {
  let connection;
  
  try {
    // Connessione al database GESTIONE
    connection = await mysql.createConnection({
      host: process.env.DB_GESTIONE_HOST,
      port: process.env.DB_GESTIONE_PORT,
      user: process.env.DB_GESTIONE_USER,
      password: process.env.DB_GESTIONE_PASS,
      database: process.env.DB_GESTIONE_NAME
    });
    
    console.log('✅ Connesso al database GESTIONE');
    
    // Verifica se esiste la tabella users
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'users'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Tabella users non trovata');
      return;
    }
    
    console.log('✅ Tabella users trovata');
    
    // Mostra struttura tabella users
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('\n📋 Struttura tabella users:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Conta tutti gli utenti
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM users');
    console.log(`\n👥 Totale utenti: ${countResult[0].total}`);
    
    // Mostra tutti gli utenti con i loro ruoli
    const [users] = await connection.execute(
      'SELECT id, username, email, role, created_at FROM users ORDER BY id'
    );
    
    if (users.length === 0) {
      console.log('\n❌ Nessun utente trovato nel database');
    } else {
      console.log('\n👤 Utenti esistenti:');
      users.forEach(user => {
        const isAdmin = user.role === 'admin' ? '🔑 ADMIN' : '👤 USER';
        console.log(`  ${isAdmin} - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Ruolo: ${user.role}`);
      });
      
      // Conta utenti admin
      const adminUsers = users.filter(user => user.role === 'admin');
      console.log(`\n🔑 Utenti admin trovati: ${adminUsers.length}`);
      
      if (adminUsers.length === 0) {
        console.log('\n⚠️  PROBLEMA: Nessun utente admin trovato!');
        console.log('💡 Suggerimento: Esegui create-admin-user.js per creare un utente admin');
      }
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Verifica che il database sia in esecuzione e le credenziali siano corrette');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione database chiusa');
    }
  }
}

checkAdminUsers();