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
 * - Calcola e inserisce revisioni mancanti (normali e tachigrafo)
 * - Gestisce revisioni normali (1-2 anni in base alla patente)
 * - Gestisce revisioni tachigrafo (ogni 2 anni, esclusi patente B)
 * - Logga tutte le operazioni con distinzione per tipo
 * - Invia report dettagliato via console e log
 * 
 * Tipi di revisione supportati:
 * - 'revisione': Revisioni normali veicoli (basate su data_ultima_revisione)
 * - 'revisione tachigrafo': Revisioni tachigrafo (basate su data_revisione_tachigrafo)
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
  password: process.env.DB_VIAGGI_PASS || '',
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
 * Calcola la prossima data di revisione basandosi su data_ultima_revisione
 */
function calculateNextRevisionDate(licenseType, dataUltimaRevisione) {
  if (!dataUltimaRevisione) {
    throw new Error('data_ultima_revisione è obbligatoria per il calcolo della prossima revisione');
  }
  
  const baseDate = new Date(dataUltimaRevisione);
  const yearsToAdd = licenseType === 'B' ? 2 : 1;
  
  const nextDate = new Date(baseDate);
  nextDate.setFullYear(nextDate.getFullYear() + yearsToAdd);
  
  return {
    date: nextDate.toISOString().split('T')[0],
    years: yearsToAdd
  };
}

/**
 * Calcola la prossima data di revisione tachigrafo basandosi su data_revisione_tachigrafo
 */
