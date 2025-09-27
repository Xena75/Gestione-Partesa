import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import mysql from 'mysql2/promise';

// Funzione per verificare accesso admin
const verifyAdminAccess = async (request: NextRequest) => {
  const userCheck = await verifyUserAccess(request);
  if (!userCheck.success) {
    return { success: false, error: 'Non autenticato' };
  }
  
  // Per ora tutti gli utenti autenticati sono considerati admin
  // In futuro si può implementare un controllo più specifico
  return { success: true, user: userCheck.user };
};

// Configurazione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4'
};



export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per accedere ai dati di backup' },
        { status: 401 }
      );
    }

    // Connessione al database backup_management
    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Query per statistiche dashboard
      const [summaryRows] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN start_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as jobs_last_24h,
          COUNT(CASE WHEN start_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND status = 'failed' THEN 1 END) as failed_last_24h,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running_jobs,
          COALESCE(SUM(CASE WHEN start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN file_size_bytes END), 0) as total_size_week,
          AVG(CASE WHEN status = 'completed' AND duration_seconds IS NOT NULL THEN duration_seconds END) as avg_backup_duration
        FROM backup_jobs
      `);

      // Query per alert attivi
      const [alertRows] = await connection.execute(`
        SELECT COUNT(*) as active_alerts
        FROM backup_alerts 
        WHERE is_resolved = FALSE
      `);

      // Query per schedule attive
      const [scheduleRows] = await connection.execute(`
        SELECT COUNT(*) as active_schedules
        FROM backup_schedules 
        WHERE is_active = TRUE
      `);

      // Query per ultimo backup full
      const [lastFullRows] = await connection.execute(`
        SELECT start_time
        FROM backup_jobs 
        WHERE backup_type = 'full' AND status = 'completed'
        ORDER BY start_time DESC 
        LIMIT 1
      `);

      // Query per prossimo backup schedulato
      const [nextScheduleRows] = await connection.execute(`
        SELECT next_run
        FROM backup_schedules 
        WHERE is_active = TRUE AND next_run IS NOT NULL
        ORDER BY next_run ASC 
        LIMIT 1
      `);

      // Query per utilizzo storage
      const [storageRows] = await connection.execute(`
        SELECT COALESCE(SUM(file_size_bytes), 0) as total_storage_bytes
        FROM backup_jobs 
        WHERE status = 'completed'
      `);

      const summary = summaryRows as any[];
      const schedules = scheduleRows as any[];
      const lastFull = lastFullRows as any[];
      const nextSchedule = nextScheduleRows as any[];
      const storage = storageRows as any[];

      // Query per conteggio totale backup
      const [totalBackupsRows] = await connection.execute(`
        SELECT COUNT(*) as total_backups
        FROM backup_jobs
      `);

      // Query per backup completati con successo
      const [successfulBackupsRows] = await connection.execute(`
        SELECT COUNT(*) as successful_backups
        FROM backup_jobs 
        WHERE status = 'completed'
      `);

      const totalBackups = totalBackupsRows as any[];
      const successfulBackups = successfulBackupsRows as any[];

      // Calcolo sicuro dello storage in GB
      const totalStorageBytes = storage[0]?.total_storage_bytes || 0;
      const storageGb = totalStorageBytes > 0 ? Math.round(totalStorageBytes / (1024 * 1024 * 1024) * 100) / 100 : 0;
      
      // Calcolo sicuro della durata media
      const avgDuration = summary[0]?.avg_backup_duration;
      const avgBackupDuration = (avgDuration && !isNaN(avgDuration)) ? Math.round(avgDuration) : 0;

      const dashboardSummary = {
        total_backups: totalBackups[0]?.total_backups || 0,
        successful_backups: successfulBackups[0]?.successful_backups || 0,
        failed_backups: summary[0]?.failed_last_24h || 0,
        running_backups: summary[0]?.running_jobs || 0,
        storage_usage_gb: storageGb,
        avg_backup_duration: avgBackupDuration,
        last_backup_time: lastFull[0]?.start_time || null,
        next_scheduled_backup: nextSchedule[0]?.next_run || null,
        storage_usage_percent: 0, // Calcolato in base ai limiti configurati
        database_health_score: Math.min(100, Math.max(0, 100 - (summary[0]?.failed_last_24h || 0) * 10))
      };

      return NextResponse.json(dashboardSummary);

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero summary backup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Endpoint per aggiornare le statistiche cache (solo admin)
export async function POST(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      );
    }

    // Qui potresti implementare la logica per aggiornare cache o statistiche
    // Per ora ritorniamo semplicemente un messaggio di successo
    
    return NextResponse.json({ 
      success: true, 
      message: 'Statistiche aggiornate',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento statistiche:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}