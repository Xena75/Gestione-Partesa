import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess, verifyAdminAccess } from '@/lib/auth';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { backupDbConfig } from '@/lib/db-backup';



// GET - Recupera lista job di backup con filtri
export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per accedere ai job di backup' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const backupType = searchParams.get('backup_type');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const connection = await mysql.createConnection(backupDbConfig);

    // Se è richiesto un job specifico, restituisci solo quello
    if (jobId) {
      try {
        const [jobRows] = await connection.execute(`
          SELECT 
            id, job_uuid, backup_type, status, start_time, end_time,
            duration_seconds, file_size_bytes, database_list, backup_path, 
            triggered_by, triggered_by_user, error_message, retention_until,
            progress_percentage, created_at, updated_at
          FROM backup_jobs 
          WHERE id = ?
        `, [jobId]);

        if ((jobRows as any[]).length === 0) {
          return NextResponse.json(
            { error: 'Job non trovato' },
            { status: 404 }
          );
        }

        const job = (jobRows as any[])[0];
        let databases = [];
        try {
          const dbList = job.database_list || '[]';
          // Se è già un array JSON, parsalo
          if (dbList.startsWith('[')) {
            databases = JSON.parse(dbList);
          } else {
            // Se è una stringa semplice, convertila in array
            databases = [dbList];
          }
        } catch (parseError) {
          console.error(`Errore parsing JSON per job specifico ${job.id}:`, parseError);
          console.error(`database_list raw:`, job.database_list);
          databases = [];
        }
        
        const jobData = {
          ...job,
          total_size_bytes: job.file_size_bytes || 0,
          databases: databases
        };

        return NextResponse.json({
          jobs: [jobData]
        });

      } finally {
        await connection.end();
      }
    }

    try {
      // Costruisci query con filtri (solo se non è una richiesta per job specifico)
      let whereConditions = [];
      let queryParams = [];

      if (status) {
        whereConditions.push('status = ?');
        queryParams.push(status);
      }

      if (backupType) {
        whereConditions.push('backup_type = ?');
        queryParams.push(backupType);
      }

      if (dateFrom) {
        whereConditions.push('start_time >= ?');
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('start_time <= ?');
        queryParams.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Query per conteggio totale
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM backup_jobs ${whereClause}`,
        queryParams
      );

      // Query per i job
      const [jobRows] = await connection.execute(`
        SELECT 
          id, job_uuid, backup_type, status, start_time, end_time,
          duration_seconds, file_size_bytes, database_list, backup_path, 
          triggered_by, triggered_by_user, error_message, retention_until,
          progress_percentage, created_at, updated_at
        FROM backup_jobs 
        ${whereClause}
        ORDER BY start_time DESC 
        LIMIT ? OFFSET ?
      `, [...queryParams, limit, offset]);

      const jobs = (jobRows as any[]).map(job => {
        let databases = [];
        try {
          const dbList = job.database_list || '[]';
          // Se è già un array JSON, parsalo
          if (dbList.startsWith('[')) {
            databases = JSON.parse(dbList);
          } else {
            // Se è una stringa semplice, convertila in array
            databases = [dbList];
          }
        } catch (parseError) {
          console.error(`Errore parsing JSON per job ${job.id}:`, parseError);
          console.error(`database_list raw:`, job.database_list);
          databases = [];
        }
        
        return {
          ...job,
          total_size_bytes: job.file_size_bytes || 0,
          databases: databases
        };
      });

      const total = (countRows as any[])[0]?.total || 0;

      return NextResponse.json({
        jobs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero job backup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Avvia nuovo job di backup
export async function POST(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: solo gli amministratori possono avviare backup' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      backup_type,
      databases,
      triggered_by = 'manual'
    } = body;

    // Validazione input
    if (!backup_type || !['full', 'incremental', 'differential', 'manual'].includes(backup_type)) {
      return NextResponse.json(
        { error: 'Tipo di backup non valido' },
        { status: 400 }
      );
    }

    if (!databases || !Array.isArray(databases) || databases.length === 0) {
      return NextResponse.json(
        { error: 'Almeno un database deve essere specificato' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica se ci sono già job in esecuzione (limite concorrenza)
      const [runningJobs] = await connection.execute(
        'SELECT COUNT(*) as running_count FROM backup_jobs WHERE status = "running"'
      );

      const maxParallelJobs = 2; // Configurabile
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

      // Inserisci nuovo job
      const [result] = await connection.execute(`
        INSERT INTO backup_jobs (
          job_uuid, backup_type, status, start_time, database_list, 
          backup_path, triggered_by, triggered_by_user, retention_until
        ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `, [
        jobUuid,
        backup_type,
        startTime,
        JSON.stringify(databases),
        backupPath,
        triggered_by,
        adminCheck.user?.username || 'system',
        retentionUntil
      ]);

      const jobId = (result as any).insertId;

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (job_id, activity_type, user_id, details)
        VALUES (?, 'job_started', ?, ?)
      `, [
        jobId,
        adminCheck.user?.username || 'system',
        JSON.stringify({ backup_type, databases, triggered_by })
      ]);

      // Qui dovresti avviare il processo di backup effettivo
      // Per ora simuliamo l'avvio
      
      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          job_uuid: jobUuid,
          backup_type,
          status: 'pending',
          start_time: startTime.toISOString(),
          databases,
          backupPath,
          triggered_by,
          triggered_by_user: adminCheck.user?.username || 'system'
        },
        message: `Backup ${backup_type} avviato con successo`
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'avvio backup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Cancella job di backup (solo se pending o failed)
export async function DELETE(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json(
        { error: 'ID job richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica che il job esista e sia cancellabile
      const [jobRows] = await connection.execute(
        'SELECT id, status, backup_path FROM backup_jobs WHERE id = ?',
        [jobId]
      );

      if ((jobRows as any[]).length === 0) {
        return NextResponse.json(
          { error: 'Job non trovato' },
          { status: 404 }
        );
      }

      const job = (jobRows as any[])[0];
      if (!['pending', 'failed', 'cancelled'].includes(job.status)) {
        return NextResponse.json(
          { error: 'Impossibile cancellare job in esecuzione o completato' },
          { status: 400 }
        );
      }

      // Elimina file associati
      await connection.execute(
        'DELETE FROM backup_files WHERE job_id = ?',
        [jobId]
      );

      // Elimina job
      await connection.execute(
        'DELETE FROM backup_jobs WHERE id = ?',
        [jobId]
      );

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('job_deleted', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ job_id: jobId, backup_path: job.backup_path })
      ]);

      return NextResponse.json({
        success: true,
        message: 'Job eliminato con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione job:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}