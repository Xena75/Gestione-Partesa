const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

// Funzione per convertire seriale Excel in data SQL
function convertExcelDateToSQL(excelSerial) {
  if (!excelSerial || isNaN(excelSerial)) return null;
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (excelSerial - 2) * 24 * 60 * 60 * 1000);
  if (isNaN(jsDate.getTime())) return null;
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function exportRigheNonImportate() {
  let connection = null;
  
  try {
    const excelFile = path.join(__dirname, '..', 'import', 'Resi_vuoti_non_pagati_format.xlsx');
    const outputFile = path.join(__dirname, '..', 'import', 'Righe_non_importate.xlsx');
    
    console.log('📄 Lettura file Excel originale:', excelFile);
    
    if (!fs.existsSync(excelFile)) {
      console.error(`❌ File non trovato: ${excelFile}`);
      process.exit(1);
    }
    
    // Leggi il file Excel
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length <= 1) {
      console.error('❌ Il file Excel non contiene dati validi');
      process.exit(1);
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log(`📊 Righe totali nel file Excel: ${rows.length}\n`);
    
    // Connessione al database
    console.log('🔌 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database\n');
    
    // Recupera tutte le righe importate dal database
    console.log('📥 Recupero righe importate dal database...');
    const [importedRows] = await connection.execute(`
      SELECT 
        Cod_Cliente,
        Cod_Prod,
        Data_rif_ddt,
        Colli,
        ddt,
        Riferimento
      FROM resi_vuoti_non_fatturati
    `);
    
    console.log(`✅ Righe importate nel database: ${importedRows.length}\n`);
    
    // Crea un Set con le chiavi delle righe importate per lookup veloce
    // Usa i valori esatti come salvati nel database
    const importedKeys = new Set();
    importedRows.forEach(row => {
      const codCliente = String(row.Cod_Cliente || '').trim();
      const codProd = String(row.Cod_Prod || '').trim();
      const dataStr = row.Data_rif_ddt ? row.Data_rif_ddt.toISOString().split('T')[0] : '';
      const colli = row.Colli || 0;
      const key = `${codCliente}|${codProd}|${dataStr}|${colli}`;
      importedKeys.add(key);
    });
    
    console.log(`📝 Chiavi importate create: ${importedKeys.size}`);
    
    // Identifica righe non importate
    console.log('🔍 Analisi righe non importate...');
    const righeNonImportate = [];
    const errori = [];
    
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2; // +2 perché index parte da 0 e c'è l'header
      
      try {
        // Estrai valori dalla riga Excel
        const riferimento = row[headers.indexOf('Riferimento')] || null;
        const dataRifDdtRaw = row[headers.indexOf('Data rif/ddt')];
        const ddt = row[headers.indexOf('ddt')] ? String(row[headers.indexOf('ddt')]) : null;
        const codCliente = row[headers.indexOf('Cod_Cliente')] ? String(row[headers.indexOf('Cod_Cliente')]) : null;
        const vettore = row[headers.indexOf('VETTORE')] ? String(row[headers.indexOf('VETTORE')]) : null;
        const codProd = row[headers.indexOf('Cod. Prod.')] ? String(row[headers.indexOf('Cod. Prod.')]) : null;
        const colli = row[headers.indexOf('Colli')] ? parseInt(String(row[headers.indexOf('Colli')])) : null;
        const dataRitiroRaw = row[headers.indexOf('Data Ritiro')];
        
        // Validazione campi obbligatori
        if (!codCliente || !codProd || colli === null || colli === undefined || !dataRifDdtRaw) {
          errori.push({
            riga: rowNum,
            motivo: 'Campi obbligatori mancanti',
            dati: { codCliente, codProd, colli, dataRifDdt: dataRifDdtRaw }
          });
          righeNonImportate.push({
            'Riga Excel': rowNum,
            'Riferimento': riferimento || '',
            'Data rif/ddt': dataRifDdtRaw || '',
            'ddt': ddt || '',
            'Cod_Cliente': codCliente || '',
            'VETTORE': vettore || '',
            'Cod. Prod.': codProd || '',
            'Colli': colli || '',
            'Data Ritiro': dataRitiroRaw || '',
            'Motivo': 'Campi obbligatori mancanti'
          });
          continue;
        }
        
        // Converti data
        const dataRifDdt = convertExcelDateToSQL(Number(dataRifDdtRaw));
        if (!dataRifDdt) {
          errori.push({
            riga: rowNum,
            motivo: 'Data rif/ddt non valida',
            dati: { dataRifDdtRaw }
          });
          righeNonImportate.push({
            'Riga Excel': rowNum,
            'Riferimento': riferimento || '',
            'Data rif/ddt': dataRifDdtRaw || '',
            'ddt': ddt || '',
            'Cod_Cliente': codCliente || '',
            'VETTORE': vettore || '',
            'Cod. Prod.': codProd || '',
            'Colli': colli || '',
            'Data Ritiro': dataRitiroRaw || '',
            'Motivo': 'Data rif/ddt non valida'
          });
          continue;
        }
        
        // Normalizza i valori per il confronto (come fatto per importedKeys)
        const codClienteNorm = String(codCliente || '').trim();
        const codProdNorm = String(codProd || '').trim();
        const dataStr = dataRifDdt;
        const colliNorm = colli || 0;
        
        // Verifica direttamente nel database se la riga è stata importata
        const [existingRows] = await connection.execute(
          `SELECT COUNT(*) as count 
           FROM resi_vuoti_non_fatturati 
           WHERE Cod_Cliente = ? 
             AND Cod_Prod = ? 
             AND Data_rif_ddt = ? 
             AND Colli = ?`,
          [codCliente, codProd, dataRifDdt, colli]
        );
        
        if (existingRows[0].count === 0) {
          // Verifica il motivo per cui non è stata importata
          let motivo = 'Non trovata nel database';
          
          // Verifica se il cliente esiste
          const [clienteCheck] = await connection.execute(
            `SELECT COUNT(*) as count FROM fatt_delivery WHERE cod_cliente = ? LIMIT 1`,
            [codCliente]
          );
          
          if (clienteCheck[0].count === 0) {
            motivo = 'Cliente non trovato in fatt_delivery';
          } else {
            // Verifica se il prodotto esiste
            const [prodCheck] = await connection.execute(
              `SELECT COUNT(*) as count FROM fatt_delivery WHERE cod_articolo = ? LIMIT 1`,
              [codProd]
            );
            
            if (prodCheck[0].count === 0) {
              motivo = 'Prodotto non trovato in fatt_delivery';
            }
          }
          
          righeNonImportate.push({
            'Riga Excel': rowNum,
            'Riferimento': riferimento || '',
            'Data rif/ddt': dataRifDdtRaw || '',
            'ddt': ddt || '',
            'Cod_Cliente': codCliente || '',
            'VETTORE': vettore || '',
            'Cod. Prod.': codProd || '',
            'Colli': colli || '',
            'Data Ritiro': dataRitiroRaw || '',
            'Motivo': motivo
          });
        }
        
      } catch (error) {
        errori.push({
          riga: rowNum,
          motivo: `Errore elaborazione: ${error.message}`,
          dati: {}
        });
        righeNonImportate.push({
          'Riga Excel': rowNum,
          'Riferimento': '',
          'Data rif/ddt': '',
          'ddt': '',
          'Cod_Cliente': '',
          'VETTORE': '',
          'Cod. Prod.': '',
          'Colli': '',
          'Data Ritiro': '',
          'Motivo': `Errore elaborazione: ${error.message}`
        });
      }
    }
    
    console.log(`\n📊 Righe non importate trovate: ${righeNonImportate.length}`);
    
    if (righeNonImportate.length > 0) {
      // Crea un nuovo workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(righeNonImportate);
      
      // Aggiungi il foglio al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Righe non importate');
      
      // Scrivi il file
      XLSX.writeFile(wb, outputFile);
      
      console.log(`\n✅ File creato: ${outputFile}`);
      console.log(`\n📋 Riepilogo motivi:`);
      
      const motivi = {};
      righeNonImportate.forEach(row => {
        const motivo = row.Motivo || 'Sconosciuto';
        motivi[motivo] = (motivi[motivo] || 0) + 1;
      });
      
      Object.entries(motivi).forEach(([motivo, count]) => {
        console.log(`   - ${motivo}: ${count} righe`);
      });
      
    } else {
      console.log('\n✅ Tutte le righe sono state importate correttamente!');
    }
    
  } catch (error) {
    console.error('\n❌ Errore durante l\'esportazione:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

exportRigheNonImportate();
