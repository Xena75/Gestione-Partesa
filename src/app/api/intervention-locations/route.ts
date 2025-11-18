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

// GET: Recupera tutti i luoghi di intervento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = 'SELECT id, name, description FROM intervention_locations';
    const params: any[] = [];

    if (search) {
      query += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const [locations] = await pool.execute(query, params);

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

// POST: Aggiungi un nuovo luogo di intervento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Il nome del luogo è obbligatorio' },
        { status: 400 }
      );
    }

    // Verifica se esiste già
    const [existing] = await pool.execute(
      'SELECT id FROM intervention_locations WHERE name = ?',
      [name.trim()]
    ) as [any[], any];

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({
        success: true,
        location: existing[0],
        message: 'Luogo già esistente'
      });
    }

    // Inserisci nuovo luogo
    const [result] = await pool.execute(
      'INSERT INTO intervention_locations (name, description) VALUES (?, ?)',
      [name.trim(), description || null]
    ) as [mysql.ResultSetHeader, any];

    const [newLocation] = await pool.execute(
      'SELECT id, name, description FROM intervention_locations WHERE id = ?',
      [result.insertId]
    ) as [any[], any];

    return NextResponse.json({
      success: true,
      location: Array.isArray(newLocation) ? newLocation[0] : newLocation,
      message: 'Luogo aggiunto con successo'
    });
  } catch (error: any) {
    console.error('Errore nell\'aggiunta del luogo:', error);
    
    // Gestisci errore di duplicato
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Questo luogo esiste già' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Errore nell\'aggiunta del luogo di intervento' },
      { status: 500 }
    );
  }
}

