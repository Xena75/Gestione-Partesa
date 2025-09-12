const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function importMonitoraggioTravels() {
  let connection;
  
  try {
    console.log('🔄 Avvio import monitoraggio_import.xlsx in tabella travels...');
    
    // Configurazione database viaggi_db
    const dbConfig = {
      host: process.env.DB_VIAGGI_HOST,
      user: process.env.DB_VIAGGI_USER,
      password: process.env.DB_VIAGGI_PASS,
      database: process.env.DB_VIAGGI_NAME,
      port: process.env.DB_VIAGGI_PORT || 3306
    };

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connesso al database viaggi_db');

    // Leggi il file Excel
    const excelPath = path.join(__dirname, 'import x test', 'monitoraggio_import.xlsx');
    console.log(`📁 Leggendo file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Trovati ${data.length} record nel file Excel`);

    if (data.length === 0) {
      console.log('⚠️ Nessun dato da importare');
      return;
    }

    // Funzione per convertire date seriali Excel in formato MySQL
    function excelSerialToMySQLDate(serialDate) {
      if (!serialDate || serialDate === '') return null;
      
      // Excel serial date: 1 = 1900-01-01, ma Excel ha un bug: considera 1900 come bisestile
      // Quindi dobbiamo sottrarre 2 giorni per date dopo il 28 febbraio 1900
      const excelEpoch = new Date(1900, 0, 1);
      const days = serialDate - 2; // Sottraiamo 2 per il bug di Excel
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Funzione per convertire datetime seriali Excel
    function excelSerialToMySQLDateTime(serialDateTime) {
      if (!serialDateTime || serialDateTime === '') return null;
      
      const excelEpoch = new Date(1900, 0, 1);
      const days = Math.floor(serialDateTime) - 2; // Parte intera = giorni
      const time = (serialDateTime - Math.floor(serialDateTime)) * 24; // Parte decimale = ore
      
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      const hours = Math.floor(time);
      const minutes = Math.floor((time - hours) * 60);
      const seconds = Math.floor(((time - hours) * 60 - minutes) * 60);
      
      date.setHours(hours, minutes, seconds);
      
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('🔄 Elaborazione e inserimento dati...');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Prepara i dati per l'inserimento
        const insertData = {
          id: `Viaggio - ${row.numeroViaggio}`, // Genera l'id manualmente
          deposito: row.deposito || null,
          numeroViaggio: row.numeroViaggio || null,
          data_viaggio: excelSerialToMySQLDate(row.data_viaggio),
          dataOraInizioViaggio: excelSerialToMySQLDateTime(row.dataOraInizioViaggio),
          dataOraFineViaggio: excelSerialToMySQLDateTime(row.dataOraFineViaggio),
          nominativoId: row.nominativoId || null,
          affiancatoDaId: null, // Campo calcolato nel DB
          totaleColli: row.totaleColli || null,
          targaMezzoId: row.targaMezzoId || null,
          kmIniziali: row.kmIniziali || null,
          kmFinali: row.kmFinali || null,
          kmAlRifornimento: row.kmAlRifornimento || null,
          litriRiforniti: row.litriRiforniti || null,
          euroLitro: row.euroLitro || null,
          haiEffettuatoRitiri: 0, // Campo calcolato nel DB
          // kmEffettivi, oreEffettive, mese sono calcolati nel DB
          // createdAt, updatedAt sono gestiti automaticamente
        };

        // Query INSERT IGNORE per evitare duplicati
        const insertQuery = `
          INSERT IGNORE INTO travels (
            id, deposito, numeroViaggio, data_viaggio, dataOraInizioViaggio, dataOraFineViaggio,
            nominativoId, affiancatoDaId, totaleColli, targaMezzoId, kmIniziali, kmFinali,
            kmAlRifornimento, litriRiforniti, euroLitro, haiEffettuatoRitiri
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          insertData.id,
          insertData.deposito,
          insertData.numeroViaggio,
          insertData.data_viaggio,
          insertData.dataOraInizioViaggio,
          insertData.dataOraFineViaggio,
          insertData.nominativoId,
          insertData.affiancatoDaId,
          insertData.totaleColli,
          insertData.targaMezzoId,
          insertData.kmIniziali,
          insertData.kmFinali,
          insertData.kmAlRifornimento,
          insertData.litriRiforniti,
          insertData.euroLitro,
          insertData.haiEffettuatoRitiri
        ];

        const [result] = await connection.execute(insertQuery, values);
        
        if (result.affectedRows > 0) {
          insertedCount++;
          if (insertedCount % 10 === 0) {
            console.log(`📈 Progresso: ${insertedCount} record inseriti...`);
          }
        } else {
          skippedCount++;
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Errore alla riga ${i + 1}:`, error.message);
        console.error(`📋 Dati riga:`, row);
      }
    }

    console.log('\n✅ IMPORT COMPLETATO!');
    console.log(`📊 Riepilogo:`);
    console.log(`   ✅ Record inseriti: ${insertedCount}`);
    console.log(`   ⏭️ Record già esistenti (saltati): ${skippedCount}`);
    console.log(`   ❌ Errori: ${errorCount}`);
    console.log(`   📁 Totale record nel file: ${data.length}`);

    // Verifica finale
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM travels');
    const totalRecords = countResult[0].count;
    console.log(`\n📈 Totale record in tabella travels: ${totalRecords}`);

  } catch (error) {
    console.error('❌ Errore durante l\'import:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connessione chiusa');
    }
  }
}

// Esegui l'import
importMonitoraggioTravels()
  .then(() => {
    console.log('\n🎉 IMPORT COMPLETATO CON SUCCESSO!');
    console.log('🔒 I dati esistenti sono rimasti intatti!');
  })
  .catch(error => {
    console.error('💥 ERRORE FATALE:', error);
    process.exit(1);
  });
