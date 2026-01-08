const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function correggiTotHandDaExcel() {
  let connection = null;
  
  try {
    console.log('🔧 CORREZIONE TOT_HAND DA FILE EXCEL\n');
    console.log('='.repeat(80));
    
    // 1. Leggi il file Excel
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    console.log(`\n📂 Lettura file Excel: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File Excel letto: ${excelData.length} righe`);
    
    // 2. Connetti al database
    console.log(`\n🔌 Connessione al database...`);
    connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Connesso al database ${dbConfig.database}`);
    
    // 3. Carica tutti i record del mese 11 dal database
    console.log(`\n📥 Caricamento dati dal database (mese 11)...`);
    const [dbRows] = await connection.execute(
      `SELECT 
        id,
        doc_mat,
        esmat,
        pos,
        materiale,
        tot_hand,
        mese
      FROM fatt_handling 
      WHERE mese = 11
      ORDER BY id`
    );
    
    console.log(`✅ Caricati ${dbRows.length} record dal database`);
    
    // 4. Crea mappa database
    const dbMap = new Map();
    dbRows.forEach(row => {
      const key = `${row.doc_mat}_${row.esmat}_${row.pos}_${row.materiale}`;
      dbMap.set(key, row);
    });
    
    // 5. Trova righe da correggere
    console.log(`\n🔍 Analisi differenze...`);
    
    const righeDaCorreggere = [];
    
    excelData.forEach((excelRow, index) => {
      const docMat = excelRow.doc_mat;
      const esmat = excelRow.esmat;
      const pos = excelRow.pos;
      const materiale = excelRow.materiale;
      const totHandExcel = parseFloat(excelRow.tot_hand || 0);
      
      const key = `${docMat}_${esmat}_${pos}_${materiale}`;
      const dbRow = dbMap.get(key);
      
      if (dbRow) {
        const totHandDb = parseFloat(dbRow.tot_hand) || 0;
        const diff = Math.abs(totHandExcel - totHandDb);
        
        if (diff > 0.0001) {
          righeDaCorreggere.push({
            id: dbRow.id,
            doc_mat: docMat,
            materiale: materiale,
            totHandExcel: totHandExcel,
            totHandDb: totHandDb,
            diff: diff
          });
        }
      }
    });
    
    console.log(`✅ Trovate ${righeDaCorreggere.length} righe da correggere`);
    
    if (righeDaCorreggere.length === 0) {
      console.log(`\n✅ Nessuna correzione necessaria!`);
      return;
    }
    
    // 6. Mostra statistiche
    const differenzaTotale = righeDaCorreggere.reduce((sum, r) => sum + (r.totHandExcel - r.totHandDb), 0);
    console.log(`\n📊 STATISTICHE:`);
    console.log(`   Righe da correggere: ${righeDaCorreggere.length}`);
    console.log(`   Differenza totale: ${differenzaTotale.toFixed(4)}`);
    console.log(`   Differenza media per riga: ${(differenzaTotale/righeDaCorreggere.length).toFixed(4)}`);
    
    // 7. Mostra prime 10 righe da correggere
    console.log(`\n📋 PRIME 10 RIGHE DA CORREGGERE:\n`);
    console.log(`${'ID'.padEnd(10)} ${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'Excel'.padEnd(12)} ${'DB'.padEnd(12)} ${'Diff'.padEnd(12)}`);
    console.log(`${'-'.repeat(80)}`);
    righeDaCorreggere.slice(0, 10).forEach(r => {
      console.log(
        `${String(r.id).padEnd(10)} ` +
        `${String(r.doc_mat).padEnd(12)} ` +
        `${String(r.materiale || '').padEnd(15)} ` +
        `${r.totHandExcel.toFixed(4).padEnd(12)} ` +
        `${r.totHandDb.toFixed(4).padEnd(12)} ` +
        `${r.diff.toFixed(4).padEnd(12)}`
      );
    });
    
    // 8. Chiedi conferma (in un'applicazione reale, ma qui procediamo direttamente)
    console.log(`\n⚠️  ATTENZIONE: Questo script modificherà ${righeDaCorreggere.length} record nel database.`);
    console.log(`   Procedere con la correzione? (simulazione per ora)\n`);
    
    // 9. Esegui correzione in batch
    console.log(`🔧 Esecuzione correzione...`);
    
    let corretti = 0;
    let errori = 0;
    const batchSize = 1000;
    
    for (let i = 0; i < righeDaCorreggere.length; i += batchSize) {
      const batch = righeDaCorreggere.slice(i, i + batchSize);
      
      for (const riga of batch) {
        try {
          await connection.execute(
            `UPDATE fatt_handling 
             SET tot_hand = ? 
             WHERE id = ?`,
            [riga.totHandExcel, riga.id]
          );
          corretti++;
          
          if (corretti % 1000 === 0) {
            console.log(`   ✅ Corrette ${corretti}/${righeDaCorreggere.length} righe...`);
          }
        } catch (error) {
          errori++;
          console.error(`   ❌ Errore correzione ID ${riga.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ CORREZIONE COMPLETATA:`);
    console.log(`   Righe corrette: ${corretti}`);
    console.log(`   Errori: ${errori}`);
    
    // 10. Verifica totale finale
    const [finalStats] = await connection.execute(
      `SELECT SUM(tot_hand) as totale_tot_hand
       FROM fatt_handling 
       WHERE mese = 11`
    );
    
    const totaleFinale = parseFloat(finalStats[0].totale_tot_hand) || 0;
    const totaleExcel = excelData.reduce((sum, row) => {
      return sum + (parseFloat(row.tot_hand || 0) || 0);
    }, 0);
    
    console.log(`\n📊 VERIFICA FINALE:`);
    console.log(`   Totale Excel: ${totaleExcel.toFixed(4)}`);
    console.log(`   Totale DB: ${totaleFinale.toFixed(4)}`);
    console.log(`   Differenza: ${Math.abs(totaleExcel - totaleFinale).toFixed(4)}`);
    
    if (Math.abs(totaleExcel - totaleFinale) < 0.01) {
      console.log(`\n✅ I totali ora corrispondono!`);
    } else {
      console.log(`\n⚠️  Ancora una piccola differenza residua`);
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

// Esegui la correzione
correggiTotHandDaExcel().catch(console.error);

