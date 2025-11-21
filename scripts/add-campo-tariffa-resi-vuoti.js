const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function addTariffaColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Aggiungi Tariffa
    try {
      await connection.query(`
        ALTER TABLE resi_vuoti_non_fatturati 
        ADD COLUMN Tariffa DECIMAL(10,2) NULL COMMENT 'Tariffa recuperata da tab_tariffe.Tariffa' 
        AFTER ID_TARIFFA
      `);
      console.log('✅ Campo Tariffa aggiunto');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Campo Tariffa già esistente');
      } else {
        throw e;
      }
    }
    
    // Verifica colonna
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestionelogistica' 
        AND TABLE_NAME = 'resi_vuoti_non_fatturati' 
        AND COLUMN_NAME = 'Tariffa'
    `);
    
    if (columns.length > 0) {
      console.log('\n📋 Colonna verificata:');
      const col = columns[0];
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      console.log(`  - Commento: ${col.COLUMN_COMMENT}`);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addTariffaColumn();

