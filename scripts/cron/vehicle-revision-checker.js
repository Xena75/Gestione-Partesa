#!/usr/bin/env node

/**
 * =====================================================
 * CRON JOB SETTIMANALE - VERIFICA REVISIONI VEICOLI
 * Sistema Ibrido v2.22.0 - Gestione Partesa
 * =====================================================
 * 
 * Questo script verifica e corregge eventuali revisioni mancanti
 * per tutti i veicoli nel sistema. Viene eseguito settimanalmente
 * come backup del trigger automatico.
 * 
 * Funzionalità:
 * - Verifica tutti i veicoli senza revisioni future
 * - Calcola e inserisce revisioni mancanti
 * - Logga tutte le operazioni
 * - Invia report via console e log
 * 
 * Esecuzione: node scripts/cron/vehicle-revision-checker.js
 * =====================================================
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configurazione database
const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Configurazione logging
const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'vehicle-revision-cron.log');

/**
 * Funzione di logging
 */
async function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  // Log su console
  console.log(logMessage.trim());
  
  try {
    // Crea directory logs se non esiste
    await fs.mkdir(LOG_DIR, { recursive: true });
    
    // Scrivi nel file di log
    await fs.appendFile(LOG_FILE, logMessage);
  } catch (error) {
    console.error('Errore scrittura log:', error.message);
  }
}

/**
 * Inserisce log nel database
 */
