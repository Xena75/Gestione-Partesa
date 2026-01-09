const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Configurazione database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestionelogistica',
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

async function importHandling() {
  // Accetta il nome del file come parametro da riga di comando
  const fileName = process.argv[2] || 'Handling_da_importare.xlsx';
  const filePath = path.join(__dirname, '..', 'import', 'Mensili', fileName);
  
  console.log('🚀 IMPORT HANDLING DA FILE');
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
    
    // Verifica duplicati
    const sourceName = data[0]?.source_name || path.basename(filePath);
    const meseFromData = data[0]?.mese || data[0]?.Mese || data[0]?.['Mese'];
    
    if (meseFromData) {
      const [existingRecords] = await connection.execute(
        'SELECT COUNT(*) as count FROM fatt_handling WHERE source_name = ? AND mese = ?',
        [sourceName, meseFromData]
      );
      
      const existingCount = existingRecords[0]?.count || 0;
      
      if (existingCount > 0) {
        console.log(`\n⚠️  ATTENZIONE: Il file "${sourceName}" per il mese ${meseFromData} è già stato importato (${existingCount} record trovati).`);
        console.log('   Vuoi continuare comunque? (s/n)');
        // Per ora continua, ma in produzione potresti chiedere conferma
      }
    }

    const insertQuery = `
      INSERT INTO fatt_handling (
        source_name, Appalto, BU, em_fatt, rag_soc, \`div\`, dep, mag, TMv,
        tipo_movimento, doc_mat, EsMat, pos, Materiale, descrizione_materiale,
        gr_m, \`comp\`, doc_acq, EsMat_1, Cliente, data_mov_m, quantita, UMO,
        qta_uma, tipo_imb, t_hf_umv, imp_hf_um, imp_resi_v, imp_doc, tot_hand, Mese
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Cache depositi
    const depositoCache = new Map();
    
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];
    const batchSize = 1000;
    
    console.log('\n📥 Inizio importazione...');
    console.log('-'.repeat(60));
    
    // Processa i dati in batch
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchValues = [];
      
      for (const row of batch) {
        try {
          const div = String(row.div || '').trim();
          
          // Recupera deposito (con cache)
          let deposito = depositoCache.get(div);
          if (deposito === undefined) {
            deposito = await getDeposito(connection, div);
            depositoCache.set(div, deposito);
          }
          
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
          
          batchValues.push(values);
        } catch (error) {
          errorCount++;
          errors.push(`Riga ${i + batchValues.length + 1}: ${error.message}`);
        }
      }
      
      // Inserisci il batch
      if (batchValues.length > 0) {
        try {
          const placeholders = batchValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flatValues = batchValues.flat();
          
          await connection.execute(
            insertQuery.replace('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', `VALUES ${placeholders}`),
            flatValues
          );
          
          importedCount += batchValues.length;
          const progress = ((i + batchValues.length) / data.length * 100).toFixed(1);
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batchValues.length} righe importate (${progress}% - totale: ${importedCount}/${data.length})`);
        } catch (error) {
          console.error(`❌ Errore inserimento batch, fallback a inserimenti singoli:`, error.message);
          
          for (const values of batchValues) {
            try {
              await connection.execute(insertQuery, values);
              importedCount++;
            } catch (singleError) {
              errorCount++;
              errors.push(`Riga ${importedCount + errorCount}: ${singleError.message}`);
            }
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RISULTATI IMPORT:');
    console.log(`   ✅ Righe importate: ${importedCount}`);
    console.log(`   ❌ Errori: ${errorCount}`);
    console.log(`   📊 Totale righe: ${data.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errori trovati (primi 10):');
      errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
    }
    
    console.log('\n✅ Import completato!');
    
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

// Esegui l'import
importHandling().catch(console.error);
