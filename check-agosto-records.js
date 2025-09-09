require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAgostoRecords() {
  const dbConfig = {
    host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
    user: process.env.DB_GESTIONE_USER || 'root',
    password: process.env.DB_GESTIONE_PASS || '',
    database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
    port: parseInt(process.env.DB_GESTIONE_PORT || '3306')
  };

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔍 Connessione al database...');
    console.log('✅ Connesso al database');

    // Conta i record per mese 8 e source_name "Agosto.xlsx"
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM fatt_delivery WHERE mese = 8 AND source_name = "Agosto.xlsx"'
    );
    
    const count = rows[0].count;
    console.log(`📊 Record trovati per mese 8 e source_name "Agosto.xlsx": ${count}`);

    if (count > 0) {
      // Mostra alcuni esempi di record
      const [sampleRows] = await connection.execute(
        'SELECT appalto, ragione_sociale, cod_articolo, descr_articolo, colli, compenso, tariffa, tot_compenso FROM fatt_delivery WHERE mese = 8 AND source_name = "Agosto.xlsx" LIMIT 5'
      );
      
      console.log('\n📋 Esempi di record importati:');
      sampleRows.forEach((row, index) => {
        console.log(`${index + 1}. Appalto: ${row.appalto}, Cliente: ${row.ragione_sociale}, Articolo: ${row.cod_articolo} - ${row.descr_articolo}, Colli: ${row.colli}, Compenso: ${row.compenso}, Tariffa: ${row.tariffa}, Totale: ${row.tot_compenso}`);
      });

      // Statistiche per tipologia
      const [statsRows] = await connection.execute(
        'SELECT tipologia, COUNT(*) as count, SUM(colli) as total_colli, SUM(tot_compenso) as total_compenso FROM fatt_delivery WHERE mese = 8 AND source_name = "Agosto.xlsx" GROUP BY tipologia'
      );
      
      console.log('\n📈 Statistiche per tipologia:');
      statsRows.forEach(row => {
        console.log(`- ${row.tipologia}: ${row.count} record, ${row.total_colli} colli, €${row.total_compenso.toFixed(2)}`);
      });
    }

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAgostoRecords();