function calculateNextTachographRevisionDate(dataRevisioneTachigrafo) {
  if (!dataRevisioneTachigrafo) {
    throw new Error('data_revisione_tachigrafo è obbligatoria per il calcolo della prossima revisione tachigrafo');
  }
  
  const baseDate = new Date(dataRevisioneTachigrafo);
  const yearsToAdd = 2; // Revisione tachigrafo ogni 2 anni
  
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
  const { id: vehicleId, tipo_patente: licenseType, targa, data_ultima_revisione } = vehicle;
  
  try {
    // Verifica se esiste già una revisione pending
    const [existingRevisions] = await connection.execute(
      `SELECT COUNT(*) as count FROM vehicle_schedules 
       WHERE vehicle_id = ? AND schedule_type = 'revisione' 
       AND status = 'pending'`,
      [vehicleId]
    );
    
    if (existingRevisions[0].count > 0) {
      await log(`Veicolo ${targa} (${vehicleId}): revisione pending già presente`);
      return { status: 'already_exists', vehicleId, targa };
    }
    
    // Usa data_ultima_revisione dalla tabella vehicles come base di calcolo
    const nextRevision = calculateNextRevisionDate(licenseType, data_ultima_revisione);
    
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
 * Verifica e corregge revisioni tachigrafo mancanti per un singolo veicolo
 */
async function checkAndFixVehicleTachographRevisions(connection, vehicle) {
  const { id: vehicleId, tipo_patente: licenseType, targa, data_revisione_tachigrafo } = vehicle;
  
  try {
    // Esclude veicoli con patente B (non hanno tachigrafo)
    if (licenseType === 'B') {
      await log(`Veicolo ${targa} (${vehicleId}): escluso da revisione tachigrafo (Patente B)`);
      return { status: 'excluded', vehicleId, targa, reason: 'patente_b' };
    }
    
    // Verifica se esiste già una revisione tachigrafo per questo veicolo
    const [existingRevisions] = await connection.execute(
      `SELECT COUNT(*) as count FROM vehicle_schedules 
       WHERE vehicle_id = ? AND schedule_type = 'revisione tachigrafo'`,
      [vehicleId]
    );
    
    if (existingRevisions[0].count > 0) {
      await log(`Veicolo ${targa} (${vehicleId}): revisione tachigrafo già presente`);
      return { status: 'already_exists', vehicleId, targa };
    }
    
    // Usa data_revisione_tachigrafo direttamente come data di scadenza
    const dueDate = new Date(data_revisione_tachigrafo).toISOString().split('T')[0];
    
    // Inserisce la nuova revisione tachigrafo
    const [result] = await connection.execute(
      `INSERT INTO vehicle_schedules 
       (vehicle_id, schedule_type, data_scadenza, description, status, reminder_days, created_at, updated_at) 
       VALUES (?, 'revisione tachigrafo', ?, ?, 'pending', 30, NOW(), NOW())`,
      [
        vehicleId,
        dueDate,
        `Revisione tachigrafo - scadenza registrata`
      ]
    );
    
    const newScheduleId = result.insertId;
    
    // Log nel database
    await logToDatabase(connection, 'cron_check', vehicleId, 'revisione tachigrafo', 
      `Revisione tachigrafo inserita da cron job per ${dueDate}`, {
        dueDate: dueDate,
        licenseType: licenseType
      });
    
    await log(`Veicolo ${targa} (${vehicleId}): inserita revisione tachigrafo per ${dueDate}`);
    
    return { 
      status: 'inserted', 
      vehicleId, 
      targa, 
      dueDate: dueDate, 
      licenseType,
      scheduleId: newScheduleId
    };
    
  } catch (error) {
    await log(`Errore elaborazione revisione tachigrafo veicolo ${targa} (${vehicleId}): ${error.message}`, 'ERROR');
    
    // Log errore nel database
    await logToDatabase(connection, 'error', vehicleId, 'revisione tachigrafo', 
      `Errore cron job tachigrafo: ${error.message}`);
    
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
    
    // Recupera tutti i veicoli attivi con data_ultima_revisione NOT NULL
    const [vehicles] = await connection.execute(
      `SELECT id, targa, tipo_patente, data_ultima_revisione FROM vehicles 
       WHERE active = 1 AND data_ultima_revisione IS NOT NULL
       ORDER BY targa`
    );
    
    // Recupera tutti i veicoli attivi per tachigrafo (esclusi patente B)
    const [tachographVehicles] = await connection.execute(
      `SELECT id, targa, tipo_patente, data_revisione_tachigrafo FROM vehicles 
       WHERE active = 1 AND data_revisione_tachigrafo IS NOT NULL AND tipo_patente != 'B'
       ORDER BY targa`
    );
    
    // Conta i veicoli esclusi (con data_ultima_revisione NULL)
    const [excludedVehicles] = await connection.execute(
      `SELECT COUNT(*) as count FROM vehicles 
       WHERE active = 1 AND data_ultima_revisione IS NULL`
    );
    
    // Conta i veicoli esclusi dal tachigrafo
    const [excludedTachographVehicles] = await connection.execute(
      `SELECT COUNT(*) as count FROM vehicles 
       WHERE active = 1 AND (data_revisione_tachigrafo IS NULL OR tipo_patente = 'B')`
    );
    
    await log(`Trovati ${vehicles.length} veicoli da verificare per revisioni (con data_ultima_revisione valida)`);
    await log(`Trovati ${tachographVehicles.length} veicoli da verificare per tachigrafo (esclusi patente B)`);
    
    if (excludedVehicles[0].count > 0) {
      await log(`Esclusi ${excludedVehicles[0].count} veicoli con data_ultima_revisione NULL`);
      
      // Log nel database per veicoli esclusi
      await logToDatabase(connection, 'cron_excluded', 'SYSTEM', 'revisione', 
        `${excludedVehicles[0].count} veicoli esclusi dal controllo automatico (data_ultima_revisione NULL)`);
    }
    
    if (excludedTachographVehicles[0].count > 0) {
      await log(`Esclusi ${excludedTachographVehicles[0].count} veicoli dal controllo tachigrafo (data_revisione_tachigrafo NULL o patente B)`);
      
      // Log nel database per veicoli esclusi tachigrafo
      await logToDatabase(connection, 'cron_excluded', 'SYSTEM', 'revisione tachigrafo', 
        `${excludedTachographVehicles[0].count} veicoli esclusi dal controllo automatico tachigrafo`);
    }
    
    if (vehicles.length === 0 && tachographVehicles.length === 0) {
      await log('Nessun veicolo trovato per la verifica', 'WARN');
      return;
    }
    
    // Statistiche per revisioni normali
    const stats = {
      total: vehicles.length,
      alreadyExists: 0,
      inserted: 0,
      errors: 0,
      details: []
    };
    
    // Statistiche per revisioni tachigrafo
    const tachographStats = {
      total: tachographVehicles.length,
      alreadyExists: 0,
      inserted: 0,
      errors: 0,
      excluded: 0,
      details: []
    };
    
    // Elabora ogni veicolo per revisioni normali
    await log('=== ELABORAZIONE REVISIONI NORMALI ===');
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
    
    // Elabora ogni veicolo per revisioni tachigrafo
    await log('=== ELABORAZIONE REVISIONI TACHIGRAFO ===');
    for (const vehicle of tachographVehicles) {
      const result = await checkAndFixVehicleTachographRevisions(connection, vehicle);
      tachographStats.details.push(result);
      
      switch (result.status) {
        case 'already_exists':
          tachographStats.alreadyExists++;
          break;
        case 'inserted':
          tachographStats.inserted++;
          break;
        case 'error':
          tachographStats.errors++;
          break;
        case 'excluded':
          tachographStats.excluded++;
          break;
      }
      
      // Pausa breve tra le elaborazioni
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Report finale
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    
    await log('=== REPORT FINALE ===');
    await log('--- REVISIONI NORMALI ---');
    await log(`Veicoli totali: ${stats.total}`);
    await log(`Revisioni già presenti: ${stats.alreadyExists}`);
    await log(`Nuove revisioni inserite: ${stats.inserted}`);
    await log(`Errori: ${stats.errors}`);
    
    await log('--- REVISIONI TACHIGRAFO ---');
    await log(`Veicoli totali: ${tachographStats.total}`);
    await log(`Revisioni tachigrafo già presenti: ${tachographStats.alreadyExists}`);
    await log(`Nuove revisioni tachigrafo inserite: ${tachographStats.inserted}`);
    await log(`Veicoli esclusi (patente B): ${tachographStats.excluded}`);
    await log(`Errori tachigrafo: ${tachographStats.errors}`);
    
    await log('--- TOTALI GENERALI ---');
    await log(`Durata elaborazione: ${duration} secondi`);
    await log(`Totale inserimenti: ${stats.inserted + tachographStats.inserted}`);
    await log(`Totale errori: ${stats.errors + tachographStats.errors}`);
    
    // Log dettagliato degli inserimenti revisioni normali
    if (stats.inserted > 0) {
      await log('=== DETTAGLIO INSERIMENTI REVISIONI NORMALI ===');
      stats.details
        .filter(d => d.status === 'inserted')
        .forEach(async (detail) => {
          await log(`${detail.targa}: ${detail.dueDate} (Patente ${detail.licenseType})`);
        });
    }
    
    // Log dettagliato degli inserimenti revisioni tachigrafo
    if (tachographStats.inserted > 0) {
      await log('=== DETTAGLIO INSERIMENTI REVISIONI TACHIGRAFO ===');
      tachographStats.details
        .filter(d => d.status === 'inserted')
        .forEach(async (detail) => {
          await log(`${detail.targa}: ${detail.dueDate} (Tachigrafo)`);
        });
    }
    
    // Log degli errori revisioni normali
    if (stats.errors > 0) {
      await log('=== DETTAGLIO ERRORI REVISIONI NORMALI ===', 'ERROR');
      stats.details
        .filter(d => d.status === 'error')
        .forEach(async (detail) => {
          await log(`${detail.targa}: ${detail.error}`, 'ERROR');
        });
    }
    
    // Log degli errori revisioni tachigrafo
    if (tachographStats.errors > 0) {
      await log('=== DETTAGLIO ERRORI REVISIONI TACHIGRAFO ===', 'ERROR');
      tachographStats.details
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