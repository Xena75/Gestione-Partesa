import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db'
};

// GET - Recupera tutte le categorie
export async function GET() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT id, name, active, created_at FROM categories ORDER BY name'
    );
    
    return NextResponse.json({ categories: rows });
  } catch (error) {
    console.error('Errore nel recupero delle categorie:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle categorie' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// POST - Crea una nuova categoria
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome categoria richiesto' },
        { status: 400 }
      );
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'INSERT INTO categories (name, active) VALUES (?, TRUE)',
      [name.trim()]
    );
    
    return NextResponse.json({ 
      message: 'Categoria aggiunta con successo',
      id: (result as any).insertId 
    });
  } catch (error: any) {
    console.error('Errore nell\'aggiunta della categoria:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Categoria già esistente' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Errore nell\'aggiunta della categoria' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// PUT - Aggiorna una categoria esistente
export async function PUT(request: NextRequest) {
  let connection;
  
  try {
    const { id, name, active } = await request.json();
    
    if (!id || (!name && active === undefined)) {
      return NextResponse.json(
        { error: 'ID e almeno un campo da aggiornare richiesti' },
        { status: 400 }
      );
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    let query = 'UPDATE categories SET ';
    const params = [];
    const updates = [];
    
    if (name && name.trim() !== '') {
      updates.push('name = ?');
      params.push(name.trim());
    }
    
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active);
    }
    
    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);
    
    const [result] = await connection.execute(query, params);
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Categoria aggiornata con successo'
    });
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento della categoria:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Nome categoria già esistente' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della categoria' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// DELETE - Elimina una categoria
export async function DELETE(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID categoria richiesto' },
        { status: 400 }
      );
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    // Verifica se la categoria è utilizzata da qualche fornitore
    const [suppliers] = await connection.execute(
      'SELECT COUNT(*) as count FROM suppliers WHERE category COLLATE utf8mb4_unicode_ci = (SELECT name FROM categories WHERE id = ?) COLLATE utf8mb4_unicode_ci',
      [id]
    );
    
    const supplierCount = (suppliers as any[])[0].count;
    
    if (supplierCount > 0) {
      return NextResponse.json(
        { error: `Impossibile eliminare: categoria utilizzata da ${supplierCount} fornitori` },
        { status: 409 }
      );
    }
    
    const [result] = await connection.execute(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Categoria eliminata con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione della categoria:', error);
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione della categoria' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}