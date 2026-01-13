const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_VIAGGI_HOST || 'localhost',
      user: process.env.DB_VIAGGI_USER || 'root',
      password: process.env.DB_VIAGGI_PASS || '',
      database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
      charset: 'utf8mb4'
    });

    console.log('✅ Connesso al database');

    // Verifica struttura attuale
    console.log('\n📋 Struttura attuale della colonna document_type:');
    const [currentStructure] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'viaggi_db' 
        AND TABLE_NAME = 'vehicle_documents' 
        AND COLUMN_NAME = 'document_type'
    `);
    console.log(JSON.stringify(currentStructure, null, 2));

    // Esegui migration
    console.log('\n🔄 Eseguo migration: ALTER TABLE vehicle_documents MODIFY COLUMN document_type VARCHAR(255) NOT NULL');
    await connection.execute(`
      ALTER TABLE vehicle_documents 
      MODIFY COLUMN document_type VARCHAR(255) NOT NULL
    `);
    console.log('✅ Migration completata!');

    // Verifica struttura dopo migration
    console.log('\n📋 Struttura dopo migration:');
    const [newStructure] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'viaggi_db' 
        AND TABLE_NAME = 'vehicle_documents' 
        AND COLUMN_NAME = 'document_type'
    `);
    console.log(JSON.stringify(newStructure, null, 2));

    console.log('\n✅ Migration completata con successo!');
  } catch (error) {
    console.error('❌ Errore durante migration:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();

