import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess, verifyAdminAccess } from '@/lib/auth';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

// Configurazione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4'
};

interface BackupAlert {
  id?: number;
  alert_type: 'error' | 'warning' | 'info' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: 'backup_job' | 'schedule' | 'system' | 'storage' | 'database';
  source_id?: number;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  metadata?: any;
}

// GET - Recupera tutti gli alert di backup
export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per accedere agli alert di backup' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity');
    const alertType = searchParams.get('alert_type');
    const source = searchParams.get('source');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const unresolvedOnly = searchParams.get('unresolved_only') === 'true';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Costruisci query con filtri
      let whereConditions = [];
      let queryParams = [];

      if (severity) {
        whereConditions.push('severity = ?');
        queryParams.push(severity);
      }

      if (alertType) {
        whereConditions.push('alert_type = ?');
        queryParams.push(alertType);
      }

      if (source) {
        whereConditions.push('source = ?');
        queryParams.push(source);
      }

      if (unreadOnly) {
        whereConditions.push('is_read = 0');
      }

      if (unresolvedOnly) {
        whereConditions.push('is_resolved = 0');
      }

      if (dateFrom) {
        whereConditions.push('created_at >= ?');
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('created_at <= ?');
        queryParams.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Query per conteggio totale
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM backup_alerts ${whereClause}`,
        queryParams
      );

      // Query per gli alert
      const [alertRows] = await connection.execute(`
        SELECT 
          id, alert_type, severity, title, message, source, source_id,
          is_read, is_resolved, resolved_by, resolved_at, resolution_notes,
          metadata, created_at, updated_at
        FROM backup_alerts 
        ${whereClause}
        ORDER BY 
          CASE severity 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          created_at DESC 
        LIMIT ? OFFSET ?
      `, [...queryParams, limit, offset]);

      const alerts = (alertRows as any[]).map(alert => ({
        ...alert,
        is_read: Boolean(alert.is_read),
        is_resolved: Boolean(alert.is_resolved),
        metadata: alert.metadata ? JSON.parse(alert.metadata) : null
      }));

      const total = (countRows as any[])[0]?.total || 0;

      // Statistiche aggiuntive
      const [statsRows] = await connection.execute(`
        SELECT 
          COUNT(*) as total_alerts,
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count,
          SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as unresolved_count,
          SUM(CASE WHEN severity = 'critical' AND is_resolved = 0 THEN 1 ELSE 0 END) as critical_unresolved,
          SUM(CASE WHEN severity = 'high' AND is_resolved = 0 THEN 1 ELSE 0 END) as high_unresolved
        FROM backup_alerts
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      const stats = (statsRows as any[])[0] || {
        total_alerts: 0,
        unread_count: 0,
        unresolved_count: 0,
        critical_unresolved: 0,
        high_unresolved: 0
      };

      return NextResponse.json({
        alerts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        stats
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero alert:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Crea nuovo alert
export async function POST(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: solo gli amministratori possono creare alert' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      alert_type,
      severity,
      title,
      message,
      source,
      source_id,
      metadata
    } = body;

    // Validazione input
    if (!alert_type || !['error', 'warning', 'info', 'success'].includes(alert_type)) {
      return NextResponse.json(
        { error: 'Tipo di alert non valido' },
        { status: 400 }
      );
    }

    if (!severity || !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return NextResponse.json(
        { error: 'Severità non valida' },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Titolo richiesto' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Messaggio richiesto' },
        { status: 400 }
      );
    }

    if (!source || !['backup_job', 'schedule', 'system', 'storage', 'database'].includes(source)) {
      return NextResponse.json(
        { error: 'Sorgente non valida' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Inserisci nuovo alert
      const [result] = await connection.execute(`
        INSERT INTO backup_alerts (
          alert_type, severity, title, message, source, source_id, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        alert_type,
        severity,
        title.trim(),
        message.trim(),
        source,
        source_id || null,
        metadata ? JSON.stringify(metadata) : null
      ]);

      const alertId = (result as any).insertId;

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('alert_created', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ 
          alert_id: alertId, 
          alert_type, 
          severity, 
          title, 
          source 
        })
      ]);

      // Se l'alert è critico, invia notifica immediata (implementare)
      if (severity === 'critical') {
        // TODO: Implementare notifica email/SMS
        console.log(`ALERT CRITICO: ${title} - ${message}`);
      }

      return NextResponse.json({
        success: true,
        alert: {
          id: alertId,
          alert_type,
          severity,
          title,
          message,
          source,
          source_id,
          is_read: false,
          is_resolved: false,
          metadata
        },
        message: 'Alert creato con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nella creazione alert:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna alert (marca come letto/risolto)
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
    const { id, action, resolution_notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID alert richiesto' },
        { status: 400 }
      );
    }

    if (!action || !['mark_read', 'mark_unread', 'resolve', 'unresolve'].includes(action)) {
      return NextResponse.json(
        { error: 'Azione non valida' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      // Verifica che l'alert esista
      const [alertRows] = await connection.execute(
        'SELECT id, title, is_read, is_resolved FROM backup_alerts WHERE id = ?',
        [id]
      );

      if ((alertRows as any[]).length === 0) {
        return NextResponse.json(
          { error: 'Alert non trovato' },
          { status: 404 }
        );
      }

      const alert = (alertRows as any[])[0];
      let updateQuery = '';
      let updateParams: any[] = [];

      switch (action) {
        case 'mark_read':
          updateQuery = 'UPDATE backup_alerts SET is_read = 1, updated_at = NOW() WHERE id = ?';
          updateParams = [id];
          break;

        case 'mark_unread':
          updateQuery = 'UPDATE backup_alerts SET is_read = 0, updated_at = NOW() WHERE id = ?';
          updateParams = [id];
          break;

        case 'resolve':
          if (action === 'resolve' && !resolution_notes) {
            return NextResponse.json(
              { error: 'Note di risoluzione richieste' },
              { status: 400 }
            );
          }
          updateQuery = `
            UPDATE backup_alerts 
            SET is_resolved = 1, resolved_by = ?, resolved_at = NOW(), 
                resolution_notes = ?, updated_at = NOW() 
            WHERE id = ?
          `;
          updateParams = [
            adminCheck.user?.username || 'system',
            resolution_notes,
            id
          ];
          break;

        case 'unresolve':
          updateQuery = `
            UPDATE backup_alerts 
            SET is_resolved = 0, resolved_by = NULL, resolved_at = NULL, 
                resolution_notes = NULL, updated_at = NOW() 
            WHERE id = ?
          `;
          updateParams = [id];
          break;
      }

      // Esegui aggiornamento
      await connection.execute(updateQuery, updateParams);

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('alert_updated', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ 
          alert_id: id, 
          action, 
          title: alert.title,
          resolution_notes 
        })
      ]);

      return NextResponse.json({
        success: true,
        message: `Alert ${action === 'mark_read' ? 'marcato come letto' : 
                          action === 'mark_unread' ? 'marcato come non letto' :
                          action === 'resolve' ? 'risolto' : 'riaperto'} con successo`
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'aggiornamento alert:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina alert
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
    const alertId = searchParams.get('id');
    const deleteResolved = searchParams.get('delete_resolved') === 'true';
    const olderThanDays = searchParams.get('older_than_days');

    const connection = await mysql.createConnection(backupDbConfig);

    try {
      let deleteQuery = '';
      let deleteParams = [];
      let deletedCount = 0;

      if (alertId) {
        // Elimina alert specifico
        const [alertRows] = await connection.execute(
          'SELECT title FROM backup_alerts WHERE id = ?',
          [alertId]
        );

        if ((alertRows as any[]).length === 0) {
          return NextResponse.json(
            { error: 'Alert non trovato' },
            { status: 404 }
          );
        }

        await connection.execute(
          'DELETE FROM backup_alerts WHERE id = ?',
          [alertId]
        );
        deletedCount = 1;

      } else if (deleteResolved) {
        // Elimina tutti gli alert risolti
        let whereClause = 'WHERE is_resolved = 1';
        deleteParams = [];

        if (olderThanDays) {
          whereClause += ' AND resolved_at <= DATE_SUB(NOW(), INTERVAL ? DAY)';
          deleteParams.push(parseInt(olderThanDays));
        }

        const [countResult] = await connection.execute(
          `SELECT COUNT(*) as count FROM backup_alerts ${whereClause}`,
          deleteParams
        );
        deletedCount = (countResult as any[])[0]?.count || 0;

        if (deletedCount > 0) {
          await connection.execute(
            `DELETE FROM backup_alerts ${whereClause}`,
            deleteParams
          );
        }

      } else {
        return NextResponse.json(
          { error: 'Parametri di eliminazione non validi' },
          { status: 400 }
        );
      }

      // Log attività
      await connection.execute(`
        INSERT INTO backup_activity_log (activity_type, user_id, details)
        VALUES ('alerts_deleted', ?, ?)
      `, [
        adminCheck.user?.username || 'system',
        JSON.stringify({ 
          deleted_count: deletedCount,
          alert_id: alertId,
          delete_resolved: deleteResolved,
          older_than_days: olderThanDays
        })
      ]);

      return NextResponse.json({
        success: true,
        deleted_count: deletedCount,
        message: `${deletedCount} alert eliminati con successo`
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione alert:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}