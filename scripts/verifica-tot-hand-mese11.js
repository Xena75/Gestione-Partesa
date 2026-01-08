const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

// Configurazione database
const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function verificaTotHandMese11() {
  let connection = null;
  
  try {
    console.log('🔍 VERIFICA TOT_HAND MESE 11\n');
    console.log('='.repeat(60));
    
    // 1. Leggi il file Excel
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    console.log(`\n📂 Lettura file Excel: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File letto: ${data.length} righe totali`);
    
    // 2. Analizza struttura file Excel (prime righe per capire i nomi colonne)
    console.log(`\n🔍 Analisi struttura file Excel:`);
    if (data.length > 0) {
      const firstRow = data[0];
      console.log(`   Colonne trovate: ${Object.keys(firstRow).join(', ')}`);
      
      // Cerca colonna mese
      const meseColumns = Object.keys(firstRow).filter(key => 
        key.toLowerCase().includes('mese') || 
        key.toLowerCase().includes('month')
      );
      console.log(`   Colonne che contengono "mese": ${meseColumns.join(', ') || 'Nessuna'}`);
      
      // Mostra valori unici della colonna mese (prime 20 righe)
      if (meseColumns.length > 0) {
        const meseCol = meseColumns[0];
        const valoriMese = [...new Set(data.slice(0, 20).map(row => row[meseCol]))];
        console.log(`   Valori mese nelle prime 20 righe: ${valoriMese.join(', ')}`);
      }
    }
    
    // 3. Filtra righe del mese 11 - prova diversi nomi colonna
    const righeMese11 = data.filter(row => {
      const mese = row.mese || row.Mese || row.MESE || row['Mese'] || row['MESE'] || row['mese'];
      const meseNum = typeof mese === 'number' ? mese : parseInt(mese);
      return meseNum === 11;
    });
    
    console.log(`\n📊 Righe del mese 11 nel file Excel: ${righeMese11.length} (su ${data.length} totali)`);
    
    // Verifica distribuzione mesi nel file
    const distribuzioneMesi = {};
    data.forEach(row => {
      const mese = row.mese || row.Mese || row.MESE || row['Mese'] || row['MESE'] || row['mese'];
      const meseNum = typeof mese === 'number' ? mese : parseInt(mese);
      if (!isNaN(meseNum)) {
        distribuzioneMesi[meseNum] = (distribuzioneMesi[meseNum] || 0) + 1;
      }
    });
    
    console.log(`\n📅 Distribuzione mesi nel file Excel:`);
    Object.keys(distribuzioneMesi).sort((a, b) => parseInt(a) - parseInt(b)).forEach(mese => {
      console.log(`   Mese ${mese}: ${distribuzioneMesi[mese]} righe`);
    });
    
    // 3. Calcola totale tot_hand dal file Excel
    let totaleExcel = 0;
    let righeConTotHand = 0;
    let righeSenzaTotHand = 0;
    
    righeMese11.forEach((row, index) => {
      const totHand = row.tot_hand || row['Tot.Hand'] || row['TOT_HAND'] || row['Tot Hand'] || 0;
      const totHandNum = parseFloat(totHand);
      
      if (!isNaN(totHandNum)) {
        totaleExcel += totHandNum;
        righeConTotHand++;
      } else {
        righeSenzaTotHand++;
        console.log(`⚠️  Riga ${index + 1}: tot_hand non valido: "${totHand}"`);
      }
    });
    
    console.log(`\n💰 TOTALE EXCEL (mese 11):`);
    console.log(`   Totale: ${totaleExcel.toFixed(4)}`);
    console.log(`   Righe con tot_hand valido: ${righeConTotHand}`);
    console.log(`   Righe senza tot_hand valido: ${righeSenzaTotHand}`);
    
    // 4. Connetti al database
    console.log(`\n🔌 Connessione al database...`);
    connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Connesso al database ${dbConfig.database}`);
    
    // 5. Query totale dal database per mese 11
    const [dbResults] = await connection.execute(
      `SELECT 
        COUNT(*) as totale_righe,
        SUM(tot_hand) as totale_tot_hand,
        MIN(tot_hand) as min_tot_hand,
        MAX(tot_hand) as max_tot_hand,
        AVG(tot_hand) as media_tot_hand,
        COUNT(CASE WHEN tot_hand IS NULL THEN 1 END) as righe_null
      FROM fatt_handling 
      WHERE mese = 11`
    );
    
    const dbStats = dbResults[0];
    const totaleDatabase = parseFloat(dbStats.totale_tot_hand) || 0;
    
    console.log(`\n💾 TOTALE DATABASE (mese 11):`);
    console.log(`   Totale: ${totaleDatabase.toFixed(4)}`);
    console.log(`   Righe totali: ${dbStats.totale_righe}`);
    console.log(`   Righe con tot_hand NULL: ${dbStats.righe_null}`);
    console.log(`   Min: ${dbStats.min_tot_hand || 'N/A'}`);
    console.log(`   Max: ${dbStats.max_tot_hand || 'N/A'}`);
    console.log(`   Media: ${dbStats.media_tot_hand ? parseFloat(dbStats.media_tot_hand).toFixed(4) : 'N/A'}`);
    
    // 6. Verifica source_name per capire quale file è stato importato
    const [sourceResults] = await connection.execute(
      `SELECT DISTINCT source_name, COUNT(*) as count
       FROM fatt_handling 
       WHERE mese = 11
       GROUP BY source_name
       ORDER BY count DESC`
    );
    
    console.log(`\n📋 FILE IMPORTATI (mese 11):`);
    sourceResults.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.source_name}: ${row.count} righe`);
    });
    
    // 7. Confronto
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 CONFRONTO:`);
    console.log(`   Excel:  ${totaleExcel.toFixed(4)}`);
    console.log(`   DB:     ${totaleDatabase.toFixed(4)}`);
    console.log(`   Diff:   ${(totaleExcel - totaleDatabase).toFixed(4)}`);
    console.log(`   % Diff: ${totaleDatabase !== 0 ? ((totaleExcel - totaleDatabase) / totaleDatabase * 100).toFixed(2) : 'N/A'}%`);
    
    if (Math.abs(totaleExcel - totaleDatabase) > 0.01) {
      console.log(`\n⚠️  DISCREPANZA RILEVATA!`);
      
      // Analisi più dettagliata: confronta riga per riga
      console.log(`\n🔍 Analisi dettagliata...`);
      
      // Prendi alcune righe di esempio dal database
      const [sampleRows] = await connection.execute(
        `SELECT id, doc_mat, materiale, tot_hand, mese, source_name
         FROM fatt_handling 
         WHERE mese = 11
         LIMIT 10`
      );
      
      console.log(`\n📝 Prime 10 righe dal database:`);
      sampleRows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, doc_mat: ${row.doc_mat}, materiale: ${row.materiale}, tot_hand: ${row.tot_hand}`);
      });
      
      // Conta righe per source_name
      if (righeMese11.length !== dbStats.totale_righe) {
        console.log(`\n⚠️  NUMERO RIGHE DIVERSE:`);
        console.log(`   Excel: ${righeMese11.length} righe`);
        console.log(`   DB:    ${dbStats.totale_righe} righe`);
        console.log(`   Diff:  ${righeMese11.length - dbStats.totale_righe} righe`);
      }
      
    } else {
      console.log(`\n✅ I totali corrispondono!`);
    }
    
    console.log(`\n${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
    if (error.code === 'ENOENT') {
      console.error(`\n⚠️  File non trovato! Verifica il percorso:`);
      console.error(`   import/Mensili/handling importato.xlsx`);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Esegui la verifica
verificaTotHandMese11().catch(console.error);

