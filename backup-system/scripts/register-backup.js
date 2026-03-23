const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function stripQuotes(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function getBackupManagementConfig() {
  const host =
    stripQuotes(
      process.env.DB_GESTIONE_HOST || process.env.DB_VIAGGI_HOST || process.env.MYSQL_HOST
    ) || 'localhost';
  const portStr =
    stripQuotes(
      process.env.DB_GESTIONE_PORT || process.env.DB_VIAGGI_PORT || process.env.MYSQL_PORT
    ) || '3306';
  const port = parseInt(portStr, 10);
  const user =
    stripQuotes(
      process.env.DB_GESTIONE_USER || process.env.DB_VIAGGI_USER || process.env.MYSQL_USER
    ) || 'root';
  const password = stripQuotes(
    process.env.DB_GESTIONE_PASS ||
      process.env.DB_VIAGGI_PASS ||
      process.env.MYSQL_PASSWORD
  );
  const sslExplicit =
    process.env.BACKUP_MYSQL_SSL === '1' || process.env.BACKUP_MYSQL_SSL === 'true';
  const sslByPort = portStr === '25060';
  const ssl = sslExplicit || sslByPort ? { rejectUnauthorized: true } : undefined;
  return {
    host,
    port,
    user,
    password,
    database: 'backup_management',
    charset: 'utf8mb4',
    ...(ssl ? { ssl } : {})
  };
}

// Funzione per calcolare MD5 checksum
function calculateMD5(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    console.error(`Errore calcolo MD5 per ${filePath}:`, error.message);
    return '';
  }
}

// Funzione principale per registrare backup
async function registerBackup() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Uso: node register-backup.js <backup_type> <file_path1> [file_path2] ...');
    console.error('Esempio: node register-backup.js full C:\\path\\to\\viaggi_db_backup.sql C:\\path\\to\\gestionelogistica_backup.sql');
    process.exit(1);
  }

  const backupType = args[0];
  const filePaths = args.slice(1);

  let connection;
  try {
    // Connessione al database
    connection = await mysql.createConnection(backupDbConfig);
    console.log('Connesso al database backup_management');

    let totalFiles = 0;
    let totalSizeAll = 0;

    // Registra ogni file di backup creando job separati per database
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        console.warn(`File non trovato: ${filePath}`);
        continue;
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const fileName = path.basename(filePath);
      const checksum = calculateMD5(filePath);

      const dbViaggi = stripQuotes(process.env.DB_VIAGGI_NAME) || 'viaggi_db';
      const dbGestione = stripQuotes(process.env.DB_GESTIONE_NAME) || 'gestionelogistica';
      let databaseName = 'unknown';
      if (fileName.includes(dbViaggi)) {
        databaseName = dbViaggi;
      } else if (fileName.includes(dbGestione)) {
        databaseName = dbGestione;
      }

      // Crea job backup per questo database
      const jobUuid = require('crypto').randomUUID();
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() + 30); // 30 giorni di retention
      
      // Calcola i tempi di backup basandosi sui metadati del file
      const fileCreationTime = stats.birthtime;
      const fileModificationTime = stats.mtime;
      
      // Usa il tempo di creazione come start_time e modifica come end_time
      // Se sono uguali, aggiungi qualche secondo per simulare la durata
      let startTime = fileCreationTime;
      let endTime = fileModificationTime;
      
      if (startTime.getTime() === endTime.getTime()) {
        // Se i tempi sono uguali, stima una durata basata sulla dimensione del file
        const estimatedDurationMs = Math.max(1000, Math.min(fileSize / 1000000, 60000)); // 1s-60s
        endTime = new Date(startTime.getTime() + estimatedDurationMs);
      }
      
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      const [jobResult] = await connection.execute(
        `INSERT INTO backup_jobs (job_uuid, backup_type, status, start_time, end_time, duration_seconds, database_list, backup_path, file_size_bytes, triggered_by, triggered_by_user, retention_until) 
         VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, 'manual', 'batch_script', ?)`,
        [jobUuid, backupType, startTime.toISOString().slice(0, 19).replace('T', ' '), endTime.toISOString().slice(0, 19).replace('T', ' '), durationSeconds, databaseName, filePath, fileSize, retentionDate.toISOString().slice(0, 19).replace('T', ' ')]
      );
      
      const jobId = jobResult.insertId;
      console.log(`Job backup creato per ${databaseName} con ID: ${jobId}`);

      // Inserisci record file backup
      await connection.execute(
        `INSERT INTO backup_files (job_id, file_path, file_name, file_size_bytes, checksum, compression_type) 
         VALUES (?, ?, ?, ?, ?, 'none')`,
        [jobId, filePath, fileName, fileSize, checksum]
      );

      // Log registrazione completata
      console.log(`File registrato: ${fileName} (${fileSize} bytes)`);

      totalFiles++;
      totalSizeAll += fileSize;
      
      console.log(`Registrato: ${fileName} per ${databaseName} (${fileSize} bytes)`);
    }

    console.log(`\nBackup registrato con successo!`);
    console.log(`Tipo: ${backupType}`);
    console.log(`File totali: ${totalFiles}`);
    console.log(`Dimensione totale: ${totalSizeAll} bytes`);
    
  } catch (error) {
    console.error('Errore durante la registrazione del backup:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Esegui la funzione principale
registerBackup().catch(console.error);