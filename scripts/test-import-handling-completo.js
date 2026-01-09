const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Carica la configurazione del database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestionelogistica',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Funzioni di conversione (copiate dall'API)
function convertDate(dateValue) {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'number') {
    try {
      const excelDate = XLSX.SSF.parse_date_code(dateValue);
      if (excelDate) {
        const year = excelDate.y;
        const month = String(excelDate.m).padStart(2, '0');
        const day = String(excelDate.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Ignora
    }
  }
  
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

function convertNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return isNaN(num) ? null : num;
}

async function getDeposito(connection, div) {
  if (!div || !connection) return null;
  
  try {
    const [rows] = await connection.execute(
      'SELECT Deposito FROM tab_deposito WHERE TRIM(`DIV`) = TRIM(?) LIMIT 1',
      [div]
    );
    
    return rows.length > 0 ? rows[0].Deposito : null;
  } catch (error) {
    console.error(`Errore recupero deposito per div=${div}:`, error.message);
    return null;
  }
}

async function testImport() {
  const filePath = path.join(__dirname, '..', 'import', 'Mensili', 'Handling_da_importare.xlsx');
  
  console.log('🧪 TEST IMPORT HANDLING');
  console.log('='.repeat(60));
  console.log('📁 File:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File non trovato!');
    return;
  }

  let connection = null;
  
  try {
    // Connessione al database
    console.log('\n🔌 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database:', dbConfig.database);

    // Leggi il file Excel
    console.log('\n📖 Lettura file Excel...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File letto: ${data.length} righe totali`);
    
    // Test con le prime 10 righe
    const testRows = 10;
    const testData = data.slice(0, testRows);
    
    console.log(`\n🧪 Test importazione prime ${testRows} righe...`);
    console.log('-'.repeat(60));

    const insertQuery = `
      INSERT INTO fatt_handling (
        source_name, Appalto, BU, em_fatt, rag_soc, \`div\`, dep, mag, TMv,
        tipo_movimento, doc_mat, EsMat, pos, Materiale, descrizione_materiale,
        gr_m, \`comp\`, doc_acq, EsMat_1, Cliente, data_mov_m, quantita, UMO,
        qta_uma, tipo_imb, t_hf_umv, imp_hf_um, imp_resi_v, imp_doc, tot_hand, Mese
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < testData.length; i++) {
      const row = testData[i];
      
      try {
        // Prepara i valori
        const div = String(row.div || '').trim();
        const deposito = await getDeposito(connection, div);
        
        const values = [
          row.source_name || null,
          row.appalto || null,
          row.bu || null,
          row.em_fatt || null,
          row.rag_soc || null,
          div || null,
          deposito,
          convertNumber(row.mag),
          convertNumber(row.tmv),
          row.tipo_movimento || null,
          convertNumber(row.doc_mat),
          convertNumber(row.esmat),
          convertNumber(row.pos),
          row.materiale || null,
          row.descrizione_materiale || null,
          row.gr_m || null,
          convertNumber(row['Comp.']),
          row.oda || null,
          convertNumber(row.esmat_1),
          row.cliente || null,
          convertDate(row.data_mov_m),
          convertNumber(row.quantita),
          row.umo || null,
          convertNumber(row.qta_uma),
          row.tipo_imb || null,
          convertNumber(row.t_hf_umv),
          convertNumber(row['Imp. H. UM']),
          convertNumber(row['Imp.Resi V']),
          convertNumber(row['Imp. Doc.']),
          convertNumber(row.tot_hand),
          convertNumber(row.mese || row.Mese || row['Mese'])
        ];

        // Verifica che l'array abbia la lunghezza corretta (31 elementi, indici 0-30)
        if (values.length !== 31) {
          throw new Error(`Array values ha lunghezza errata: ${values.length} invece di 31`);
        }
        
        // Il mese è all'ultimo indice (30)
        const mese = values[30];
        
        // Verifica che il mese sia stato letto correttamente
        if (mese === null || mese === undefined) {
          const meseRaw = row.mese || row.Mese || row['Mese'];
          throw new Error(`Mese non trovato nella riga ${i + 1}. Valore raw: ${meseRaw}, convertito: ${mese}`);
        }

        // Test inserimento (con rollback)
        await connection.beginTransaction();
        await connection.execute(insertQuery, values);
        await connection.rollback(); // Rollback per non inserire dati di test
        
        successCount++;
        console.log(`✅ Riga ${i + 1}: OK - Mese: ${mese}, Div: ${div}, Tot_hand: ${values[29]}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Riga ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RISULTATI TEST:');
    console.log(`   ✅ Righe elaborate con successo: ${successCount}/${testRows}`);
    console.log(`   ❌ Errori: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errori trovati:');
      errors.forEach(e => console.log(`   - ${e}`));
    }

    if (successCount === testRows) {
      console.log('\n✅ TEST COMPLETATO CON SUCCESSO!');
      console.log('   L\'importazione dovrebbe funzionare correttamente.');
      console.log(`   Il file completo ha ${data.length} righe.`);
      console.log('   Puoi procedere con l\'importazione completa dal browser.');
    } else {
      console.log('\n⚠️  ATTENZIONE: Alcuni errori sono stati trovati durante il test.');
      console.log('   Controlla gli errori sopra prima di procedere con l\'importazione completa.');
    }

  } catch (error) {
    console.error('\n❌ ERRORE CRITICO:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

// Esegui il test
testImport().catch(console.error);
