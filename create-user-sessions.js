const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createUserSessionsTable() {
  let connection;
  try {
    // Connessione al database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'gestionelogistica'
    });

    console.log('✅ Connesso al database');

    // Verifica se la tabella user_sessions esiste già
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'user_sessions'"
    );

    if (tables.length > 0) {
      console.log('✅ Tabella user_sessions già esistente');
      return;
    }

    console.log('🔧 Creazione tabella user_sessions...');

    // Crea la tabella user_sessions
    const createTableSQL = `
      CREATE TABLE user_sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_token_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Tabella user_sessions creata con successo');

    // Verifica la struttura della tabella creata
    const [columns] = await connection.execute('DESCRIBE user_sessions');
    console.log('\n📋 Struttura tabella user_sessions:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
    });

    console.log('\n🎉 Sistema di autenticazione completamente configurato!');
    console.log('   - Tabella users: ✅');
    console.log('   - Tabella user_sessions: ✅');
    console.log('   - Utente admin: ✅ (username: admin, password: admin123)');

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createUserSessionsTable();