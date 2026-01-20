const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Carica variabili da .env.local se esiste
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^['"]|['"]$/g, ''); // Rimuove quote
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  multipleStatements: true // Permette di eseguire più statement SQL
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connessione al database viaggi_db...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database viaggi_db\n');
    
    // Verifica se il campo esiste già
    console.log('📋 Verifica struttura attuale della tabella travels...');
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'viaggi_db' 
        AND TABLE_NAME = 'travels' 
        AND COLUMN_NAME = 'exclude_from_pending'
    `);
    
    if (columns.length > 0) {
      console.log('⚠️  Il campo exclude_from_pending esiste già nella tabella travels:');
      console.log(JSON.stringify(columns[0], null, 2));
      console.log('\n✅ Nessuna modifica necessaria.');
      return;
    }
    
    console.log('✅ Il campo exclude_from_pending non esiste. Procedo con la migration...\n');
    
    // Leggi il file SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_exclude_from_pending_to_travels.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`File migration non trovato: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Esecuzione migration...');
    console.log('='.repeat(70));
    
    // Esegui la migration
    await connection.query(sql);
    
    console.log('✅ Migration eseguita con successo!\n');
    
    // Verifica che la colonna sia stata aggiunta correttamente
    console.log('📋 Verifica struttura dopo migration:');
    const [newColumns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'viaggi_db' 
        AND TABLE_NAME = 'travels' 
        AND COLUMN_NAME = 'exclude_from_pending'
    `);
    
    if (newColumns.length > 0) {
      console.log(JSON.stringify(newColumns[0], null, 2));
      console.log('\n✅ Campo exclude_from_pending aggiunto con successo!');
    } else {
      console.log('⚠️  Attenzione: Il campo non è stato trovato dopo la migration.');
    }
    
    // Verifica indice
    console.log('\n📋 Verifica indice...');
    const [indexes] = await connection.execute(`
      SHOW INDEXES FROM travels WHERE Key_name = 'idx_exclude_from_pending'
    `);
    
    if (indexes.length > 0) {
      console.log('✅ Indice idx_exclude_from_pending creato correttamente');
    } else {
      console.log('⚠️  Indice non trovato (potrebbe essere già esistente o non necessario)');
    }
    
  } catch (error) {
    console.error('❌ Errore durante migration:', error);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('\n⚠️  Il campo exclude_from_pending esiste già. Nessuna modifica necessaria.');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.log('\n⚠️  L\'indice idx_exclude_from_pending esiste già. Il campo è stato aggiunto correttamente.');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa.');
    }
  }
}

// Esegui la migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration completata con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore fatale:', error);
    process.exit(1);
  });
