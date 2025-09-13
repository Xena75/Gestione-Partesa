import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Configurazione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4'
};

interface BackupRequest {
  backup_type: 'full' | 'incremental' | 'differential';
  databases: string[];
  notes?: string;
  priority?: 'low' | 'normal' | 'high';
}

// POST - Esegue backup utilizzando gli script .bat
export async function POST(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per eseguire backup' },
        { status: 401 }
      );
    }

    const body: BackupRequest = await request.json();
    const {
      backup_type,
      databases
    } = body;

    // Validazione input
    if (!backup_type || !['full', 'incremental', 'differential'].includes(backup_type)) {
      return NextResponse.json(
        { error: 'Tipo di backup non valido. Deve essere: full, incremental, differential' },
        { status: 400 }
      );
    }

    if (!databases || !Array.isArray(databases) || databases.length === 0) {
      return NextResponse.json(
        { error: 'Almeno un database deve essere specificato' },
        { status: 400 }
      );
    }

    // Verifica che i database specificati siano validi
    const validDatabases = ['viaggi_db', 'gestionelogistica'];
    const invalidDatabases = databases.filter(db => !validDatabases.includes(db));
    if (invalidDatabases.length > 0) {
      return NextResponse.json(
        { error: `Database non validi: ${invalidDatabases.join(', ')}. Database supportati: ${validDatabases.join(', ')}` },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica se ci sono già job in esecuzione (limite concorrenza)
      const [runningJobs] = await connection.execute(
        'SELECT COUNT(*) as running_count FROM backup_jobs WHERE status = "running"'
      );

      const maxParallelJobs = 2;
      if ((runningJobs as any[])[0]?.running_count >= maxParallelJobs) {
        return NextResponse.json(
          { error: 'Troppi job di backup in esecuzione. Riprova più tardi.' },
          { status: 429 }
        );
      }

      // Genera UUID per il job
      const jobUuid = uuidv4();
      const startTime = new Date();
      const backupPath = `backup-${backup_type}-${startTime.toISOString().split('T')[0]}-${jobUuid.substring(0, 8)}`;
      
      // Calcola retention date
      const retentionDays = backup_type === 'full' ? 90 : backup_type === 'differential' ? 60 : 30;
      const retentionUntil = new Date();
      retentionUntil.setDate(retentionUntil.getDate() + retentionDays);

      // Inserisci nuovo job nel database
      const [result] = await connection.execute(`
        INSERT INTO backup_jobs (
          job_uuid, backup_type, status, start_time, database_list, 
          backup_path, triggered_by, triggered_by_user, retention_until,
          progress_percentage
        ) VALUES (?, ?, 'running', ?, ?, ?, 'manual', ?, ?, 0)
      `, [
        jobUuid,
        backup_type,
        startTime,
        JSON.stringify(databases),
        backupPath,
        userCheck.user?.username || 'system',
        retentionUntil
      ]);

      const jobId = (result as any).insertId;

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (job_id, activity_type, user_id, details)
        VALUES (?, 'job_started', ?, ?)
      `, [
        jobId,
        userCheck.user?.username || 'system',
        JSON.stringify({ backup_type, databases })
      ]);

      // Determina quale script eseguire
      const scriptMap = {
        'full': 'backup-full.bat',
        'incremental': 'backup-incremental.bat',
        'differential': 'backup-differential.bat'
      };

      const scriptName = scriptMap[backup_type];
      const scriptPath = path.join(process.cwd(), 'backup-system', 'scripts', scriptName);

      // Verifica che lo script esista
      if (!fs.existsSync(scriptPath)) {
        // Aggiorna job come fallito
        await connection.execute(
          'UPDATE backup_jobs SET status = "failed", end_time = NOW(), error_message = ? WHERE id = ?',
          [`Script di backup non trovato: ${scriptPath}`, jobId]
        );

        return NextResponse.json(
          { error: `Script di backup non trovato: ${scriptName}` },
          { status: 500 }
        );
      }

      // Esegui il backup in modo asincrono
      executeBackupScript(scriptPath, jobId, jobUuid, backup_type, databases, connection);

      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          job_uuid: jobUuid,
          backup_type,
          status: 'running',
          start_time: startTime.toISOString(),
          databases,
          backup_path: backupPath,
          triggered_by: 'manual',
          triggered_by_user: userCheck.user?.username || 'system'
        },
        message: `Backup ${backup_type} avviato con successo. Controlla lo stato nella sezione Job.`
      });

    } finally {
      // Non chiudere la connessione qui perché viene usata nel processo asincrono
    }

  } catch (error) {
    console.error('Errore nell\'esecuzione backup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Funzione per eseguire lo script di backup in modo asincrono
async function executeBackupScript(
  scriptPath: string,
  jobId: number,
  jobUuid: string,
  backupType: string,
  databases: string[],
  connection: mysql.Connection
) {
  try {
    console.log(`Avvio script backup: ${scriptPath}`);
    
    // Aggiorna progress a 10%
    await connection.execute(
      'UPDATE backup_jobs SET progress_percentage = 10 WHERE id = ?',
      [jobId]
    );

    const backupProcess = spawn('cmd.exe', ['/c', scriptPath], {
      cwd: path.dirname(scriptPath),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
        MYSQL_PORT: process.env.MYSQL_PORT || '3306',
        MYSQL_USER: process.env.MYSQL_USER || 'root',
        MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',
        MYSQL_BIN: 'C:\\xampp\\mysql\\bin'
      }
    });

    let output = '';
    let errorOutput = '';

    backupProcess.stdout.on('data', async (data) => {
      output += data.toString();
      console.log(`Backup ${jobUuid} stdout:`, data.toString());
      
      // Aggiorna progress basato sull'output
      if (data.toString().includes('Backup database')) {
        await connection.execute(
          'UPDATE backup_jobs SET progress_percentage = 30 WHERE id = ?',
          [jobId]
        );
      } else if (data.toString().includes('Compressione')) {
        await connection.execute(
          'UPDATE backup_jobs SET progress_percentage = 60 WHERE id = ?',
          [jobId]
        );
      } else if (data.toString().includes('Registrazione')) {
        await connection.execute(
          'UPDATE backup_jobs SET progress_percentage = 80 WHERE id = ?',
          [jobId]
        );
      }
    });

    backupProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Backup ${jobUuid} stderr:`, data.toString());
    });

    backupProcess.on('close', async (code) => {
      const endTime = new Date();
      const startTimeResult = await connection.execute(
        'SELECT start_time FROM backup_jobs WHERE id = ?',
        [jobId]
      );
      
      const startTime = new Date((startTimeResult[0] as any[])[0].start_time);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      if (code === 0) {
        // Backup completato con successo
        console.log(`Backup ${jobUuid} completato con successo`);
        
        // Estrai informazioni dal log per aggiornare il database
        const sizeMatch = output.match(/Dimensione totale backup: (\d+) bytes/);
        const totalSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;

        await connection.execute(`
          UPDATE backup_jobs 
          SET status = 'completed', end_time = ?, duration_seconds = ?, 
              file_size_bytes = ?, progress_percentage = 100
          WHERE id = ?
        `, [endTime, durationSeconds, totalSize, jobId]);

        // Log completamento
        await connection.execute(`
          INSERT INTO backup_activity_log (job_id, activity_type, user_id, details)
          VALUES (?, 'job_completed', 'system', ?)
        `, [jobId, JSON.stringify({ duration_seconds: durationSeconds, file_size_bytes: totalSize })]);

      } else {
        // Backup fallito
        console.error(`Backup ${jobUuid} fallito con codice ${code}`);
        
        await connection.execute(`
          UPDATE backup_jobs 
          SET status = 'failed', end_time = ?, duration_seconds = ?, 
              error_message = ?, progress_percentage = 0
          WHERE id = ?
        `, [endTime, durationSeconds, errorOutput || `Processo terminato con codice ${code}`, jobId]);

        // Log errore
        await connection.execute(`
          INSERT INTO backup_activity_log (job_id, activity_type, user_id, details)
          VALUES (?, 'job_failed', 'system', ?)
        `, [jobId, JSON.stringify({ error_code: code, error_output: errorOutput })]);
      }

      // Chiudi connessione
      await connection.end();
    });

    backupProcess.on('error', async (error) => {
      console.error(`Errore nell'esecuzione backup ${jobUuid}:`, error);
      
      await connection.execute(`
        UPDATE backup_jobs 
        SET status = 'failed', end_time = NOW(), error_message = ?
        WHERE id = ?
      `, [error.message, jobId]);

      await connection.end();
    });

  } catch (error) {
    console.error(`Errore critico backup ${jobUuid}:`, error);
    
    try {
      await connection.execute(`
        UPDATE backup_jobs 
        SET status = 'failed', end_time = NOW(), error_message = ?
        WHERE id = ?
      `, [error instanceof Error ? error.message : 'Errore sconosciuto', jobId]);
      
      await connection.end();
    } catch (dbError) {
      console.error('Errore nell\'aggiornamento database:', dbError);
    }
  }
}