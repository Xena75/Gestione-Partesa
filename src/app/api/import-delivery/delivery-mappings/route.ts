import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Configurazione database gestionelogistica
const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306')
};

// GET - Recupera mapping salvati
export async function GET() {
  let connection: mysql.Connection | null = null;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Crea la tabella se non esiste
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS delivery_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        mapping_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    const [rows] = await connection.execute(
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// POST - Salva nuovo mapping
export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    const body = await request.json();
    const { name, description, mapping_data } = body;
    
    if (!name || !mapping_data) {
      return NextResponse.json(
        { error: 'Nome e mapping_data sono obbligatori' },
        { status: 400 }
      );
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    // Crea la tabella se non esiste
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS delivery_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        mapping_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    const [result] = await connection.execute(
      'INSERT INTO delivery_mappings (name, description, mapping_data) VALUES (?, ?, ?)',
      [name, description, JSON.stringify(mapping_data)]
    );
    
    const insertResult = result as mysql.ResultSetHeader;
    
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// DELETE - Elimina mapping
export async function DELETE(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID del mapping è obbligatorio' },
        { status: 400 }
      );
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'DELETE FROM delivery_mappings WHERE id = ?',
      [id]
    );
    
    const deleteResult = result as mysql.ResultSetHeader;
    
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}