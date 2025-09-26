/**
 * =====================================================
 * CONFIGURAZIONE CRON JOB - SISTEMA IBRIDO REVISIONI
 * Sistema Ibrido v2.22.0 - Gestione Partesa
 * =====================================================
 * 
 * Configurazione per l'esecuzione automatica del cron job
 * di verifica revisioni veicoli usando node-cron
 * =====================================================
 */

const cron = require('node-cron');
const { runRevisionChecker } = require('./vehicle-revision-checker');
const fs = require('fs').promises;
const path = require('path');

// Configurazione cron job
const CRON_CONFIG = {
  // Esecuzione ogni lunedì alle 02:00
  schedule: '0 2 * * 1',
  timezone: 'Europe/Rome',
  name: 'vehicle-revision-checker'
};

// Directory per i log
const LOG_DIR = path.join(__dirname, '../../logs');
const CRON_LOG_FILE = path.join(LOG_DIR, 'cron-scheduler.log');

/**
 * Funzione di logging per il scheduler
 */
async function logScheduler(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [CRON-SCHEDULER] [${level}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(CRON_LOG_FILE, logMessage);
  } catch (error) {
    console.error('Errore scrittura log scheduler:', error.message);
  }
}

/**
 * Avvia il cron job
 */
function startCronJob() {
  logScheduler(`Configurazione cron job: ${CRON_CONFIG.schedule} (${CRON_CONFIG.timezone})`);
  
  const task = cron.schedule(CRON_CONFIG.schedule, async () => {
    await logScheduler('=== AVVIO CRON JOB PROGRAMMATO ===');
    
    try {
      await runRevisionChecker();
      await logScheduler('Cron job completato con successo');
    } catch (error) {
      await logScheduler(`Errore nell'esecuzione del cron job: ${error.message}`, 'ERROR');
    }
    
    await logScheduler('=== FINE CRON JOB PROGRAMMATO ===');
  }, {
    scheduled: false,
    timezone: CRON_CONFIG.timezone
  });
  
  // Avvia il task
  task.start();
  
  logScheduler(`Cron job '${CRON_CONFIG.name}' avviato con successo`);
  logScheduler(`Prossima esecuzione: ${task.nextDate().toISOString()}`);
  
  return task;
}

/**
 * Esecuzione manuale del cron job
 */
async function runManual() {
  await logScheduler('=== ESECUZIONE MANUALE CRON JOB ===');
  
  try {
    await runRevisionChecker();
    await logScheduler('Esecuzione manuale completata con successo');
  } catch (error) {
    await logScheduler(`Errore nell'esecuzione manuale: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Mostra informazioni sul cron job
 */
function getInfo() {
  return {
    schedule: CRON_CONFIG.schedule,
    timezone: CRON_CONFIG.timezone,
    name: CRON_CONFIG.name,
    description: 'Verifica settimanale revisioni veicoli',
    logFile: CRON_LOG_FILE
  };
}

module.exports = {
  startCronJob,
  runManual,
  getInfo,
  CRON_CONFIG
};

// Se eseguito direttamente, avvia il cron job
if (require.main === module) {
  console.log('Avvio del sistema cron job per revisioni veicoli...');
  
  const task = startCronJob();
  
  // Gestione segnali per chiusura pulita
  process.on('SIGINT', () => {
    console.log('\nRicevuto SIGINT, arresto del cron job...');
    task.stop();
    logScheduler('Cron job arrestato manualmente');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nRicevuto SIGTERM, arresto del cron job...');
    task.stop();
    logScheduler('Cron job arrestato dal sistema');
    process.exit(0);
  });
  
  // Mantieni il processo attivo
  console.log('Cron job attivo. Premi Ctrl+C per arrestare.');
}