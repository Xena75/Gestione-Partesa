const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function uppercaseCodProd() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();
    
    console.log('📥 Aggiornamento Cod_Prod in maiuscolo...');
    
    // Aggiorna tutti i record convertendo Cod_Prod in maiuscolo
    const [result] = await connection.execute(
      `UPDATE resi_vuoti_non_fatturati 
       SET Cod_Prod = UPPER(Cod_Prod)`
    );
    
    await connection.commit();
    
    console.log(`✅ Completato!`);
    console.log(`   - Record aggiornati: ${result.affectedRows}`);
    
    // Verifica risultato
    const [check] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN Cod_Prod = UPPER(Cod_Prod) THEN 1 END) as maiuscoli
      FROM resi_vuoti_non_fatturati
    `);
    
    console.log(`\n📊 Verifica:`);
    console.log(`   - Totale record: ${check[0].total}`);
    console.log(`   - Record con Cod_Prod maiuscolo: ${check[0].maiuscoli}`);
    
    // Mostra alcuni esempi
    const [examples] = await connection.execute(`
      SELECT DISTINCT Cod_Prod 
      FROM resi_vuoti_non_fatturati 
      ORDER BY Cod_Prod 
      LIMIT 10
    `);
    
    console.log(`\n📋 Esempi Cod_Prod (prime 10):`);
    examples.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.Cod_Prod}`);
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Errore:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

uppercaseCodProd();

