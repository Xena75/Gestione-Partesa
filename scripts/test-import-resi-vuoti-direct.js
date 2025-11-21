const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

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
  
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (excelSerial - 2) * 24 * 60 * 60 * 1000);
  
  if (isNaN(jsDate.getTime())) return null;
  
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

async function testImport() {
  let connection = null;
  
  try {
    const excelFile = path.join(__dirname, '..', 'import', 'Resi_vuoti_non_pagati_format.xlsx');
    
    console.log('🧪 Test import resi_vuoti_non_fatturati');
    console.log('='.repeat(70));
    console.log(`📁 File: ${excelFile}`);
    console.log('='.repeat(70));

    // Verifica che il file esista
    const fs = require('fs');
    if (!fs.existsSync(excelFile)) {
      console.error(`❌ File non trovato: ${excelFile}`);
      process.exit(1);
    }

    // Leggi il file Excel
    console.log('\n📄 Lettura file Excel...');
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
    
    console.log(`📊 Righe da importare: ${rows.length}`);
    console.log(`📋 Colonne: ${headers.join(', ')}`);

    // Connessione al database
    console.log('\n🔌 Connessione al database...');
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();
    console.log('✅ Connesso al database');

    let imported = 0;
    let errors = [];
    const batchSize = 100;

    // Processa le righe in batch
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNum = i + j + 1;
        
        try {
          // Mappa le colonne
          const riferimento = row[headers.indexOf('Riferimento')] || null;
          const dataRifDdtRaw = row[headers.indexOf('Data rif/ddt')];
          const ddt = row[headers.indexOf('ddt')] ? String(row[headers.indexOf('ddt')]) : null;
          const codCliente = row[headers.indexOf('Cod_Cliente')] ? String(row[headers.indexOf('Cod_Cliente')]) : null;
          const vettore = row[headers.indexOf('VETTORE')] ? String(row[headers.indexOf('VETTORE')]) : null;
          const codProd = row[headers.indexOf('Cod. Prod.')] ? String(row[headers.indexOf('Cod. Prod.')]) : null;
          const colli = row[headers.indexOf('Colli')] ? parseInt(String(row[headers.indexOf('Colli')])) : null;
          const dataRitiroRaw = row[headers.indexOf('Data Ritiro')];

          // Validazione
          if (!codCliente || !codProd || colli === null || colli === undefined) {
            errors.push(`Riga ${rowNum}: Campi obbligatori mancanti`);
            continue;
          }

          // Converti date
          const dataRifDdt = dataRifDdtRaw ? convertExcelDateToSQL(Number(dataRifDdtRaw)) : null;
          const dataRitiro = dataRitiroRaw ? convertExcelDateToSQL(Number(dataRitiroRaw)) : null;

          if (!dataRifDdt) {
            errors.push(`Riga ${rowNum}: Data rif/ddt non valida`);
            continue;
          }

          // JOIN con fatt_delivery per Cod_Cliente
          const [clienteRows] = await connection.execute(
            `SELECT DISTINCT div, classe_tariffa 
             FROM fatt_delivery 
             WHERE cod_cliente = ? 
             LIMIT 1`,
            [codCliente]
          );

          if (!clienteRows || clienteRows.length === 0) {
            errors.push(`Riga ${rowNum}: Cliente ${codCliente} non trovato`);
            continue;
          }

          const div = clienteRows[0]['div'];
          const classe_tariffa = clienteRows[0].classe_tariffa;

          // JOIN con fatt_delivery per Cod_Prod
          const [prodRows] = await connection.execute(
            `SELECT DISTINCT classe_prod 
             FROM fatt_delivery 
             WHERE cod_articolo = ? 
             LIMIT 1`,
            [codProd]
          );

          if (!prodRows || prodRows.length === 0) {
            errors.push(`Riga ${rowNum}: Prodotto ${codProd} non trovato`);
            continue;
          }

          const { classe_prod } = prodRows[0];

          // Calcola ID_TARIFFA
          const idTariffa = `${div}-${classe_tariffa}-${classe_prod}`;

          // JOIN con tab_tariffe
          const [tariffaRows] = await connection.execute(
            `SELECT Tariffa 
             FROM tab_tariffe 
             WHERE ID_Fatt = ? 
             LIMIT 1`,
            [idTariffa]
          );

          const tariffa = tariffaRows && tariffaRows.length > 0 ? parseFloat(tariffaRows[0].Tariffa) : null;
          const totaleCompenso = tariffa !== null && !isNaN(tariffa) ? colli * tariffa : null;

          values.push([
            riferimento,
            dataRifDdt,
            ddt,
            codCliente,
            vettore,
            codProd,
            colli,
            dataRitiro,
            idTariffa,
            totaleCompenso
          ]);

        } catch (error) {
          errors.push(`Riga ${rowNum}: ${error.message}`);
          console.error(`Errore riga ${rowNum}:`, error.message);
        }
      }

      // Inserisci batch
      if (values.length > 0) {
        await connection.query(
          `INSERT INTO resi_vuoti_non_fatturati 
           (Riferimento, Data_rif_ddt, ddt, Cod_Cliente, VETTORE, Cod_Prod, Colli, Data_Ritiro, ID_TARIFFA, Totale_compenso)
           VALUES ?`,
          [values]
        );
        imported += values.length;
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${values.length} righe importate (totale: ${imported}/${rows.length})`);
      }
    }

    await connection.commit();

    console.log('\n' + '='.repeat(70));
    console.log('📊 RISULTATI IMPORT:');
    console.log('='.repeat(70));
    console.log(`✅ Righe importate: ${imported}/${rows.length}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errori: ${errors.length}`);
      errors.slice(0, 10).forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... e altri ${errors.length - 10} errori`);
      }
    } else {
      console.log('\n✅ Nessun errore!');
    }

    // Verifica dati inseriti
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM resi_vuoti_non_fatturati');
    console.log(`\n📊 Totale record nella tabella: ${count[0].total}`);

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
    }
  }
}

testImport();

