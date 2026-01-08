const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function verificaStruttura() {
  let connection = null;
  
  try {
    console.log('🔍 VERIFICA STRUTTURA TABELLA fatt_handling\n');
    console.log('='.repeat(80));
    
    connection = await mysql.createConnection(dbConfig);
    
    // Verifica struttura colonna tot_hand
    const [columns] = await connection.execute(
      `SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        COLUMN_TYPE,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'gestionelogistica'
      AND TABLE_NAME = 'fatt_handling'
      AND COLUMN_NAME IN ('tot_hand', 'imp_hf_um', 'imp_resi_v', 'imp_doc')`
    );
    
    console.log(`\n📋 STRUTTURA COLONNE DECIMALI:\n`);
    console.log(`${'Colonna'.padEnd(15)} ${'Tipo'.padEnd(20)} ${'Precisione'.padEnd(12)} ${'Scale'.padEnd(8)} ${'Nullable'.padEnd(10)}`);
    console.log(`${'-'.repeat(80)}`);
    
    columns.forEach(col => {
      console.log(
        `${col.COLUMN_NAME.padEnd(15)} ` +
        `${col.COLUMN_TYPE.padEnd(20)} ` +
        `${String(col.NUMERIC_PRECISION || 'N/A').padEnd(12)} ` +
        `${String(col.NUMERIC_SCALE || 'N/A').padEnd(8)} ` +
        `${col.IS_NULLABLE.padEnd(10)}`
      );
    });
    
    // Verifica alcuni valori reali per vedere la precisione
    console.log(`\n📊 ESEMPI DI VALORI REALI NEL DATABASE:\n`);
    
    const [samples] = await connection.execute(
      `SELECT 
        id,
        doc_mat,
        materiale,
        tot_hand,
        CAST(tot_hand AS CHAR) as tot_hand_string,
        LENGTH(CAST(tot_hand AS CHAR)) as tot_hand_length,
        CASE 
          WHEN tot_hand LIKE '%.____' THEN '4 decimali'
          WHEN tot_hand LIKE '%.___' THEN '3 decimali'
          WHEN tot_hand LIKE '%.__' THEN '2 decimali'
          WHEN tot_hand LIKE '%._' THEN '1 decimale'
          ELSE 'Nessun decimale'
        END as decimali_visibili
      FROM fatt_handling 
      WHERE mese = 11 
      AND tot_hand IS NOT NULL
      ORDER BY RAND()
      LIMIT 20`
    );
    
    console.log(`${'ID'.padEnd(10)} ${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'tot_hand'.padEnd(15)} ${'String'.padEnd(20)} ${'Decimali'.padEnd(15)}`);
    console.log(`${'-'.repeat(100)}`);
    
    samples.forEach(row => {
      const totHandNum = parseFloat(row.tot_hand) || 0;
      const totHandStr = String(row.tot_hand);
      const decimali = totHandStr.includes('.') ? totHandStr.split('.')[1]?.length || 0 : 0;
      
      console.log(
        `${String(row.id).padEnd(10)} ` +
        `${String(row.doc_mat).padEnd(12)} ` +
        `${String(row.materiale || '').padEnd(15)} ` +
        `${totHandNum.toFixed(4).padEnd(15)} ` +
        `${totHandStr.padEnd(20)} ` +
        `${String(decimali).padEnd(15)}`
      );
    });
    
    // Conta quanti valori hanno 2, 3, 4 decimali
    const [stats] = await connection.execute(
      `SELECT 
        COUNT(*) as totale,
        SUM(CASE WHEN tot_hand * 10000 = FLOOR(tot_hand * 10000) THEN 1 ELSE 0 END) as ha_4_decimali,
        SUM(CASE WHEN tot_hand * 1000 = FLOOR(tot_hand * 1000) AND tot_hand * 10000 != FLOOR(tot_hand * 10000) THEN 1 ELSE 0 END) as ha_3_decimali,
        SUM(CASE WHEN tot_hand * 100 = FLOOR(tot_hand * 100) AND tot_hand * 1000 != FLOOR(tot_hand * 1000) THEN 1 ELSE 0 END) as ha_2_decimali,
        SUM(CASE WHEN tot_hand * 10 = FLOOR(tot_hand * 10) AND tot_hand * 100 != FLOOR(tot_hand * 100) THEN 1 ELSE 0 END) as ha_1_decimale
      FROM fatt_handling 
      WHERE mese = 11 
      AND tot_hand IS NOT NULL`
    );
    
    console.log(`\n📈 STATISTICHE PRECISIONE VALORI (mese 11):\n`);
    const stat = stats[0];
    console.log(`   Totale valori: ${stat.totale}`);
    console.log(`   Con 4 decimali: ${stat.ha_4_decimali} (${(stat.ha_4_decimali/stat.totale*100).toFixed(2)}%)`);
    console.log(`   Con 3 decimali: ${stat.ha_3_decimali} (${(stat.ha_3_decimali/stat.totale*100).toFixed(2)}%)`);
    console.log(`   Con 2 decimali: ${stat.ha_2_decimali} (${(stat.ha_2_decimali/stat.totale*100).toFixed(2)}%)`);
    console.log(`   Con 1 decimale: ${stat.ha_1_decimale} (${(stat.ha_1_decimale/stat.totale*100).toFixed(2)}%)`);
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificaStruttura().catch(console.error);

