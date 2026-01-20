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
  charset: 'utf8mb4'
};

async function verifyField() {
  let connection;
  
  try {
    console.log('🔌 Connessione al database viaggi_db...');
    console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`Database: ${dbConfig.database}\n`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database\n');
    
    // Verifica se il campo esiste
    console.log('📋 Verifica campo exclude_from_pending nella tabella travels...\n');
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'travels' 
        AND COLUMN_NAME = 'exclude_from_pending'
    `, [dbConfig.database]);
    
    if (columns.length > 0) {
      console.log('✅ Campo TROVATO:');
      console.log(JSON.stringify(columns[0], null, 2));
    } else {
      console.log('❌ Campo NON TROVATO nella tabella travels');
      console.log('\n📋 Elenco di tutti i campi della tabella travels:');
      
      const [allColumns] = await connection.execute(`
        SELECT 
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'travels'
        ORDER BY ORDINAL_POSITION
      `, [dbConfig.database]);
      
      allColumns.forEach((col, index) => {
        console.log(`${index + 1}. ${col.COLUMN_NAME} - ${col.COLUMN_TYPE} (Default: ${col.COLUMN_DEFAULT || 'NULL'})`);
      });
    }
    
    // Verifica indice
    console.log('\n📋 Verifica indice idx_exclude_from_pending...');
    const [indexes] = await connection.execute(`
      SHOW INDEXES FROM travels WHERE Key_name = 'idx_exclude_from_pending'
    `);
    
    if (indexes.length > 0) {
      console.log('✅ Indice trovato:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.Key_name} su colonna ${idx.Column_name}`);
      });
    } else {
      console.log('❌ Indice NON trovato');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa.');
    }
  }
}

verifyField()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
  });
