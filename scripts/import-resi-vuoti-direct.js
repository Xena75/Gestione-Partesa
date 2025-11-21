const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  charset: 'utf8mb4'
};

// Funzione per convertire seriale Excel in data SQL
function convertExcelDateToSQL(excelSerial) {
  if (!excelSerial || isNaN(excelSerial)) return null;
  
  // Excel conta i giorni dal 1 gennaio 1900, ma ha un bug: considera il 1900 come anno bisestile
  // Quindi sottraiamo 2 giorni invece di 1
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (excelSerial - 2) * 24 * 60 * 60 * 1000);
  
  // Verifica che la data sia valida
  if (isNaN(jsDate.getTime())) return null;
  
  // Formato SQL DATE: YYYY-MM-DD
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

async function importResiVuoti() {
  let connection = null;
  
  try {
    const excelFile = path.join(__dirname, '..', 'import', 'Resi_vuoti_non_pagati_format.xlsx');
    
    console.log('📄 Lettura file Excel:', excelFile);
    
    if (!require('fs').existsSync(excelFile)) {
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
    
    console.log(`📊 Righe da importare: ${rows.length}\n`);
    
    // Connessione al database
    console.log('🔌 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();
    console.log('✅ Connesso al database\n');
    
    let imported = 0;
    let errors = [];
    const batchSize = 100;
    
    // Processa le righe in batch
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = [];
      
      console.log(`📦 Processamento batch ${Math.floor(i / batchSize) + 1} (righe ${i + 1}-${Math.min(i + batchSize, rows.length)})...`);
      
      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j + 1;
        const row = batch[j];
        
        try {
          // Mappa le colonne del file Excel
          const riferimento = row[headers.indexOf('Riferimento')] || null;
          const dataRifDdtRaw = row[headers.indexOf('Data rif/ddt')];
          const ddt = row[headers.indexOf('ddt')] ? String(row[headers.indexOf('ddt')]) : null;
          const codCliente = row[headers.indexOf('Cod_Cliente')] ? String(row[headers.indexOf('Cod_Cliente')]) : null;
          const vettore = row[headers.indexOf('VETTORE')] ? String(row[headers.indexOf('VETTORE')]) : null;
          const codProdRaw = row[headers.indexOf('Cod. Prod.')] ? String(row[headers.indexOf('Cod. Prod.')]) : null;
          const codProd = codProdRaw ? codProdRaw.toUpperCase().trim() : null;
          const colli = row[headers.indexOf('Colli')] ? parseInt(String(row[headers.indexOf('Colli')])) : null;
          const dataRitiroRaw = row[headers.indexOf('Data Ritiro')];
          
          // Validazione campi obbligatori
          if (!codCliente || !codProd || colli === null || colli === undefined) {
            errors.push(`Riga ${rowIndex}: Campi obbligatori mancanti (Cod_Cliente, Cod_Prod, Colli)`);
            continue;
          }
          
          // Converti date da seriale Excel
          const dataRifDdt = dataRifDdtRaw ? convertExcelDateToSQL(Number(dataRifDdtRaw)) : null;
          const dataRitiro = dataRitiroRaw ? convertExcelDateToSQL(Number(dataRitiroRaw)) : null;
          
          if (!dataRifDdt) {
            errors.push(`Riga ${rowIndex}: Data rif/ddt non valida (valore: ${dataRifDdtRaw})`);
            continue;
          }
          
          // Recupera dati da fatt_delivery per Cod_Cliente (DISTINCT)
          const [clienteRows] = await connection.execute(
            `SELECT DISTINCT \`div\`, classe_tariffa, ragione_sociale 
             FROM fatt_delivery 
             WHERE cod_cliente = ? 
             LIMIT 1`,
            [codCliente]
          );
          
          if (!clienteRows || clienteRows.length === 0) {
            errors.push(`Riga ${rowIndex}: Cliente ${codCliente} non trovato in fatt_delivery`);
            continue;
          }
          
          const { div, classe_tariffa, ragione_sociale } = clienteRows[0];
          
          // Recupera dati da fatt_delivery per Cod_Prod (DISTINCT)
          const [prodRows] = await connection.execute(
            `SELECT DISTINCT classe_prod, descr_articolo 
             FROM fatt_delivery 
             WHERE cod_articolo = ? 
             LIMIT 1`,
            [codProd]
          );
          
          if (!prodRows || prodRows.length === 0) {
            errors.push(`Riga ${rowIndex}: Prodotto ${codProd} non trovato in fatt_delivery`);
            continue;
          }
          
          const { classe_prod, descr_articolo } = prodRows[0];
          
          // Calcola ID_TARIFFA
          const idTariffa = `${div}-${classe_tariffa}-${classe_prod}`;
          
          // Recupera Deposito da tab_deposito
          // Nota: DIV è una parola riservata, quindi va quotata con backtick
          const [depositoRows] = await connection.execute(
            `SELECT Deposito 
             FROM tab_deposito 
             WHERE \`DIV\` = ? 
             LIMIT 1`,
            [div]
          );
          
          const deposito = depositoRows && depositoRows.length > 0 ? depositoRows[0].Deposito : null;
          
          // Recupera Tariffa da tab_tariffe
          const [tariffaRows] = await connection.execute(
            `SELECT Tariffa 
             FROM tab_tariffe 
             WHERE ID_Fatt = ? 
             LIMIT 1`,
            [idTariffa]
          );
          
          const tariffa = tariffaRows && tariffaRows.length > 0 ? parseFloat(tariffaRows[0].Tariffa) : null;
          
          // Calcola Totale_compenso
          const totaleCompenso = tariffa !== null && !isNaN(tariffa) ? colli * tariffa : null;
          
          // Prepara valori per inserimento
          values.push([
            riferimento,
            dataRifDdt,
            ddt,
            codCliente,
            ragione_sociale || null,
            vettore,
            codProd,
            descr_articolo || null,
            deposito || null,
            colli,
            dataRitiro,
            idTariffa,
            tariffa,
            totaleCompenso
          ]);
          
        } catch (error) {
          errors.push(`Riga ${rowIndex}: ${error.message}`);
          console.error(`   ❌ Errore riga ${rowIndex}:`, error.message);
        }
      }
      
      // Inserisci batch
      if (values.length > 0) {
        await connection.query(
          `INSERT INTO resi_vuoti_non_fatturati 
           (Riferimento, Data_rif_ddt, ddt, Cod_Cliente, ragione_sociale, VETTORE, Cod_Prod, descr_articolo, Deposito, Colli, Data_Ritiro, ID_TARIFFA, Tariffa, Totale_compenso)
           VALUES ?`,
          [values]
        );
        imported += values.length;
        console.log(`   ✅ Importate ${imported} righe su ${rows.length}`);
      }
    }
    
    await connection.commit();
    console.log('\n' + '='.repeat(70));
    console.log('✅ Import completato!');
    console.log(`📊 Righe importate: ${imported}`);
    console.log(`📊 Totale righe nel file: ${rows.length}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errori riscontrati (${errors.length}):`);
      errors.slice(0, 20).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      if (errors.length > 20) {
        console.log(`   ... e altri ${errors.length - 20} errori`);
      }
    } else {
      console.log('\n✅ Nessun errore!');
    }
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('\n❌ Errore durante l\'import:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

importResiVuoti();

