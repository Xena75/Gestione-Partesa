/**
 * Script di import dipendenti da Excel
 * File: import/dipendenti.xlsx
 * Database: viaggi_db
 * Tabella: employees
 * 
 * Logica:
 * - UPDATE per dipendenti esistenti (match su codice_fiscale)
 * - INSERT per nuovi dipendenti
 */

const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

// Funzione per convertire data Excel (numero seriale) in formato SQL
function excelDateToSQL(excelDate) {
  if (!excelDate || excelDate === '') return null;
  
  // Excel usa il 1900-01-01 come giorno 1
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const excelEpoch = new Date(1899, 11, 30); // 30 dicembre 1899
  const date = new Date(excelEpoch.getTime() + excelDate * millisecondsPerDay);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

async function importEmployees() {
  let connection;
  
  try {
    console.log('=== IMPORT DIPENDENTI DA EXCEL ===\n');
    
    // 1. Leggi file Excel
    console.log('📂 Lettura file Excel...');
    const filePath = path.join(__dirname, '..', 'import', 'dipendenti.xlsx');
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ Trovati ${data.length} dipendenti nel file\n`);
    
    // 2. Connessione database
    console.log('🔌 Connessione al database...');
    connection = await mysql.createConnection({
      host: process.env.DB_VIAGGI_HOST || 'localhost',
      port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
      user: process.env.DB_VIAGGI_USER || 'root',
      password: process.env.DB_VIAGGI_PASSWORD || '',
      database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
      charset: 'utf8mb4'
    });
    
    console.log('✅ Connesso al database viaggi_db\n');
    
    // 3. Processa ogni dipendente
    let updated = 0;
    let inserted = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        // Prepara i dati (usa nomi colonne REALI del DB)
        const employee = {
          nome: row.nome || '',
          cognome: row.cognome || '',
          cod_fiscale: row.cod_fiscale || null,
          cellulare: row.cellulare ? String(row.cellulare) : null,
          email: row['e-mail'] || null,
          email_aziendale: row['e-mail aziendale'] || null,
          patente: row.tipo_patente || null,
          foto_url: row.foto || null,
          cittadinanza: row.cittadinanza || null,
          permesso_soggiorno: row.permesso_di_soggiorno || null,
          titolo_studio: row.titolo_di_studio || null,
          luogo_nascita: row.nato_a || null,
          data_nascita: excelDateToSQL(row.nato_il),
          cdc: row.cdc || null,
          tipo_contratto: row.tipo_contratto || null,
          ccnl: row.ccnl_applicato || null,
          livello: row.livello || null,
          qualifica: row.qualifica || null,
          orario_lavoro: row.orario_lavoro || null,
          data_assunzione: excelDateToSQL(row.data_assunzione),
          data_dimissioni: excelDateToSQL(row.data_dimissioni),
          indirizzo: row.indirizzo || null,
          cap: row.cap ? String(row.cap) : null,
          citta: row['località'] || null
        };
        
        // Verifica se il dipendente esiste già (basato su cod_fiscale)
        if (employee.cod_fiscale) {
          const [existing] = await connection.query(
            'SELECT id FROM employees WHERE cod_fiscale = ?',
            [employee.cod_fiscale]
          );
          
          if (existing.length > 0) {
            // UPDATE dipendente esistente
            await connection.query(`
              UPDATE employees SET
                nome = ?,
                cognome = ?,
                cellulare = ?,
                email = ?,
                email_aziendale = ?,
                patente = ?,
                foto_url = ?,
                cittadinanza = ?,
                permesso_soggiorno = ?,
                titolo_studio = ?,
                luogo_nascita = ?,
                data_nascita = ?,
                cdc = ?,
                tipo_contratto = ?,
                ccnl = ?,
                livello = ?,
                qualifica = ?,
                orario_lavoro = ?,
                data_assunzione = ?,
                data_dimissioni = ?,
                indirizzo = ?,
                cap = ?,
                citta = ?
              WHERE cod_fiscale = ?
            `, [
              employee.nome,
              employee.cognome,
              employee.cellulare,
              employee.email,
              employee.email_aziendale,
              employee.patente,
              employee.foto_url,
              employee.cittadinanza,
              employee.permesso_soggiorno,
              employee.titolo_studio,
              employee.luogo_nascita,
              employee.data_nascita,
              employee.cdc,
              employee.tipo_contratto,
              employee.ccnl,
              employee.livello,
              employee.qualifica,
              employee.orario_lavoro,
              employee.data_assunzione,
              employee.data_dimissioni,
              employee.indirizzo,
              employee.cap,
              employee.citta,
              employee.cod_fiscale
            ]);
            
            updated++;
            console.log(`✏️  AGGIORNATO: ${employee.nome} ${employee.cognome}`);
          } else {
            // INSERT nuovo dipendente
            await connection.query(`
              INSERT INTO employees (
                nome, cognome, cod_fiscale, cellulare, email, email_aziendale,
                patente, foto_url, cittadinanza, permesso_soggiorno,
                titolo_studio, luogo_nascita, data_nascita, cdc,
                tipo_contratto, ccnl, livello, qualifica, orario_lavoro,
                data_assunzione, data_dimissioni, indirizzo, cap, citta, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
              employee.nome,
              employee.cognome,
              employee.cod_fiscale,
              employee.cellulare,
              employee.email,
              employee.email_aziendale,
              employee.patente,
              employee.foto_url,
              employee.cittadinanza,
              employee.permesso_soggiorno,
              employee.titolo_studio,
              employee.luogo_nascita,
              employee.data_nascita,
              employee.cdc,
              employee.tipo_contratto,
              employee.ccnl,
              employee.livello,
              employee.qualifica,
              employee.orario_lavoro,
              employee.data_assunzione,
              employee.data_dimissioni,
              employee.indirizzo,
              employee.cap,
              employee.citta
            ]);
            
            inserted++;
            console.log(`➕ INSERITO: ${employee.nome} ${employee.cognome}`);
          }
        } else {
          // Nessun codice fiscale: INSERT forzato
          await connection.query(`
            INSERT INTO employees (
              nome, cognome, cod_fiscale, cellulare, email, email_aziendale,
              patente, foto_url, cittadinanza, permesso_soggiorno,
              titolo_studio, luogo_nascita, data_nascita, cdc,
              tipo_contratto, ccnl, livello, qualifica, orario_lavoro,
              data_assunzione, data_dimissioni, indirizzo, cap, citta, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            employee.nome,
            employee.cognome,
            employee.cod_fiscale,
            employee.cellulare,
            employee.email,
            employee.email_aziendale,
            employee.patente,
            employee.foto_url,
            employee.cittadinanza,
            employee.permesso_soggiorno,
            employee.titolo_studio,
            employee.luogo_nascita,
            employee.data_nascita,
            employee.cdc,
            employee.tipo_contratto,
            employee.ccnl,
            employee.livello,
            employee.qualifica,
            employee.orario_lavoro,
            employee.data_assunzione,
            employee.data_dimissioni,
            employee.indirizzo,
            employee.cap,
            employee.citta
          ]);
          
          inserted++;
          console.log(`➕ INSERITO (no CF): ${employee.nome} ${employee.cognome}`);
        }
        
      } catch (err) {
        errors++;
        console.error(`❌ ERRORE su ${row.nome} ${row.cognome}:`, err.message);
      }
    }
    
    // 4. Riepilogo finale
    console.log('\n=== RIEPILOGO ===');
    console.log(`✅ Aggiornati: ${updated}`);
    console.log(`➕ Inseriti: ${inserted}`);
    console.log(`❌ Errori: ${errors}`);
    console.log(`📊 Totale processati: ${data.length}`);
    
  } catch (error) {
    console.error('❌ ERRORE GENERALE:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione database chiusa');
    }
  }
}

// Esegui import
importEmployees();

