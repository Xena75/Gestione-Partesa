const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function verificaImport() {
  let connection = null;
  
  try {
    console.log('🔍 VERIFICA IMPORT HANDLING\n');
    console.log('='.repeat(80));
    
    connection = await mysql.createConnection(dbConfig);
    
    // Verifica record totali
    const [totalResult] = await connection.execute(
      `SELECT COUNT(*) as totale FROM fatt_handling`
    );
    
    console.log(`\n📊 RECORD TOTALI NELLA TABELLA: ${totalResult[0].totale}`);
    
    // Verifica record per mese
    const [meseResult] = await connection.execute(
      `SELECT 
        mese,
        COUNT(*) as count,
        SUM(tot_hand) as totale_tot_hand,
        MIN(id) as min_id,
        MAX(id) as max_id
      FROM fatt_handling 
      GROUP BY mese
      ORDER BY mese DESC
      LIMIT 12`
    );
    
    console.log(`\n📅 DISTRIBUZIONE PER MESE:`);
    console.log(`${'Mese'.padEnd(6)} ${'Record'.padEnd(10)} ${'Totale tot_hand'.padEnd(20)} ${'ID Range'.padEnd(20)}`);
    console.log(`${'-'.repeat(60)}`);
    meseResult.forEach(row => {
      console.log(
        `${String(row.mese || 'NULL').padEnd(6)} ` +
        `${String(row.count).padEnd(10)} ` +
        `${parseFloat(row.totale_tot_hand || 0).toFixed(4).padEnd(20)} ` +
        `${row.min_id}-${row.max_id}`
      );
    });
    
    // Verifica record mese 11 specificamente
    const [mese11Result] = await connection.execute(
      `SELECT 
        COUNT(*) as totale,
        SUM(tot_hand) as totale_tot_hand,
        source_name,
        COUNT(DISTINCT source_name) as file_diversi
      FROM fatt_handling 
      WHERE mese = 11`
    );
    
    const mese11 = mese11Result[0];
    console.log(`\n📋 RECORD MESE 11:`);
    console.log(`   Totale: ${mese11.totale}`);
    console.log(`   Totale tot_hand: ${parseFloat(mese11.totale_tot_hand || 0).toFixed(4)}`);
    console.log(`   File diversi: ${mese11.file_diversi}`);
    
    if (mese11.totale > 0) {
      const [fileInfo] = await connection.execute(
        `SELECT 
          source_name,
          COUNT(*) as count,
          SUM(tot_hand) as totale_tot_hand
        FROM fatt_handling 
        WHERE mese = 11
        GROUP BY source_name`
      );
      
      console.log(`\n📁 FILE IMPORTATI (mese 11):`);
      fileInfo.forEach(file => {
        console.log(`   - ${file.source_name}: ${file.count} righe (tot_hand: ${parseFloat(file.totale_tot_hand || 0).toFixed(4)})`);
      });
      
      // Verifica alcuni record di esempio
      const [sample] = await connection.execute(
        `SELECT 
          id,
          doc_mat,
          materiale,
          tot_hand,
          mese,
          source_name
        FROM fatt_handling 
        WHERE mese = 11
        ORDER BY id
        LIMIT 5`
      );
      
      console.log(`\n📝 PRIMI 5 RECORD (mese 11):`);
      sample.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, doc_mat: ${row.doc_mat}, materiale: ${row.materiale}, tot_hand: ${row.tot_hand}`);
      });
    } else {
      console.log(`\n⚠️  NESSUN RECORD TROVATO PER IL MESE 11!`);
    }
    
    // Verifica ultimi record inseriti
    const [ultimi] = await connection.execute(
      `SELECT 
        id,
        doc_mat,
        materiale,
        tot_hand,
        mese,
        source_name,
        created_at
      FROM fatt_handling 
      ORDER BY id DESC
      LIMIT 5`
    );
    
    console.log(`\n🕐 ULTIMI 5 RECORD INSERITI (tutti i mesi):`);
    ultimi.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}, mese: ${row.mese || 'NULL'}, doc_mat: ${row.doc_mat}, source: ${row.source_name || 'NULL'}`);
    });
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificaImport().catch(console.error);

