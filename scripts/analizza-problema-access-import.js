const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const path = require('path');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

async function analizzaProblemaAccessImport() {
  let connection = null;
  
  try {
    console.log('🔍 ANALISI PROBLEMA IMPORT DA ACCESS\n');
    console.log('='.repeat(80));
    
    // 1. Leggi il file Excel originale
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    console.log(`\n📂 Lettura file Excel originale: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File Excel letto: ${excelData.length} righe`);
    
    // 2. Connetti al database
    connection = await mysql.createConnection(dbConfig);
    
    // 3. Carica dati dal database
    const [dbRows] = await connection.execute(
      `SELECT 
        id,
        doc_mat,
        esmat,
        pos,
        materiale,
        tot_hand,
        imp_hf_um,
        imp_resi_v,
        imp_doc,
        mese
      FROM fatt_handling 
      WHERE mese = 11
      ORDER BY id
      LIMIT 1000`
    );
    
    console.log(`✅ Caricati ${dbRows.length} record dal database\n`);
    
    // 4. Crea mappa database
    const dbMap = new Map();
    dbRows.forEach(row => {
      const key = `${row.doc_mat}_${row.esmat}_${row.pos}_${row.materiale}`;
      dbMap.set(key, row);
    });
    
    // 5. Analizza pattern di arrotondamento
    console.log(`📊 ANALISI PATTERN DI ARROTONDAMENTO:\n`);
    
    const patternArrotondamento = {
      arrotondati_a_2_decimali: 0,
      arrotondati_a_3_decimali: 0,
      con_4_decimali_corretti: 0,
      altri: 0
    };
    
    const esempiPattern = [];
    
    for (let i = 0; i < Math.min(1000, excelData.length); i++) {
      const excelRow = excelData[i];
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
          // Analizza il pattern
          const excelStr = totHandExcel.toString();
          const dbStr = totHandDb.toString();
          
          const excelDecimals = excelStr.includes('.') ? excelStr.split('.')[1]?.length || 0 : 0;
          const dbDecimals = dbStr.includes('.') ? dbStr.split('.')[1]?.length || 0 : 0;
          
          // Verifica se è stato arrotondato
          if (dbDecimals <= 2) {
            patternArrotondamento.arrotondati_a_2_decimali++;
          } else if (dbDecimals === 3) {
            patternArrotondamento.arrotondati_a_3_decimali++;
          } else if (dbDecimals === 4 && diff < 0.0001) {
            patternArrotondamento.con_4_decimali_corretti++;
          } else {
            patternArrotondamento.altri++;
          }
          
          if (esempiPattern.length < 15) {
            esempiPattern.push({
              doc_mat: docMat,
              materiale: materiale,
              excel: totHandExcel.toFixed(4),
              excelDecimals: excelDecimals,
              db: totHandDb.toFixed(4),
              dbDecimals: dbDecimals,
              diff: diff.toFixed(4)
            });
          }
        }
      }
    }
    
    console.log(`   Arrotondati a 2 decimali: ${patternArrotondamento.arrotondati_a_2_decimali}`);
    console.log(`   Arrotondati a 3 decimali: ${patternArrotondamento.arrotondati_a_3_decimali}`);
    console.log(`   Con 4 decimali corretti: ${patternArrotondamento.con_4_decimali_corretti}`);
    console.log(`   Altri pattern: ${patternArrotondamento.altri}`);
    
    if (esempiPattern.length > 0) {
      console.log(`\n📋 ESEMPI DI PATTERN TROVATI:\n`);
      console.log(`${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'Excel'.padEnd(12)} ${'Excel Dec'.padEnd(10)} ${'DB'.padEnd(12)} ${'DB Dec'.padEnd(10)} ${'Diff'.padEnd(10)}`);
      console.log(`${'-'.repeat(90)}`);
      esempiPattern.forEach(ex => {
        console.log(
          `${String(ex.doc_mat).padEnd(12)} ` +
          `${String(ex.materiale || '').padEnd(15)} ` +
          `${ex.excel.padEnd(12)} ` +
          `${String(ex.excelDecimals).padEnd(10)} ` +
          `${ex.db.padEnd(12)} ` +
          `${String(ex.dbDecimals).padEnd(10)} ` +
          `${ex.diff.padEnd(10)}`
        );
      });
    }
    
    // 6. Verifica se possiamo calcolare tot_hand dai campi componenti
    console.log(`\n🔍 VERIFICA CALCOLO TOT_HAND DA CAMPI COMPONENTI:\n`);
    
    const [sampleCalc] = await connection.execute(
      `SELECT 
        id,
        doc_mat,
        materiale,
        imp_hf_um,
        imp_resi_v,
        imp_doc,
        tot_hand,
        (COALESCE(imp_hf_um, 0) + COALESCE(imp_resi_v, 0) + COALESCE(imp_doc, 0)) as tot_hand_calcolato
      FROM fatt_handling 
      WHERE mese = 11
      AND tot_hand IS NOT NULL
      LIMIT 20`
    );
    
    console.log(`${'ID'.padEnd(10)} ${'doc_mat'.padEnd(12)} ${'imp_hf_um'.padEnd(12)} ${'imp_resi_v'.padEnd(12)} ${'imp_doc'.padEnd(12)} ${'tot_hand DB'.padEnd(12)} ${'tot_hand Calc'.padEnd(15)} ${'Match'.padEnd(8)}`);
    console.log(`${'-'.repeat(100)}`);
    
    let matchCount = 0;
    sampleCalc.forEach(row => {
      const totHandDb = parseFloat(row.tot_hand) || 0;
      const totHandCalc = parseFloat(row.tot_hand_calcolato) || 0;
      const match = Math.abs(totHandDb - totHandCalc) < 0.0001 ? '✅' : '❌';
      if (match === '✅') matchCount++;
      
      console.log(
        `${String(row.id).padEnd(10)} ` +
        `${String(row.doc_mat).padEnd(12)} ` +
        `${(parseFloat(row.imp_hf_um) || 0).toFixed(4).padEnd(12)} ` +
        `${(parseFloat(row.imp_resi_v) || 0).toFixed(4).padEnd(12)} ` +
        `${(parseFloat(row.imp_doc) || 0).toFixed(4).padEnd(12)} ` +
        `${totHandDb.toFixed(4).padEnd(12)} ` +
        `${totHandCalc.toFixed(4).padEnd(15)} ` +
        `${match.padEnd(8)}`
      );
    });
    
    console.log(`\n   Match: ${matchCount}/${sampleCalc.length} (${(matchCount/sampleCalc.length*100).toFixed(1)}%)`);
    
    // 7. Conclusione
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n💡 CONCLUSIONI:`);
    console.log(`\n   Il problema è nell'import diretto da Access al database MySQL.`);
    console.log(`   Access probabilmente arrotonda i valori durante l'import.`);
    console.log(`\n   SOLUZIONI POSSIBILI:`);
    console.log(`   1. Correggere i dati già importati usando il file Excel originale`);
    console.log(`   2. Modificare la query/connessione Access per preservare la precisione`);
    console.log(`   3. Usare l'import tramite l'applicazione web invece di Access`);
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

analizzaProblemaAccessImport().catch(console.error);

