import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

export async function GET() {
  try {
    // Ottieni la definizione ENUM della colonna category dalla tabella suppliers
    const [rows] = await pool.execute(
      'SHOW COLUMNS FROM suppliers WHERE Field = "category"'
    );
    
    let categories: string[] = [];
    
    if (rows.length > 0) {
      const typeDefinition = (rows as any[])[0].Type;
      // Estrai i valori ENUM dalla definizione
      const enumMatch = typeDefinition.match(/enum\((.+)\)/i);
      if (enumMatch) {
        categories = enumMatch[1]
          .split(',')
          .map((val: string) => val.trim().replace(/'/g, ''));
      }
    }
    
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