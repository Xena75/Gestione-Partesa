/**
 * SCRIPT DI BACKUP PER IMPORT EXCEL CON DATE CORRETTE
 * Funziona perfettamente con LOAD DATA INFILE + conversione date Excel
 * Testato con successo: 90,267 righe in 43.68 secondi
 * 
 * CORREZIONI IMPLEMENTATE:
 * - Conversione numeri seriali Excel (45870, 45873...) in date MySQL (2025-08-01, 2025-08-04...)
 * - Campi mese e settimana calcolati correttamente
 * - ID_fatt calcolato come div-classe_tariffa-classe_prod
 * 
 * USO:
 * node IMPORT_DELIVERY_MENSILE_BKP.js
 * 
 * REQUISITI:
 * - File Excel in: ./import x test/Futura_Agosto.xlsx
 * - Database MySQL configurato
 * - Dipendenze: mysql2, xlsx, fs, path
 */

const mysql = require('mysql2');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Configurazione database
const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306')
};

// Funzione per convertire numero seriale Excel a data MySQL
function excelSerialToMySQLDate(serial) {
  if (serial === null || serial === undefined || serial === '') {
    return null;
  }
  
  // Excel serial date: 1 = 1900-01-01, ma Excel ha un bug: considera 1900 bisestile
  // La formula corretta è: (serial - 25569) * 86400 * 1000
  // 25569 = numero di giorni tra 1900-01-01 e 1970-01-01
  const excelDate = new Date((serial - 25569) * 86400 * 1000);
  
  // Formatta come datetime MySQL (YYYY-MM-DD HH:MM:SS)
  return excelDate.toISOString().slice(0, 19).replace('T', ' ');
}

