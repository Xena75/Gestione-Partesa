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

// GET - Ricerca/autocompletamento pezzi
export async function GET(request: NextRequest) {
  let connection: any = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || ''; // Query di ricerca
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoriesOnly = searchParams.get('categories_only') === 'true';
    
    connection = await pool.getConnection();
    
    // Se richiesto solo l'elenco delle categorie
    if (categoriesOnly) {
      const [rows] = await connection.execute(
        `SELECT DISTINCT categoria
         FROM parts_catalog
         WHERE categoria IS NOT NULL AND categoria != ''
         ORDER BY categoria ASC`
      );

      connection.release();

      const categories = (rows as any[])
        .map(row => row.categoria)
        .filter((cat, index, self) => self.indexOf(cat) === index); // Rimuovi duplicati

      return NextResponse.json({
        success: true,
        categories: categories
      });
    }
    
    let query = `
      SELECT 
        id,
        codice,
        descrizione,
        categoria,
        tipo,
        um
      FROM parts_catalog
      WHERE 1=1
    `;
    const params: any[] = [];
    
    // Se c'è una query di ricerca, cerca nella descrizione
    if (q.trim()) {
      query += ' AND descrizione LIKE ?';
      params.push(`%${q.trim()}%`);
    }
    
    query += ' ORDER BY descrizione ASC LIMIT ?';
    params.push(limit);
    
    const [rows] = await connection.execute(query, params);
    connection.release();
    
    return NextResponse.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    console.error('Errore nella ricerca pezzi:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nella ricerca pezzi' },
      { status: 500 }
    );
  }
}

// POST - Aggiungi nuovo pezzo all'anagrafica
export async function POST(request: NextRequest) {
  let connection: any = null;
  
  try {
    const body = await request.json();
    const { codice, descrizione, categoria, tipo, um } = body;
    
    // Validazione
    if (!descrizione || !descrizione.trim()) {
      return NextResponse.json(
        { success: false, error: 'Descrizione obbligatoria' },
        { status: 400 }
      );
    }
    
    if (!tipo || !['Ricambio', 'Servizio', 'Manodopera'].includes(tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo deve essere: Ricambio, Servizio o Manodopera' },
        { status: 400 }
      );
    }
    
    if (!um || !um.trim()) {
      return NextResponse.json(
        { success: false, error: 'Unità di misura obbligatoria' },
        { status: 400 }
      );
    }
    
    connection = await pool.getConnection();
    
    // Verifica se esiste già una descrizione uguale
    const [existing] = await connection.execute(
      'SELECT id FROM parts_catalog WHERE descrizione = ?',
      [descrizione.trim()]
    );
    
    if ((existing as any[]).length > 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Un pezzo con questa descrizione esiste già' },
        { status: 409 }
      );
    }
    
    // Inserisci nuovo pezzo
    const [result] = await connection.execute(
      `INSERT INTO parts_catalog (codice, descrizione, categoria, tipo, um)
       VALUES (?, ?, ?, ?, ?)`,
      [
        codice && codice.trim() ? codice.trim() : null,
        descrizione.trim(),
        categoria && categoria.trim() ? categoria.trim() : null,
        tipo,
        um.trim().toUpperCase()
      ]
    );
    
    const insertId = (result as any).insertId;
    
    // Recupera il pezzo appena inserito
    const [newPart] = await connection.execute(
      'SELECT * FROM parts_catalog WHERE id = ?',
      [insertId]
    );
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(newPart) ? newPart[0] : null,
      message: 'Pezzo aggiunto con successo'
    });
    
  } catch (error: any) {
    console.error('Errore nell\'inserimento pezzo:', error);
    if (connection) {
      connection.release();
    }
    
    // Gestione errore duplicato
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Un pezzo con questa descrizione esiste già' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Errore nell\'inserimento del pezzo' },
      { status: 500 }
    );
  }
}

