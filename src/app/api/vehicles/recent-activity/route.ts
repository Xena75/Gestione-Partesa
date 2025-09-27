import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione usando cookies
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    // Connessione al database
    const connection = await mysql.createConnection({
      host: process.env.DB_VIAGGI_HOST || 'localhost',
      port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
      user: process.env.DB_VIAGGI_USER || 'root',
      password: process.env.DB_VIAGGI_PASS || '',
      database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
    });

    try {
      const recentActivity = [];

      // 1. Recupera le ultime scadenze completate
      const [completedSchedules] = await connection.execute(`
        SELECT
          vs.id,
          'schedule_completed' as type,
          CONCAT('Scadenza ', vs.schedule_type, ' completata per veicolo ', v.targa) as description,
          vs.updated_at as date,
          'completed' as status,
          v.targa as vehicle_plate
        FROM vehicle_schedules vs
        JOIN vehicles v ON CAST(vs.vehicle_id AS CHAR) = CAST(v.id AS CHAR)
        WHERE vs.status = 'completed' AND vs.updated_at IS NOT NULL
        ORDER BY vs.updated_at DESC
        LIMIT 5
      `);

      // 2. Recupera le attività di automazione
      const [automationLogs] = await connection.execute(`
        SELECT
          al.id,
          'automation' as type,
          al.message as description,
          al.created_at as date,
          CASE 
            WHEN al.operation_type = 'error' THEN 'overdue'
            ELSE 'completed'
          END as status,
          v.targa as vehicle_plate
        FROM automation_logs al
        JOIN vehicles v ON CAST(al.vehicle_id AS CHAR) = CAST(v.id AS CHAR)
        WHERE al.operation_type IN ('trigger_insert', 'cron_check')
        ORDER BY al.created_at DESC
        LIMIT 5
      `);

      // 3. Recupera le nuove scadenze create di recente
      const [newSchedules] = await connection.execute(`
        SELECT
          vs.id,
          'schedule_created' as type,
          CONCAT('Nuova scadenza ', vs.schedule_type, ' creata per veicolo ', v.targa) as description,
          vs.created_at as date,
          'in attesa' as status,
          v.targa as vehicle_plate
        FROM vehicle_schedules vs
        JOIN vehicles v ON CAST(vs.vehicle_id AS CHAR) = CAST(v.id AS CHAR)
        WHERE vs.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY vs.created_at DESC
        LIMIT 5
      `);

      // Combina tutte le attività
      recentActivity.push(...(completedSchedules as any[]));
      recentActivity.push(...(automationLogs as any[]));
      recentActivity.push(...(newSchedules as any[]));

      // Ordina per data decrescente e prendi le ultime 10
      const sortedActivity = recentActivity
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map((activity, index) => ({
          ...activity,
          id: `${activity.type}_${activity.id}_${index}`, // ID univoco
          date: new Date(activity.date).toISOString()
        }));

      return NextResponse.json(sortedActivity);

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero attività recenti veicoli:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}