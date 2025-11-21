const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function checkResults() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.query('SELECT COUNT(*) as total FROM resi_vuoti_non_fatturati');
    console.log('✅ Righe importate nella tabella:', rows[0].total);
    
    const [sample] = await connection.query('SELECT Cod_Cliente, ragione_sociale, Cod_Prod, descr_articolo, Deposito, Colli, ID_TARIFFA, Totale_compenso, Data_rif_ddt FROM resi_vuoti_non_fatturati LIMIT 5');
    console.log('\n📄 Esempio righe importate (prime 5):');
    sample.forEach((r, i) => {
      console.log(`\nRiga ${i+1}:`);
      console.log(`  Cod_Cliente: ${r.Cod_Cliente}`);
      console.log(`  ragione_sociale: ${r.ragione_sociale || 'NULL'}`);
      console.log(`  Cod_Prod: ${r.Cod_Prod}`);
      console.log(`  descr_articolo: ${r.descr_articolo || 'NULL'}`);
      console.log(`  Deposito: ${r.Deposito || 'NULL'}`);
      console.log(`  Colli: ${r.Colli}`);
      console.log(`  ID_TARIFFA: ${r.ID_TARIFFA}`);
      console.log(`  Totale_compenso: ${r.Totale_compenso || 'NULL'}`);
      console.log(`  Data_rif_ddt: ${r.Data_rif_ddt}`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkResults();

