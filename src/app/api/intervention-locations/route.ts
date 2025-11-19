// API endpoint per gestire i luoghi di intervento
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET: Recupera tutti i luoghi di intervento distinti dalla tabella maintenance_quotes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Recupera i valori DISTINCT dal campo intervention_location di maintenance_quotes
    let query = `
      SELECT DISTINCT intervention_location as name 
      FROM maintenance_quotes 
      WHERE intervention_location IS NOT NULL 
      AND intervention_location != ''
    `;
    const params: any[] = [];

    if (search) {
      query += ' AND intervention_location LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY intervention_location ASC';

    const [rows] = await pool.execute(query, params);

    // Trasforma i risultati in formato compatibile con il modal
    const locations = (rows as any[]).map((row, index) => ({
      id: index + 1, // ID temporaneo per compatibilità
      name: row.name,
      description: null
    }));

    return NextResponse.json({
      success: true,
      locations
    });
  } catch (error: any) {
    console.error('Errore nel recupero dei luoghi:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei luoghi di intervento' },
      { status: 500 }
    );
  }
}

// POST: Non serve più inserire in una tabella separata
// Il nuovo valore verrà salvato direttamente nel campo intervention_location quando si salva il preventivo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Il nome del luogo è obbligatorio' },
        { status: 400 }
      );
    }

    // Restituisce semplicemente il nome, che verrà salvato quando si salva il preventivo
    return NextResponse.json({
      success: true,
      location: { 
        id: Date.now(), // ID temporaneo
        name: name.trim(), 
        description: null 
      },
      message: 'Il valore verrà salvato quando salvi il preventivo'
    });
  } catch (error: any) {
    console.error('Errore:', error);
    return NextResponse.json(
      { error: 'Errore' },
      { status: 500 }
    );
  }
}

