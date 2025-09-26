import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera notifiche o scadenze imminenti
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'notifications' o 'upcoming'
    const days = searchParams.get('days') || '30';
    const userId = searchParams.get('userId');

    const connection = await mysql.createConnection(dbConfig);

    if (type === 'upcoming') {
      // Recupera scadenze imminenti
      const query = `
        SELECT 
          vs.*,
          v.targa,
          v.marca,
          v.modello,
          DATEDIFF(vs.data_scadenza, CURDATE()) as days_remaining
        FROM vehicle_schedules vs
        JOIN vehicles v ON vs.vehicle_id = v.id
        WHERE vs.status = 'pending'
          AND vs.data_scadenza BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY vs.data_scadenza ASC
      `;
      
      const [rows] = await connection.execute(query, [parseInt(days)]);
      await connection.end();
      
      return NextResponse.json({ success: true, data: rows });
    } else {
      // Recupera storico notifiche
      let query = `
        SELECT 
          sn.*,
          vs.schedule_type,
          vs.data_scadenza,
          v.targa,
          v.marca,
          v.modello
        FROM schedule_notifications sn
        JOIN vehicle_schedules vs ON sn.schedule_id = vs.id
        JOIN vehicles v ON vs.vehicle_id = v.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (userId) {
        query += ' AND sn.user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY sn.created_at DESC LIMIT 100';

      const [rows] = await connection.execute(query, params);
      await connection.end();
      
      return NextResponse.json({ success: true, data: rows });
    }
  } catch (error) {
    console.error('Errore nel recupero notifiche:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero delle notifiche' },
      { status: 500 }
    );
  }
}

// POST - Crea/invia una notifica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      schedule_id,
      user_id,
      notification_type,
      send_immediately = false
    } = body;

    if (!schedule_id || !notification_type) {
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    // Verifica se la scadenza esiste
    const [scheduleRows] = await connection.execute(
      'SELECT * FROM vehicle_schedules WHERE id = ?',
      [schedule_id]
    );

    if ((scheduleRows as any[]).length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Scadenza non trovata' },
        { status: 404 }
      );
    }

    const schedule = (scheduleRows as any[])[0];

    // Crea la notifica
    const insertQuery = `
      INSERT INTO schedule_notifications (
        schedule_id, user_id, notification_type, status
      ) VALUES (?, ?, ?, ?)
    `;

    const status = send_immediately ? 'sent' : 'pending';
    const [result] = await connection.execute(insertQuery, [
      schedule_id,
      user_id || null,
      notification_type,
      status
    ]);

    if (send_immediately && notification_type === 'email') {
      // Qui si potrebbe integrare l'invio email reale
      // Per ora simuliamo l'invio
      await connection.execute(
        'UPDATE schedule_notifications SET sent_at = CURRENT_TIMESTAMP WHERE id = ?',
        [(result as any).insertId]
      );
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      data: {
        id: (result as any).insertId,
        schedule_id,
        notification_type,
        status,
        schedule_info: schedule
      }
    });
  } catch (error) {
    console.error('Errore nella creazione notifica:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella creazione della notifica' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna stato notifica
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, error_message } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'ID e status richiesti' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    const query = `
      UPDATE schedule_notifications SET
        status = ?,
        error_message = ?,
        sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END
      WHERE id = ?
    `;

    await connection.execute(query, [
      status,
      error_message || null,
      status,
      id
    ]);

    await connection.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'aggiornamento notifica:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento della notifica' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina una notifica
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID notifica richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    await connection.execute('DELETE FROM schedule_notifications WHERE id = ?', [id]);
    await connection.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione notifica:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione della notifica' },
      { status: 500 }
    );
  }
}