const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function verificaUltimiImport() {
  let connection = null;
  
  try {
    console.log('🔍 VERIFICA ULTIMI IMPORT HANDLING\n');
    console.log('='.repeat(80));
    
    connection = await mysql.createConnection(dbConfig);
    
    // Verifica ultimi record inseriti (ordinati per ID decrescente)
    const [ultimi] = await connection.execute(
      `SELECT 
        id,
        doc_mat,
        materiale,
        tot_hand,
        mese,
        source_name,
        \`div\`,
        data_mov_m
      FROM fatt_handling 
      ORDER BY id DESC
      LIMIT 20`
    );
    
    console.log(`\n🕐 ULTIMI 20 RECORD INSERITI (ordinati per ID decrescente):\n`);
    console.log(`${'ID'.padEnd(10)} ${'mese'.padEnd(6)} ${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'tot_hand'.padEnd(12)} ${'source_name'.padEnd(30)}`);
    console.log(`${'-'.repeat(100)}`);
    ultimi.forEach((row, index) => {
      console.log(
        `${String(row.id).padEnd(10)} ` +
        `${String(row.mese || 'NULL').padEnd(6)} ` +
        `${String(row.doc_mat).padEnd(12)} ` +
        `${String(row.materiale || '').padEnd(15)} ` +
        `${parseFloat(row.tot_hand || 0).toFixed(4).padEnd(12)} ` +
        `${String(row.source_name || 'NULL').padEnd(30)}`
      );
    });
    
    // Verifica distribuzione mese negli ultimi record
    const distribuzioneMesi = {};
    ultimi.forEach(row => {
      const mese = row.mese || 'NULL';
      distribuzioneMesi[mese] = (distribuzioneMesi[mese] || 0) + 1;
    });
    
    console.log(`\n📅 DISTRIBUZIONE MESI NELL'ULTIMI 20 RECORD:`);
    Object.keys(distribuzioneMesi).sort().forEach(mese => {
      console.log(`   Mese ${mese}: ${distribuzioneMesi[mese]} record`);
    });
    
    // Verifica record con source_name che contiene "handling" o "novembre"
    const [sourceRecords] = await connection.execute(
      `SELECT 
        source_name,
        COUNT(*) as count,
        MIN(id) as min_id,
        MAX(id) as max_id,
        mese,
        COUNT(DISTINCT mese) as mesi_diversi
      FROM fatt_handling 
      WHERE source_name LIKE '%handling%' OR source_name LIKE '%novembre%' OR source_name LIKE '%Novembre%'
      GROUP BY source_name, mese
      ORDER BY max_id DESC
      LIMIT 20`
    );
    
    if (sourceRecords.length > 0) {
      console.log(`\n📁 RECORD CON SOURCE_NAME CONTENENTE "handling" o "novembre":\n`);
      console.log(`${'source_name'.padEnd(40)} ${'mese'.padEnd(6)} ${'count'.padEnd(8)} ${'ID Range'.padEnd(20)}`);
      console.log(`${'-'.repeat(80)}`);
      sourceRecords.forEach(row => {
        console.log(
          `${String(row.source_name || 'NULL').padEnd(40)} ` +
          `${String(row.mese || 'NULL').padEnd(6)} ` +
          `${String(row.count).padEnd(8)} ` +
          `${row.min_id}-${row.max_id}`
        );
      });
    } else {
      console.log(`\n⚠️  Nessun record trovato con source_name contenente "handling" o "novembre"`);
    }
    
    // Verifica record con mese NULL
    const [nullMese] = await connection.execute(
      `SELECT 
        COUNT(*) as totale,
        source_name,
        MIN(id) as min_id,
        MAX(id) as max_id
      FROM fatt_handling 
      WHERE mese IS NULL
      GROUP BY source_name
      ORDER BY totale DESC
      LIMIT 10`
    );
    
    if (nullMese.length > 0) {
      console.log(`\n⚠️  RECORD CON MESE NULL:\n`);
      console.log(`${'source_name'.padEnd(40)} ${'totale'.padEnd(10)} ${'ID Range'.padEnd(20)}`);
      console.log(`${'-'.repeat(80)}`);
      nullMese.forEach(row => {
        console.log(
          `${String(row.source_name || 'NULL').padEnd(40)} ` +
          `${String(row.totale).padEnd(10)} ` +
          `${row.min_id}-${row.max_id}`
        );
      });
    }
    
    // Verifica se ci sono record recenti con ID molto alti (potrebbero essere quelli appena importati)
    const [maxId] = await connection.execute(
      `SELECT MAX(id) as max_id FROM fatt_handling`
    );
    
    console.log(`\n📊 ID MASSIMO NELLA TABELLA: ${maxId[0].max_id}`);
    
    // Verifica record con ID molto alti (ultimi 1000)
    const idSoglia = maxId[0].max_id - 1000;
    const [recenti] = await connection.execute(
      `SELECT 
        COUNT(*) as totale,
        mese,
        source_name,
        SUM(tot_hand) as totale_tot_hand
      FROM fatt_handling 
      WHERE id > ?
      GROUP BY mese, source_name
      ORDER BY mese DESC`
    , [idSoglia]);
    
    if (recenti.length > 0) {
      console.log(`\n🆕 RECORD RECENTI (ultimi 1000 per ID):\n`);
      console.log(`${'mese'.padEnd(6)} ${'source_name'.padEnd(40)} ${'totale'.padEnd(10)} ${'tot_hand'.padEnd(15)}`);
      console.log(`${'-'.repeat(80)}`);
      recenti.forEach(row => {
        console.log(
          `${String(row.mese || 'NULL').padEnd(6)} ` +
          `${String(row.source_name || 'NULL').padEnd(40)} ` +
          `${String(row.totale).padEnd(10)} ` +
          `${parseFloat(row.totale_tot_hand || 0).toFixed(4).padEnd(15)}`
        );
      });
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificaUltimiImport().catch(console.error);

