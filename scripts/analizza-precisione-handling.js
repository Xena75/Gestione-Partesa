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

async function analizzaPrecisione() {
  let connection = null;
  
  try {
    console.log('🔍 ANALISI PRECISIONE TOT_HAND\n');
    console.log('='.repeat(80));
    
    // Leggi file Excel
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    // Connetti al database
    connection = await mysql.createConnection(dbConfig);
    
    // Trova righe con differenze significative
    console.log(`\n📊 Analisi precisione per righe con differenze...\n`);
    
    const [dbRows] = await connection.execute(
      `SELECT doc_mat, esmat, pos, materiale, tot_hand 
       FROM fatt_handling 
       WHERE mese = 11 
       ORDER BY id 
       LIMIT 100`
    );
    
    const dbMap = new Map();
    dbRows.forEach(row => {
      const key = `${row.doc_mat}_${row.esmat}_${row.pos}_${row.materiale}`;
      dbMap.set(key, row);
    });
    
    let esempiTrovati = 0;
    const esempi = [];
    
    for (let i = 0; i < Math.min(1000, data.length) && esempiTrovati < 10; i++) {
      const excelRow = data[i];
      const docMat = excelRow.doc_mat;
      const esmat = excelRow.esmat;
      const pos = excelRow.pos;
      const materiale = excelRow.materiale;
      const totHandExcelRaw = excelRow.tot_hand;
      
      const key = `${docMat}_${esmat}_${pos}_${materiale}`;
      const dbRow = dbMap.get(key);
      
      if (dbRow) {
        const totHandExcel = parseFloat(totHandExcelRaw);
        const totHandDb = parseFloat(dbRow.tot_hand);
        
        if (Math.abs(totHandExcel - totHandDb) > 0.0001) {
          // Analizza il valore originale
          const excelValueType = typeof totHandExcelRaw;
          const excelValueString = String(totHandExcelRaw);
          const excelValueLength = excelValueString.length;
          const decimalPlaces = excelValueString.includes('.') 
            ? excelValueString.split('.')[1]?.length || 0 
            : 0;
          
          esempi.push({
            doc_mat: docMat,
            materiale: materiale,
            excelRaw: totHandExcelRaw,
            excelType: excelValueType,
            excelString: excelValueString,
            excelLength: excelValueLength,
            excelDecimals: decimalPlaces,
            excelParsed: totHandExcel,
            dbValue: totHandDb,
            diff: Math.abs(totHandExcel - totHandDb)
          });
          
          esempiTrovati++;
        }
      }
    }
    
    console.log(`📋 ESEMPI DI VALORI CON DIFFERENZE:\n`);
    console.log(`${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'Excel Raw'.padEnd(15)} ${'Excel Type'.padEnd(12)} ${'Excel Dec'.padEnd(10)} ${'Excel Parsed'.padEnd(15)} ${'DB Value'.padEnd(15)} ${'Diff'.padEnd(10)}`);
    console.log(`${'-'.repeat(120)}`);
    
    esempi.forEach(ex => {
      console.log(
        `${String(ex.doc_mat).padEnd(12)} ` +
        `${String(ex.materiale).padEnd(15)} ` +
        `${String(ex.excelRaw).padEnd(15)} ` +
        `${ex.excelType.padEnd(12)} ` +
        `${String(ex.excelDecimals).padEnd(10)} ` +
        `${ex.excelParsed.toFixed(4).padEnd(15)} ` +
        `${ex.dbValue.toFixed(4).padEnd(15)} ` +
        `${ex.diff.toFixed(4).padEnd(10)}`
      );
    });
    
    // Verifica pattern di arrotondamento
    console.log(`\n🔍 ANALISI PATTERN DI ARROTONDAMENTO:\n`);
    
    const arrotondamenti = {
      a2Decimali: 0,
      a3Decimali: 0,
      a4Decimali: 0,
      altri: 0
    };
    
    esempi.forEach(ex => {
      const dbDecimals = ex.dbValue.toString().includes('.') 
        ? ex.dbValue.toString().split('.')[1]?.length || 0 
        : 0;
      
      if (dbDecimals === 2) arrotondamenti.a2Decimali++;
      else if (dbDecimals === 3) arrotondamenti.a3Decimali++;
      else if (dbDecimals === 4) arrotondamenti.a4Decimali++;
      else arrotondamenti.altri++;
    });
    
    console.log(`   Valori DB arrotondati a 2 decimali: ${arrotondamenti.a2Decimali}`);
    console.log(`   Valori DB arrotondati a 3 decimali: ${arrotondamenti.a3Decimali}`);
    console.log(`   Valori DB con 4 decimali: ${arrotondamenti.a4Decimali}`);
    console.log(`   Altri: ${arrotondamenti.altri}`);
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

analizzaPrecisione().catch(console.error);

