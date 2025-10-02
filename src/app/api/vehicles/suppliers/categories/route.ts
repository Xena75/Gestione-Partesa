import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

export async function GET() {
  try {
    // Ottieni le categorie dalla tabella categories
    const [rows] = await pool.execute(
      'SELECT name FROM categories WHERE active = 1 ORDER BY name'
    );
    
    const categories = (rows as any[]).map(row => row.name);
    
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Errore nel recupero delle categorie:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle categorie' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome categoria richiesto' },
        { status: 400 }
      );
    }
    
    const [result] = await pool.execute(
      'INSERT INTO categories (name) VALUES (?)',
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
  }
}