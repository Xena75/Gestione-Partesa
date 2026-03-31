import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

/** mysql2 su alcuni server restituisce chiavi con casing diverso; normalizza per il client. */
function normalizePartRow(row: Record<string, unknown>) {
  const r = row as Record<string, string | number | null | undefined>;
  const pick = (a: string, b: string) =>
    (r[a] !== undefined && r[a] !== null ? r[a] : r[b]) as string | number | null | undefined;
  return {
    id: Number(pick('id', 'ID')),
    codice: (pick('codice', 'CODICE') as string | null | undefined) ?? null,
    descrizione: String(pick('descrizione', 'DESCRIZIONE') ?? ''),
    categoria: (pick('categoria', 'CATEGORIA') as string | null | undefined) ?? null,
    tipo: String(pick('tipo', 'TIPO') ?? 'Ricambio'),
    um: String(pick('um', 'UM') ?? 'NR')
  };
}

// GET - Ricerca/autocompletamento pezzi
export async function GET(request: NextRequest) {
  let connection: any = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || ''; // Query di ricerca
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limitSafe = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit));
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

      const categories = (rows as Record<string, unknown>[])
        .map((row) => (row.categoria ?? row.CATEGORIA) as string)
        .filter((cat, index, self) => cat && self.indexOf(cat) === index);

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
    
    // Ricerca su descrizione e codice (stesso pattern usato in molti cataloghi cloud)
    if (q.trim()) {
      const like = `%${q.trim()}%`;
      query += ' AND (descrizione LIKE ? OR codice LIKE ?)';
      params.push(like, like);
    }
    
    // LIMIT come letterale intero: su alcuni MySQL cloud LIMIT ? in prepared stmt dà ER_WRONG_ARGUMENTS
    query += ` ORDER BY descrizione ASC LIMIT ${limitSafe}`;
    
    const [rows] = await connection.execute(query, params);
    connection.release();

    const data = (rows as Record<string, unknown>[]).map(normalizePartRow);

    return NextResponse.json({
      success: true,
      data
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

    const inserted = Array.isArray(newPart) ? newPart[0] : null;

    return NextResponse.json({
      success: true,
      data: inserted ? normalizePartRow(inserted as Record<string, unknown>) : null,
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

