import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess, verifyAdminAccess } from '@/lib/auth';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
// import * as cronParser from 'cron-parser';

// Configurazione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4'
};

interface BackupSchedule {
  id?: number;
  schedule_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  cron_expression: string;
  databases: string[];
  is_active: boolean;
  retention_days: number;
  max_parallel_jobs: number;
  priority: 'low' | 'normal' | 'high';
  notification_emails?: string[];
  created_by: string;
  last_run?: string;
  next_run?: string;
}

// GET - Recupera tutti gli schedule di backup
export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per accedere alle schedule di backup' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';
    const includeStats = searchParams.get('include_stats') === 'true';

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      let whereClause = '';
      let queryParams: any[] = [];

      if (activeOnly) {
        whereClause = 'WHERE is_active = 1';
      }

      // Query principale per gli schedule
      const [scheduleRows] = await connection.execute(`
        SELECT 
          id, schedule_name, backup_type, cron_expression, database_list,
          is_active, retention_days, max_parallel_jobs, priority,
          notification_emails, created_by, last_run, next_run,
          created_at, updated_at
        FROM backup_schedules 
        ${whereClause}
        ORDER BY schedule_name
      `, queryParams);

      let schedules = (scheduleRows as any[]).map(schedule => ({
        ...schedule,
        databases: JSON.parse(schedule.database_list || '[]'),
        notification_emails: schedule.notification_emails 
          ? JSON.parse(schedule.notification_emails) 
          : [],
        is_active: Boolean(schedule.is_active)
      }));

      // Se richiesto, aggiungi statistiche per ogni schedule
      if (includeStats) {
        for (let schedule of schedules) {
          const [statsRows] = await connection.execute(`
            SELECT 
              COUNT(*) as total_runs,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
              AVG(CASE WHEN status = 'completed' THEN duration_seconds END) as avg_duration,
              MAX(start_time) as last_execution
            FROM backup_jobs 
            WHERE triggered_by = 'schedule' 
            AND JSON_CONTAINS(database_list, JSON_QUOTE(?))
            AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          `, [schedule.databases[0] || '']);

          schedule.stats = (statsRows as any[])[0] || {
            total_runs: 0,
            successful_runs: 0,
            failed_runs: 0,
            avg_duration: null,
            last_execution: null
          };
        }
      }

      return NextResponse.json({
        schedules,
        total: schedules.length
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero schedule:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Crea nuovo schedule di backup
export async function POST(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: solo gli amministratori possono creare schedule' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      schedule_name,
      backup_type,
      cron_expression,
      databases,
      is_active = true,
      retention_days = 30,
      max_parallel_jobs = 1,
      priority = 'normal',
      notification_emails = []
    } = body;

    // Validazione input
    if (!schedule_name || schedule_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome schedule richiesto' },
        { status: 400 }
      );
    }

    if (!backup_type || !['full', 'incremental', 'differential'].includes(backup_type)) {
      return NextResponse.json(
        { error: 'Tipo di backup non valido' },
        { status: 400 }
      );
    }

    if (!cron_expression || !isValidCronExpression(cron_expression)) {
      return NextResponse.json(
        { error: 'Espressione cron non valida' },
        { status: 400 }
      );
    }

    if (!databases || !Array.isArray(databases) || databases.length === 0) {
      return NextResponse.json(
        { error: 'Almeno un database deve essere specificato' },
        { status: 400 }
      );
    }

    if (retention_days < 1 || retention_days > 365) {
      return NextResponse.json(
        { error: 'Giorni di retention devono essere tra 1 e 365' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica che il nome schedule non esista già
      const [existingRows] = await connection.execute(
        'SELECT id FROM backup_schedules WHERE schedule_name = ?',
        [schedule_name.trim()]
      );

      if ((existingRows as any[]).length > 0) {
        return NextResponse.json(
          { error: 'Esiste già uno schedule con questo nome' },
          { status: 409 }
        );
      }

      // Calcola prossima esecuzione
      const nextRun = calculateNextRun(cron_expression);

      // Inserisci nuovo schedule
      const [result] = await connection.execute(`
        INSERT INTO backup_schedules (
          schedule_name, backup_type, cron_expression, database_list,
          is_active, retention_days, max_parallel_jobs, priority,
          notification_emails, created_by, next_run
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        schedule_name.trim(),
        backup_type,
        cron_expression,
        JSON.stringify(databases),
        is_active,
        retention_days,
        max_parallel_jobs,
        priority,
        JSON.stringify(notification_emails),
        adminCheck.user?.username || 'system',
        nextRun
      ]);

      const scheduleId = (result as any).insertId;

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('schedule_created', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ 
          schedule_id: scheduleId, 
          schedule_name, 
          backup_type, 
          databases 
        })
      ]);

      return NextResponse.json({
        success: true,
        schedule: {
          id: scheduleId,
          schedule_name,
          backup_type,
          cron_expression,
          databases,
          is_active,
          retention_days,
          max_parallel_jobs,
          priority,
          notification_emails,
          created_by: adminCheck.user?.username || 'system',
          next_run: nextRun
        },
        message: 'Schedule creato con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nella creazione schedule:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna schedule esistente
export async function PUT(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID schedule richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica che lo schedule esista
      const [existingRows] = await connection.execute(
        'SELECT * FROM backup_schedules WHERE id = ?',
        [id]
      );

      if ((existingRows as any[]).length === 0) {
        return NextResponse.json(
          { error: 'Schedule non trovato' },
          { status: 404 }
        );
      }

      const existingSchedule = (existingRows as any[])[0];
      
      // Prepara i campi da aggiornare
      const updateFields = [];
      const updateValues = [];

      if (updateData.schedule_name !== undefined) {
        updateFields.push('schedule_name = ?');
        updateValues.push(updateData.schedule_name.trim());
      }

      if (updateData.backup_type !== undefined) {
        if (!['full', 'incremental', 'differential'].includes(updateData.backup_type)) {
          return NextResponse.json(
            { error: 'Tipo di backup non valido' },
            { status: 400 }
          );
        }
        updateFields.push('backup_type = ?');
        updateValues.push(updateData.backup_type);
      }

      if (updateData.cron_expression !== undefined) {
        if (!isValidCronExpression(updateData.cron_expression)) {
          return NextResponse.json(
            { error: 'Espressione cron non valida' },
            { status: 400 }
          );
        }
        updateFields.push('cron_expression = ?');
        updateValues.push(updateData.cron_expression);
        
        // Ricalcola prossima esecuzione
        const nextRun = calculateNextRun(updateData.cron_expression);
        updateFields.push('next_run = ?');
        updateValues.push(nextRun);
      }

      if (updateData.databases !== undefined) {
        if (!Array.isArray(updateData.databases) || updateData.databases.length === 0) {
          return NextResponse.json(
            { error: 'Almeno un database deve essere specificato' },
            { status: 400 }
          );
        }
        updateFields.push('databases = ?');
        updateValues.push(JSON.stringify(updateData.databases));
      }

      if (updateData.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updateData.is_active);
      }

      if (updateData.retention_days !== undefined) {
        if (updateData.retention_days < 1 || updateData.retention_days > 365) {
          return NextResponse.json(
            { error: 'Giorni di retention devono essere tra 1 e 365' },
            { status: 400 }
          );
        }
        updateFields.push('retention_days = ?');
        updateValues.push(updateData.retention_days);
      }

      if (updateData.max_parallel_jobs !== undefined) {
        updateFields.push('max_parallel_jobs = ?');
        updateValues.push(updateData.max_parallel_jobs);
      }

      if (updateData.priority !== undefined) {
        if (!['low', 'normal', 'high'].includes(updateData.priority)) {
          return NextResponse.json(
            { error: 'Priorità non valida' },
            { status: 400 }
          );
        }
        updateFields.push('priority = ?');
        updateValues.push(updateData.priority);
      }

      if (updateData.notification_emails !== undefined) {
        updateFields.push('notification_emails = ?');
        updateValues.push(JSON.stringify(updateData.notification_emails));
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { error: 'Nessun campo da aggiornare' },
          { status: 400 }
        );
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      // Esegui aggiornamento
      await connection.execute(
        `UPDATE backup_schedules SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('schedule_updated', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ schedule_id: id, changes: updateData })
      ]);

      return NextResponse.json({
        success: true,
        message: 'Schedule aggiornato con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'aggiornamento schedule:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina schedule
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
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'ID schedule richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica che lo schedule esista
      const [scheduleRows] = await connection.execute(
        'SELECT schedule_name FROM backup_schedules WHERE id = ?',
        [scheduleId]
      );

      if ((scheduleRows as any[]).length === 0) {
        return NextResponse.json(
          { error: 'Schedule non trovato' },
          { status: 404 }
        );
      }

      const scheduleName = (scheduleRows as any[])[0].schedule_name;

      // Elimina schedule
      await connection.execute(
        'DELETE FROM backup_schedules WHERE id = ?',
        [scheduleId]
      );

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('schedule_deleted', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ schedule_id: scheduleId, schedule_name: scheduleName })
      ]);

      return NextResponse.json({
        success: true,
        message: 'Schedule eliminato con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione schedule:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Funzioni di utilità
function isValidCronExpression(cron: string): boolean {
  // Validazione base per espressione cron (5 campi)
  const cronRegex = /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([0-2]?\d|3[01])) (\*|([0]?\d|1[0-2])) (\*|([0-6]))$/;
  return cronRegex.test(cron.trim());
}

function calculateNextRun(cronExpression: string): string {
  try {
    // Implementazione semplificata per calcolare la prossima esecuzione
    // Per ora usa un fallback di 24 ore, in futuro si può implementare il parsing completo
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return nextRun.toISOString();
  } catch (error) {
    console.error('Errore nel calcolo della prossima esecuzione:', error);
    // Fallback: prossima esecuzione tra 24 ore
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return nextRun.toISOString();
  }
}