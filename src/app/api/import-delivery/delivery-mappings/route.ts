import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2/promise';
import pool from '@/lib/db-gestione';

const CREATE_TABLE = `
      CREATE TABLE IF NOT EXISTS delivery_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        mapping_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

export async function GET() {
  try {
    await pool.execute(CREATE_TABLE);

    const [rows] = await pool.execute(
      'SELECT * FROM delivery_mappings ORDER BY updated_at DESC'
    );

    return NextResponse.json({
      success: true,
      mappings: rows
    });

  } catch (error) {
    console.error('Errore nel recupero dei mapping:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei mapping salvati' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, mapping_data } = body;

    if (!name || !mapping_data) {
      return NextResponse.json(
        { error: 'Nome e mapping_data sono obbligatori' },
        { status: 400 }
      );
    }

    await pool.execute(CREATE_TABLE);

    const [result] = await pool.execute(
      'INSERT INTO delivery_mappings (name, description, mapping_data) VALUES (?, ?, ?)',
      [name, description, JSON.stringify(mapping_data)]
    );

    const insertResult = result as ResultSetHeader;

    return NextResponse.json({
      success: true,
      mapping: {
        id: insertResult.insertId,
        name,
        description,
        mapping_data: JSON.stringify(mapping_data),
        created_at: new Date(),
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Errore nel salvataggio del mapping:', error);
    return NextResponse.json(
      { error: 'Errore nel salvataggio del mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del mapping è obbligatorio' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      'DELETE FROM delivery_mappings WHERE id = ?',
      [id]
    );

    const deleteResult = result as ResultSetHeader;

    if (deleteResult.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Mapping non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mapping eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione del mapping:', error);
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione del mapping' },
      { status: 500 }
    );
  }
}