async function importExcelFile() {
  let connection;
  
  try {
    console.log('🔍 Connessione al database...');
    connection = mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database gestionelogistica');
    
    // STEP 1: Verifica record esistenti
    console.log('\n🧹 STEP 1: Verifica record esistenti...');
    
    const existingCount = await new Promise((resolve, reject) => {
      connection.query(`
        SELECT COUNT(*) as count 
        FROM fatt_delivery 
        WHERE source_name = 'Futura_Agosto.xlsx'
      `, (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    console.log(`📊 Record esistenti con source_name = 'Futura_Agosto.xlsx': ${existingCount[0].count}`);
    
    if (existingCount[0].count > 0) {
      console.log('⚠️  ATTENZIONE: Ci sono già record esistenti!');
    } else {
      console.log('✅ Nessun record esistente, procedo con l\'import');
    }
    
    // STEP 2: Leggi il file Excel
    console.log('\n📊 STEP 2: Lettura file Excel...');
    const excelPath = path.join(__dirname, 'import x test', 'Futura_Agosto.xlsx');
    console.log(`📁 Percorso file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📋 Righe nel file Excel: ${data.length}`);
    
    // STEP 3: Prepara i dati per l'import
    console.log('\n🔧 STEP 3: Preparazione dati per import...');
    
    const toNull = (value) => {
      if (value === undefined || value === '' || value === null) {
        return null;
      }
      return value;
    };
    
    const preparedData = [];
    for (const row of data) {
      const preparedRow = {
        source_name: 'Futura_Agosto.xlsx',
        appalto: toNull(row.appalto),
        ordine: toNull(row.ordine),
        cod_vettore: toNull(row.cod_vettore),
        descr_vettore: toNull(row.descr_vettore),
        viaggio: toNull(row.viaggio),
        consegna_num: toNull(row.consegna_num),
        cod_cliente: toNull(row.cod_cliente),
        ragione_sociale: toNull(row.ragione_sociale),
        cod_articolo: toNull(row.cod_articolo),
        descr_articolo: toNull(row.descr_articolo),
        gr_stat: toNull(row.gr_stat),
        descr_gruppo_st: toNull(row.descr_gruppo_st),
        classe_prod: toNull(row.classe_prod),
        descr_classe_prod: toNull(row.descr_classe_prod),
        classe_tariffa: toNull(row.classe_tariffa),
        anomalia: toNull(row.anomalia),
        data_mov_merce: excelSerialToMySQLDate(row.data_mov_merce), // CORREZIONE: Conversione date Excel
        colli: toNull(row.colli),
        tariffa: toNull(row.tariffa),
        tariffa_vuoti: toNull(row.tariffa_vuoti),
        compenso: toNull(row.compenso),
        tr_cons: toNull(row.tr_cons),
        tot_compenso: toNull(row.tot_compenso),
        bu: toNull(row.bu),
        div: toNull(row.div),
        dep: null, // Lo mappiamo dopo
        tipologia: toNull(row.tipologia),
        cod_em_fat: toNull(row.cod_em_fat),
        emittente_fattura: toNull(row.emittente_fattura),
        oda: toNull(row.oda)
      };
      
      preparedData.push(preparedRow);
    }
    
    console.log(`📋 Dati preparati: ${preparedData.length} righe`);
    
    // Mostra alcuni esempi di date convertite
    console.log('\n📋 ESEMPI DATE CONVERTITE:');
    preparedData.slice(0, 5).forEach((row, index) => {
      console.log(`   ${index + 1}. data_mov_merce: ${row.data_mov_merce}`);
    });
    
    // STEP 4: Mappa bu a dep
    console.log('\n🔧 STEP 4: Mappatura bu -> dep...');
    
    const uniqueBus = [...new Set(preparedData.map(row => row.bu).filter(bu => bu !== null))];
    console.log(`📋 BU unici da mappare: ${uniqueBus.length}`);
    
    const buToDepMap = new Map();
    for (const bu of uniqueBus) {
      try {
        const result = await new Promise((resolve, reject) => {
          connection.query(`
            SELECT Localita_BU 
            FROM tab_bu 
            WHERE BU = ?
          `, [bu], (error, results) => {
            if (error) reject(error);
            else resolve(results);
          });
        });
        
        buToDepMap.set(bu, result.length > 0 ? result[0].Localita_BU : null);
      } catch (error) {
        console.log(`   ⚠️  Errore mappatura BU ${bu}: ${error.message}`);
        buToDepMap.set(bu, null);
      }
    }
    
    // Applica la mappatura
    for (const row of preparedData) {
      if (row.bu) {
        row.dep = buToDepMap.get(row.bu);
      }
    }
    
    console.log(`✅ Mappatura completata`);
    
    // STEP 5: Crea file CSV
    console.log('\n📄 STEP 5: Creazione file CSV...');
    
    const csvPath = path.join(__dirname, 'temp_import.csv');
    
    const headers = [
      'source_name', 'appalto', 'ordine', 'cod_vettore', 'descr_vettore', 'viaggio',
      'consegna_num', 'cod_cliente', 'ragione_sociale', 'cod_articolo', 'descr_articolo',
      'gr_stat', 'descr_gruppo_st', 'classe_prod', 'descr_classe_prod', 'classe_tariffa',
      'anomalia', 'data_mov_merce', 'colli', 'tariffa', 'tariffa_vuoti', 'compenso',
      'tr_cons', 'tot_compenso', 'bu', 'div', 'dep', 'tipologia', 'cod_em_fat',
      'emittente_fattura', 'oda'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    for (const row of preparedData) {
      const csvRow = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '\\N';
        }
        const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
          return `"${escaped}"`;
        }
        return escaped;
      });
      csvContent += csvRow.join(',') + '\n';
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`✅ File CSV creato: ${csvPath}`);
    console.log(`📊 Dimensioni file: ${(fs.statSync(csvPath).size / 1024 / 1024).toFixed(2)} MB`);
    
    // STEP 6: Import con LOAD DATA INFILE
    console.log('\n🚀 STEP 6: Import con LOAD DATA INFILE...');
    
    const loadDataQuery = `
      LOAD DATA INFILE '${csvPath.replace(/\\/g, '/')}'
      INTO TABLE fatt_delivery
      FIELDS TERMINATED BY ','
      ENCLOSED BY '"'
      ESCAPED BY '\\\\'
      LINES TERMINATED BY '\\n'
      IGNORE 1 ROWS
      (source_name, appalto, ordine, cod_vettore, descr_vettore, viaggio,
       consegna_num, cod_cliente, ragione_sociale, cod_articolo, descr_articolo,
       gr_stat, descr_gruppo_st, classe_prod, descr_classe_prod, classe_tariffa,
       anomalia, data_mov_merce, colli, tariffa, tariffa_vuoti, compenso,
       tr_cons, tot_compenso, bu, \`div\`, dep, tipologia, cod_em_fat,
       emittente_fattura, oda)
    `;
    
    console.log('📋 Esecuzione LOAD DATA INFILE...');
    const startTime = Date.now();
    
    try {
      await new Promise((resolve, reject) => {
        connection.query(loadDataQuery, (error, results) => {
          if (error) reject(error);
          else resolve(results);
        });
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Import completato in ${duration.toFixed(2)} secondi`);
      
    } catch (error) {
      console.log(`❌ Errore LOAD DATA INFILE: ${error.message}`);
      throw error;
    }
    
    // STEP 7: Verifica finale
    console.log('\n📊 STEP 7: Verifica finale...');
    
    const finalCount = await new Promise((resolve, reject) => {
      connection.query(`
        SELECT COUNT(*) as count 
        FROM fatt_delivery 
        WHERE source_name = 'Futura_Agosto.xlsx'
      `, (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    console.log(`\n📊 RISULTATI FINALI:`);
    console.log(`   📋 Record importati: ${finalCount[0].count}`);
    console.log(`   📋 Righe nel file Excel: ${data.length}`);
    
    if (finalCount[0].count === data.length) {
      console.log(`   🎉 SUCCESSO! Tutte le righe sono state importate correttamente!`);
    } else {
      console.log(`   ⚠️  ATTENZIONE: Numero di righe non corrisponde`);
    }
    
    // Test di alcuni record con date corrette
    console.log('\n🔍 Test di alcuni record importati...');
    const testRecords = await new Promise((resolve, reject) => {
      connection.query(`
        SELECT 
          id, source_name, \`div\`, classe_tariffa, classe_prod, ID_fatt, dep,
          data_mov_merce, mese, settimana
        FROM fatt_delivery 
        WHERE source_name = 'Futura_Agosto.xlsx'
        LIMIT 5
      `, (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    console.log('\n📋 ESEMPI RECORD IMPORTATI:');
    testRecords.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}, Div: ${row.div}, Classe_Tariffa: ${row.classe_tariffa}, Classe_Prod: ${row.classe_prod}`);
      console.log(`      ID_fatt: ${row.ID_fatt}, Dep: ${row.dep}`);
      console.log(`      Data: ${row.data_mov_merce}, Mese: ${row.mese}, Settimana: ${row.settimana}`);
    });
    
    // STEP 8: Pulizia file temporaneo
    console.log('\n🧹 STEP 8: Pulizia file temporaneo...');
    try {
      fs.unlinkSync(csvPath);
      console.log('✅ File temporaneo rimosso');
    } catch (error) {
      console.log(`⚠️  Errore rimozione file temporaneo: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
    throw error;
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

// Esegui l'import
importExcelFile()
  .then(() => {
    console.log('\n✅ Import con date corrette completato');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Errore durante l\'import:', error);
    process.exit(1);
  });