async function logToDatabase(connection, operationType, vehicleId, scheduleType, message, additionalData = {}) {
  try {
    await connection.execute(
      `INSERT INTO automation_logs 
       (operation_type, vehicle_id, schedule_type, calculated_due_date, license_type, message, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        operationType,
        vehicleId,
        scheduleType,
        additionalData.calculatedDueDate || null,
        additionalData.licenseType || null,
        message
      ]
    );
  } catch (error) {
    await log(`Errore inserimento log database: ${error.message}`, 'ERROR');
  }
}

/**
 * Calcola la prossima data di revisione
 */
function calculateNextRevisionDate(licenseType, lastRevisionDate = null) {
  const baseDate = lastRevisionDate ? new Date(lastRevisionDate) : new Date();
  const yearsToAdd = licenseType === 'B' ? 2 : 1;
  
  const nextDate = new Date(baseDate);
  nextDate.setFullYear(nextDate.getFullYear() + yearsToAdd);
  
  return {
    date: nextDate.toISOString().split('T')[0],
    years: yearsToAdd
  };
}

/**
 * Verifica e corregge revisioni mancanti per un singolo veicolo
 */
async function checkAndFixVehicleRevisions(connection, vehicle) {
  const { id: vehicleId, tipo_patente: licenseType, targa } = vehicle;
  
  try {
    // Verifica se esiste già una revisione futura
    const [futureRevisions] = await connection.execute(
      `SELECT COUNT(*) as count FROM vehicle_schedules 
       WHERE vehicle_id = ? AND schedule_type = 'revisione' 
       AND status = 'pending' AND data_scadenza > CURDATE()`,
      [vehicleId]
    );
    
    if (futureRevisions[0].count > 0) {
      await log(`Veicolo ${targa} (${vehicleId}): revisione futura già presente`);
      return { status: 'already_exists', vehicleId, targa };
    }
    
    // Trova l'ultima revisione completata
    const [lastRevisions] = await connection.execute(
      `SELECT completed_date, data_scadenza FROM vehicle_schedules 
       WHERE vehicle_id = ? AND schedule_type = 'revisione' 
       AND status = 'completed' 
       ORDER BY completed_date DESC, data_scadenza DESC 
       LIMIT 1`,
      [vehicleId]
    );
    
    // Calcola la prossima data di revisione
    const lastRevisionDate = lastRevisions.length > 0 
      ? (lastRevisions[0].completed_date || lastRevisions[0].data_scadenza)
      : null;
    
    const nextRevision = calculateNextRevisionDate(licenseType, lastRevisionDate);
    
    // Inserisce la nuova revisione
    const [result] = await connection.execute(
      `INSERT INTO vehicle_schedules 
       (vehicle_id, schedule_type, data_scadenza, description, status, reminder_days, created_at, updated_at) 
       VALUES (?, 'revisione', ?, ?, 'pending', 30, NOW(), NOW())`,
      [
        vehicleId,
        nextRevision.date,
        `Revisione automatica cron - Patente ${licenseType} (${nextRevision.years} anni)`
      ]
    );
    
    const newScheduleId = result.insertId;
    
    // Log nel database
    await logToDatabase(connection, 'cron_check', vehicleId, 'revisione', 
      `Revisione inserita da cron job per ${nextRevision.date} (Patente ${licenseType})`, {
        calculatedDueDate: nextRevision.date,
        licenseType: licenseType
      });
    
    await log(`Veicolo ${targa} (${vehicleId}): inserita revisione per ${nextRevision.date} (Patente ${licenseType})`);
    
    return { 
      status: 'inserted', 
      vehicleId, 
      targa, 
      dueDate: nextRevision.date, 
      licenseType,
      scheduleId: newScheduleId
    };
    
  } catch (error) {
    await log(`Errore elaborazione veicolo ${targa} (${vehicleId}): ${error.message}`, 'ERROR');
    
    // Log errore nel database
    await logToDatabase(connection, 'error', vehicleId, 'revisione', 
      `Errore cron job: ${error.message}`);
    
    return { status: 'error', vehicleId, targa, error: error.message };
  }
}

/**
 * Funzione principale del cron job
 */
async function runRevisionChecker() {
  let connection;
  const startTime = new Date();
  
  await log('=== INIZIO VERIFICA REVISIONI VEICOLI ===');
  await log(`Avvio cron job alle ${startTime.toISOString()}`);
  
  try {
    // Connessione al database
    connection = await mysql.createConnection(dbConfig);
    await log('Connessione database stabilita');
    
    // Recupera tutti i veicoli attivi
    const [vehicles] = await connection.execute(
      `SELECT id, targa, tipo_patente FROM vehicles 
       WHERE active = 1 
       ORDER BY targa`
    );
    
    await log(`Trovati ${vehicles.length} veicoli da verificare`);
    
    if (vehicles.length === 0) {
      await log('Nessun veicolo trovato per la verifica', 'WARN');
      return;
    }
    
    // Statistiche
    const stats = {
      total: vehicles.length,
      alreadyExists: 0,
      inserted: 0,
      errors: 0,
      details: []
    };
    
    // Elabora ogni veicolo
    for (const vehicle of vehicles) {
      const result = await checkAndFixVehicleRevisions(connection, vehicle);
      stats.details.push(result);
      
      switch (result.status) {
        case 'already_exists':
          stats.alreadyExists++;
          break;
        case 'inserted':
          stats.inserted++;
          break;
        case 'error':
          stats.errors++;
          break;
      }
      
      // Pausa breve tra le elaborazioni
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Report finale
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    
    await log('=== REPORT FINALE ===');
    await log(`Veicoli totali: ${stats.total}`);
    await log(`Revisioni già presenti: ${stats.alreadyExists}`);
    await log(`Nuove revisioni inserite: ${stats.inserted}`);
    await log(`Errori: ${stats.errors}`);
    await log(`Durata elaborazione: ${duration} secondi`);
    
    // Log dettagliato degli inserimenti
    if (stats.inserted > 0) {
      await log('=== DETTAGLIO INSERIMENTI ===');
      stats.details
        .filter(d => d.status === 'inserted')
        .forEach(async (detail) => {
          await log(`${detail.targa}: ${detail.dueDate} (Patente ${detail.licenseType})`);
        });
    }
    
    // Log degli errori
    if (stats.errors > 0) {
      await log('=== DETTAGLIO ERRORI ===', 'ERROR');
      stats.details
        .filter(d => d.status === 'error')
        .forEach(async (detail) => {
          await log(`${detail.targa}: ${detail.error}`, 'ERROR');
        });
    }
    
    await log('=== FINE VERIFICA REVISIONI VEICOLI ===');
    
  } catch (error) {
    await log(`Errore critico nel cron job: ${error.message}`, 'ERROR');
    
    if (connection) {
      try {
        await logToDatabase(connection, 'error', 'SYSTEM', 'cron_job', 
          `Errore critico cron job: ${error.message}`);
      } catch (logError) {
        await log(`Errore logging database: ${logError.message}`, 'ERROR');
      }
    }
    
    throw error;
    
  } finally {
    if (connection) {
      await connection.end();
      await log('Connessione database chiusa');
    }
  }
}

// Esecuzione del cron job
if (require.main === module) {
  runRevisionChecker()
    .then(() => {
      console.log('Cron job completato con successo');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Errore nel cron job:', error.message);
      process.exit(1);
    });
}

module.exports = { runRevisionChecker };