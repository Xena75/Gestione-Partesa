import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera tutte le scadenze o filtrate per veicolo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const upcoming = searchParams.get('upcoming'); // giorni per scadenze imminenti
    const quoteNumber = searchParams.get('quote_number'); // filtro per numero offerta

    const connection = await mysql.createConnection(dbConfig);

    let query = `
      SELECT 
        vs.*,
        v.targa,
        v.marca,
        v.modello
      FROM vehicle_schedules vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (vehicleId) {
      query += ' AND vs.vehicle_id = ?';
      params.push(vehicleId);
    }

    if (status) {
      query += ' AND vs.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND vs.schedule_type = ?';
      params.push(type);
    }

    if (quoteNumber) {
      query += ' AND vs.quote_number = ?';
      params.push(quoteNumber);
    }

    if (upcoming) {
      const days = parseInt(upcoming);
      query += ' AND vs.data_scadenza BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)';
      params.push(days);
    }

    query += ' ORDER BY vs.data_scadenza ASC';

    const [rows] = await connection.execute(query, params);
    await connection.end();

    // Mappa i risultati per includere l'oggetto vehicle
    const schedulesWithVehicles = (rows as any[]).map(row => ({
      id: row.id,
      vehicle_id: row.vehicle_id,
      schedule_type: row.schedule_type,
      description: row.description,
      data_scadenza: row.data_scadenza,
      completed_date: row.completed_date,
      booking_date: row.booking_date,
      status: row.status,
      priority: row.priority,
      cost_estimate: row.cost,
      provider: row.provider,
      notes: row.notes,
      quote_number: row.quote_number,
      quote_date: row.quote_date,
      vehicle: {
        targa: row.targa,
        marca: row.marca,
        modello: row.modello
      }
    }));

    return NextResponse.json({ success: true, schedules: schedulesWithVehicles });
  } catch (error) {
    console.error('Errore nel recupero scadenze:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero delle scadenze' },
      { status: 500 }
    );
  }
}

// POST - Crea una nuova scadenza
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vehicle_id,
      schedule_type,
      data_scadenza,
      description,
      cost,
      provider,
      reminder_days,
      notes,
      priority,
      booking_date,
      quote_number,
      quote_date
    } = body;

    // Validazione campi obbligatori
    if (!vehicle_id || !schedule_type || !data_scadenza) {
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    // Calcola automaticamente la priorità se non fornita
    let calculatedPriority = priority;
    if (!calculatedPriority) {
      const dueDate = new Date(data_scadenza);
      const today = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        calculatedPriority = 'high';
      } else if (daysDiff <= 90) {
        calculatedPriority = 'medium';
      } else {
        calculatedPriority = 'low';
      }
    }

    const connection = await mysql.createConnection(dbConfig);

    const query = `
      INSERT INTO vehicle_schedules (
        vehicle_id, schedule_type, data_scadenza, description, 
        cost, provider, reminder_days, notes, priority, booking_date,
        quote_number, quote_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(query, [
      vehicle_id,
      schedule_type,
      data_scadenza,
      description || null,
      cost || null,
      provider || null,
      reminder_days || 30,
      notes || null,
      calculatedPriority,
      booking_date || null,
      quote_number || null,
      quote_date || null
    ]);

    await connection.end();

    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId, ...body, priority: calculatedPriority }
    });
  } catch (error) {
    console.error('Errore nella creazione scadenza:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella creazione della scadenza' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna una scadenza esistente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      schedule_type,
      data_scadenza,
      completed_date,
      description,
      cost,
      provider,
      status,
      reminder_days,
      notes,
      priority,
      booking_date,
      quote_number,
      quote_date
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID scadenza richiesto' },
        { status: 400 }
      );
    }

    // Calcola automaticamente la priorità se non fornita e la data di scadenza è cambiata
    let calculatedPriority = priority;
    if (!calculatedPriority && data_scadenza) {
      const dueDate = new Date(data_scadenza);
      const today = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        calculatedPriority = 'high';
      } else if (daysDiff <= 90) {
        calculatedPriority = 'medium';
      } else {
        calculatedPriority = 'low';
      }
    }

    const connection = await mysql.createConnection(dbConfig);

    const query = `
      UPDATE vehicle_schedules SET
        schedule_type = ?,
        data_scadenza = ?,
        completed_date = ?,
        description = ?,
        cost = ?,
        provider = ?,
        status = ?,
        reminder_days = ?,
        notes = ?,
        priority = ?,
        booking_date = ?,
        quote_number = ?,
        quote_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await connection.execute(query, [
      schedule_type,
      data_scadenza,
      completed_date || null,
      description || null,
      cost || null,
      provider || null,
      status || 'pending',
      reminder_days || 30,
      notes || null,
      calculatedPriority || 'medium',
      booking_date || null,
      quote_number || null,
      quote_date || null,
      id
    ]);

    await connection.end();

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Errore nell\'aggiornamento scadenza:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento della scadenza' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina una scadenza
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID scadenza richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    await connection.execute('DELETE FROM vehicle_schedules WHERE id = ?', [id]);
    await connection.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione scadenza:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione della scadenza' },
      { status: 500 }
    );
  }
}