// Script per creare un nuovo utente nel sistema
// Uso: node create-new-user.js

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Interfaccia per input da terminale
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Funzione per fare domande
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Funzione per verificare se username esiste già
async function checkUsernameExists(connection, username) {
  try {
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Errore durante la verifica username:', error.message);
    return false;
  }
}

async function createUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_GESTIONE_HOST,
    port: process.env.DB_GESTIONE_PORT,
    user: process.env.DB_GESTIONE_USER,
    password: process.env.DB_GESTIONE_PASS,
    database: process.env.DB_GESTIONE_NAME
  });

  try {
    console.log('🔧 Creazione nuovo utente');
    console.log('========================\n');

    // Richiedi username con controllo esistenza
    let username;
    let usernameExists = true;
    
    while (usernameExists) {
      username = await question('👤 Inserisci username: ');
      
      if (!username.trim()) {
        console.log('❌ Username non può essere vuoto!\n');
        continue;
      }
      
      usernameExists = await checkUsernameExists(connection, username.trim());
      
      if (usernameExists) {
        console.log('❌ Username già esistente! Scegli un altro username.\n');
      }
    }

    // Richiedi password
    let password;
    while (!password || password.length < 6) {
      password = await question('🔒 Inserisci password (min 6 caratteri): ');
      if (!password || password.length < 6) {
        console.log('❌ Password deve essere di almeno 6 caratteri!\n');
      }
    }

    // Richiedi email (opzionale)
    const email = await question('📧 Inserisci email (opzionale): ');

    // Richiedi ruolo
    let role;
    while (role !== 'admin' && role !== 'user') {
      role = await question('👑 Inserisci ruolo (admin/user): ').then(r => r.toLowerCase());
      if (role !== 'admin' && role !== 'user') {
        console.log('❌ Ruolo deve essere "admin" o "user"!\n');
      }
    }

    // Dati del nuovo utente
    const newUser = {
      username: username.trim(),
      password: password,
      email: email.trim() || null,
      role: role
    };

    // Genera ID univoco
    const userId = uuidv4();

    // Hash della password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newUser.password, saltRounds);

    // Inserisci utente nel database
    const [result] = await connection.execute(
      'INSERT INTO users (id, username, password_hash, email, role) VALUES (?, ?, ?, ?, ?)',
      [userId, newUser.username, passwordHash, newUser.email, newUser.role]
    );

    console.log('\n✅ Utente creato con successo!');
    console.log('📋 Dettagli utente:');
    console.log(`   ID: ${userId}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Email: ${newUser.email || 'Non specificata'}`);
    console.log(`   Ruolo: ${newUser.role}`);
    console.log(`   Password: ${newUser.password} (da comunicare all'utente)`);
    console.log('\n💡 Salva questi dati in un luogo sicuro!');

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('❌ Errore: Username già esistente!');
    } else {
      console.error('❌ Errore durante la creazione dell\'utente:', error.message);
    }
  } finally {
    await connection.end();
    rl.close();
  }
}

// Esegui la funzione
createUser().catch(error => {
  console.error('❌ Errore fatale:', error.message);
  rl.close();
  process.exit(1);
});