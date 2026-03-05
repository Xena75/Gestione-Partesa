require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  multipleStatements: true
};

async function runMigration() {
  let connection;

  try {
    console.log('🔌 Connessione al database viaggi_db...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso\n');

    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_anno_to_viaggi_pod.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Esecuzione migration add_anno_to_viaggi_pod...');
    console.log('='.repeat(70));

    await connection.query(sql);

    console.log('✅ Migration eseguita con successo!\n');

    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME, COLUMN_TYPE, GENERATION_EXPRESSION FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'viaggi_pod' AND COLUMN_NAME = 'anno'",
      [dbConfig.database]
    );

    if (columns.length > 0) {
      console.log('📋 Colonna anno creata:');
      console.log('   ', columns[0].COLUMN_NAME, '-', columns[0].COLUMN_TYPE);
      console.log('   Espressione:', columns[0].GENERATION_EXPRESSION || '(stored)');
    }

    const [indexes] = await connection.execute(
      "SHOW INDEXES FROM viaggi_pod WHERE Key_name = 'idx_anno'"
    );
    if (indexes.length > 0) {
      console.log('\n✅ Indice idx_anno creato');
    }

  } catch (error) {
    console.error('❌ Errore:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

runMigration();
