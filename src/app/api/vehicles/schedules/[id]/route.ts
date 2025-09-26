import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db',
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Funzione di retry per operazioni database
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : 'Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Attendi prima del prossimo tentativo
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

// GET - Recupera una singola scadenza per ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: mysql.Connection | null = null;
  let scheduleId: string | undefined;
  
  try {
    const { id } = await params;
    scheduleId = id;
    
    console.log(`[GET /api/vehicles/schedules/${id}] Request started at ${new Date().toISOString()}`);

    if (!id) {
      console.error('[GET /api/vehicles/schedules] Missing ID parameter');
      return NextResponse.json(
        { success: false, error: 'ID scadenza richiesto' },
        { status: 400 }
      );
    }

    // Esegui l'operazione database con retry
    const result = await withRetry(async () => {
      console.log(`[GET /api/vehicles/schedules/${id}] Creating database connection...`);
      connection = await mysql.createConnection(dbConfig);
      console.log(`[GET /api/vehicles/schedules/${id}] Database connection established`);

      // Query per recuperare la scadenza con i dettagli del veicolo
      const query = `
        SELECT 
          vs.*,
          v.targa,
          v.marca,
          v.modello
        FROM vehicle_schedules vs
        LEFT JOIN vehicles v ON vs.vehicle_id = v.id
        WHERE vs.id = ?
      `;
      
      console.log(`[GET /api/vehicles/schedules/${id}] Executing query:`, query);
      console.log(`[GET /api/vehicles/schedules/${id}] Query parameters:`, [id]);
      
      const [rows] = await connection.execute(query, [id]);
      console.log(`[GET /api/vehicles/schedules/${id}] Query executed successfully, rows found:`, (rows as any[]).length);

      await connection.end();
      connection = null;
      console.log(`[GET /api/vehicles/schedules/${id}] Database connection closed`);
      
      return rows;
    }, 3, 500);
    
    const rows = result;

    if ((rows as any[]).length === 0) {
      console.log(`[GET /api/vehicles/schedules/${id}] No schedule found with ID ${id}`);
      return NextResponse.json(
        { success: false, error: 'Scadenza non trovata' },
        { status: 404 }
      );
    }

    const schedule = (rows as any[])[0];
    console.log(`[GET /api/vehicles/schedules/${id}] Schedule found:`, {
      id: schedule.id,
      vehicle_id: schedule.vehicle_id,
      schedule_type: schedule.schedule_type,
      targa: schedule.targa
    });

    console.log(`[GET /api/vehicles/schedules/${id}] Request completed successfully at ${new Date().toISOString()}`);
    return NextResponse.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error(`[GET /api/vehicles/schedules/${scheduleId || 'unknown'}] ERROR occurred at ${new Date().toISOString()}:`);
    console.error(`[GET /api/vehicles/schedules/${scheduleId || 'unknown'}] Error type:`, error?.constructor?.name);
    console.error(`[GET /api/vehicles/schedules/${scheduleId || 'unknown'}] Error message:`, error instanceof Error ? error.message : 'Unknown error');
    console.error(`[GET /api/vehicles/schedules/${scheduleId || 'unknown'}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
    
    // Assicurati che la connessione sia chiusa in caso di errore
    if (connection) {
      try {
        await connection.end();
        console.log(`[GET /api/vehicles/schedules/${scheduleId || 'unknown'}] Database connection closed after error`);
      } catch (closeError) {
        console.error(`[GET /api/vehicles/schedules/${scheduleId || 'unknown'}] Error closing database connection:`, closeError);
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore interno del server', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        scheduleId: scheduleId || 'unknown'
      },
      { status: 500 }
    );
  }
}

// Funzione per convertire data dal formato italiano (gg/mm/aaaa) o ISO (YYYY-MM-DD) al formato database (YYYY-MM-DD)
function convertItalianDateToDatabase(dateInput: string): string | null {
  if (!dateInput || dateInput.trim() === '') {
    return null;
  }
  
  // Verifica se è già nel formato ISO (YYYY-MM-DD)
  const isoRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const isoMatch = dateInput.match(isoRegex);
  
  if (isoMatch) {
    // È già nel formato corretto, verifica solo la validità
    const [, year, month, day] = isoMatch;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      throw new Error(`Data non valida: ${dateInput}`);
    }
    
    // Formatta con zero padding
    const formattedDay = day.padStart(2, '0');
    const formattedMonth = month.padStart(2, '0');
    
    return `${year}-${formattedMonth}-${formattedDay}`;
  }
  
  // Verifica formato italiano gg/mm/aaaa
  const italianRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const italianMatch = dateInput.match(italianRegex);
  
  if (italianMatch) {
    const [, day, month, year] = italianMatch;
    
    // Verifica validità della data
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      throw new Error(`Data non valida: ${dateInput}`);
    }
    
    // Converti al formato YYYY-MM-DD
    const formattedDay = day.padStart(2, '0');
    const formattedMonth = month.padStart(2, '0');
    
    return `${year}-${formattedMonth}-${formattedDay}`;
  }
  
  // Nessun formato riconosciuto
  throw new Error(`Formato data non valido: ${dateInput}. Utilizzare gg/mm/aaaa o YYYY-MM-DD`);
}

// PUT - Aggiorna una scadenza specifica
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Converti le date dal formato italiano al formato database
    const convertedDueDate = body.data_scadenza ? convertItalianDateToDatabase(body.data_scadenza) : null;
    const convertedCompletedDate = body.completed_date ? convertItalianDateToDatabase(body.completed_date) : null;

    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      `UPDATE vehicle_schedules 
       SET schedule_type = ?, data_scadenza = ?, completed_date = ?, description = ?, 
           cost = ?, provider = ?, status = ?, reminder_days = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [body.schedule_type || null, convertedDueDate, convertedCompletedDate, 
       body.description || null, body.cost || null, body.provider || null, body.status || null, 
       body.reminder_days || null, body.notes || null, id]
    );

    await connection.end();
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Errore nell\'aggiornamento della scadenza:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina una scadenza specifica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    console.error('Errore nell\'eliminazione della scadenza:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}