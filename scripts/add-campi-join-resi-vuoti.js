const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function addColumns() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Aggiungi ragione_sociale
    try {
      await connection.query(`
        ALTER TABLE resi_vuoti_non_fatturati 
        ADD COLUMN ragione_sociale VARCHAR(255) NULL COMMENT 'Ragione sociale cliente (da JOIN con fatt_delivery.cod_cliente)' 
        AFTER Cod_Cliente
      `);
      console.log('✅ Campo ragione_sociale aggiunto');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Campo ragione_sociale già esistente');
      } else {
        throw e;
      }
    }
    
    // Aggiungi descr_articolo
    try {
      await connection.query(`
        ALTER TABLE resi_vuoti_non_fatturati 
        ADD COLUMN descr_articolo VARCHAR(255) NULL COMMENT 'Descrizione articolo (da JOIN con fatt_delivery.cod_articolo)' 
        AFTER Cod_Prod
      `);
      console.log('✅ Campo descr_articolo aggiunto');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Campo descr_articolo già esistente');
      } else {
        throw e;
      }
    }
    
    // Verifica colonne
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestionelogistica' 
        AND TABLE_NAME = 'resi_vuoti_non_fatturati' 
        AND COLUMN_NAME IN ('ragione_sociale', 'descr_articolo')
    `);
    
    console.log('\n📋 Colonne verificate:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addColumns();

