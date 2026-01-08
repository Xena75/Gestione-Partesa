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

async function confrontaRigheHandlingMese11() {
  let connection = null;
  
  try {
    console.log('🔍 CONFRONTO RIGA PER RIGA - TOT_HAND MESE 11\n');
    console.log('='.repeat(80));
    
    // 1. Leggi il file Excel
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    console.log(`\n📂 Lettura file Excel: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File letto: ${data.length} righe totali`);
    
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
        mese,
        source_name
      FROM fatt_handling 
      WHERE mese = 11
      ORDER BY id`
    );
    
    console.log(`✅ Caricati ${dbRows.length} record dal database`);
    
    // 4. Crea una mappa del database per ricerca rapida
    // Usa doc_mat + esmat + pos + materiale come chiave univoca
    const dbMap = new Map();
    dbRows.forEach(row => {
      const key = `${row.doc_mat}_${row.esmat}_${row.pos}_${row.materiale}`;
      dbMap.set(key, row);
    });
    
    console.log(`✅ Creata mappa database con ${dbMap.size} chiavi`);
    
    // 5. Confronta riga per riga
    console.log(`\n🔍 Confronto riga per riga...`);
    
    let righeConfrontate = 0;
    let righeUguali = 0;
    let righeDiverse = 0;
    let righeNonTrovate = 0;
    let differenzaTotale = 0;
    const differenze = [];
    
    data.forEach((excelRow, index) => {
      const docMat = excelRow.doc_mat || excelRow['doc_mat'];
      const esmat = excelRow.esmat || excelRow['esmat'];
      const pos = excelRow.pos || excelRow['pos'];
      const materiale = excelRow.materiale || excelRow['materiale'];
      const totHandExcel = parseFloat(excelRow.tot_hand || excelRow['tot_hand'] || 0);
      
      const key = `${docMat}_${esmat}_${pos}_${materiale}`;
      const dbRow = dbMap.get(key);
      
      if (dbRow) {
        const totHandDb = parseFloat(dbRow.tot_hand) || 0;
        const diff = Math.abs(totHandExcel - totHandDb);
        
        righeConfrontate++;
        
        if (diff < 0.0001) { // Considera uguali se differenza < 0.0001
          righeUguali++;
        } else {
          righeDiverse++;
          differenzaTotale += (totHandExcel - totHandDb);
          
          if (differenze.length < 20) { // Salva solo le prime 20 differenze
            differenze.push({
              riga: index + 1,
              doc_mat: docMat,
              materiale: materiale,
              excel: totHandExcel.toFixed(4),
              db: totHandDb.toFixed(4),
              diff: diff.toFixed(4)
            });
          }
        }
      } else {
        righeNonTrovate++;
        if (righeNonTrovate <= 10) {
          console.log(`⚠️  Riga ${index + 1} non trovata nel DB: doc_mat=${docMat}, materiale=${materiale}`);
        }
      }
    });
    
    // 6. Statistiche
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 STATISTICHE CONFRONTO:`);
    console.log(`   Righe confrontate: ${righeConfrontate}`);
    console.log(`   Righe uguali: ${righeUguali} (${(righeUguali/righeConfrontate*100).toFixed(2)}%)`);
    console.log(`   Righe diverse: ${righeDiverse} (${(righeDiverse/righeConfrontate*100).toFixed(2)}%)`);
    console.log(`   Righe non trovate nel DB: ${righeNonTrovate}`);
    console.log(`   Differenza totale accumulata: ${differenzaTotale.toFixed(4)}`);
    
    if (differenze.length > 0) {
      console.log(`\n📋 PRIME ${differenze.length} DIFFERENZE TROVATE:`);
      console.log(`   ${'Riga'.padEnd(6)} ${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'Excel'.padEnd(12)} ${'DB'.padEnd(12)} ${'Diff'.padEnd(12)}`);
      console.log(`   ${'-'.repeat(80)}`);
      differenze.forEach(diff => {
        console.log(`   ${String(diff.riga).padEnd(6)} ${String(diff.doc_mat).padEnd(12)} ${String(diff.materiale).padEnd(15)} ${diff.excel.padEnd(12)} ${diff.db.padEnd(12)} ${diff.diff.padEnd(12)}`);
      });
    }
    
    // 7. Verifica se ci sono righe nel DB che non sono nel file Excel
    console.log(`\n🔍 Verifica righe nel DB non presenti nel file Excel...`);
    
    const excelKeys = new Set();
    data.forEach(row => {
      const docMat = row.doc_mat || row['doc_mat'];
      const esmat = row.esmat || row['esmat'];
      const pos = row.pos || row['pos'];
      const materiale = row.materiale || row['materiale'];
      const key = `${docMat}_${esmat}_${pos}_${materiale}`;
      excelKeys.add(key);
    });
    
    const righeSoloNelDb = dbRows.filter(row => {
      const key = `${row.doc_mat}_${row.esmat}_${row.pos}_${row.materiale}`;
      return !excelKeys.has(key);
    });
    
    if (righeSoloNelDb.length > 0) {
      console.log(`⚠️  Trovate ${righeSoloNelDb.length} righe nel DB non presenti nel file Excel`);
      if (righeSoloNelDb.length <= 10) {
        righeSoloNelDb.forEach(row => {
          console.log(`   ID: ${row.id}, doc_mat: ${row.doc_mat}, materiale: ${row.materiale}, tot_hand: ${row.tot_hand}`);
        });
      }
    } else {
      console.log(`✅ Tutte le righe del DB sono presenti nel file Excel`);
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

// Esegui il confronto
confrontaRigheHandlingMese11().catch(console.error);

