import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306')
};

export async function POST() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Aggiungi i campi mancanti alla tabella suppliers
    const alterQueries = [
      'ALTER TABLE suppliers ADD COLUMN contact_person VARCHAR(255) NULL AFTER phone',
      'ALTER TABLE suppliers ADD COLUMN website VARCHAR(255) NULL AFTER contact_person',
      'ALTER TABLE suppliers ADD COLUMN mobile VARCHAR(50) NULL AFTER website'
    ];
    
    const results = [];
    
    for (const query of alterQueries) {
      try {
        await connection.execute(query);
        results.push({ query, status: 'success' });
      } catch (error: any) {
        // Se il campo esiste già, ignora l'errore
        if (error.code === 'ER_DUP_FIELDNAME') {
          results.push({ query, status: 'already_exists' });
        } else {
          results.push({ query, status: 'error', error: error.message });
        }
      }
    }
    
    // Verifica la struttura aggiornata
    const [updatedStructure] = await connection.execute('DESCRIBE suppliers');
    
    return NextResponse.json({
      success: true,
      results,
      updatedStructure,
      message: 'Campi aggiunti alla tabella suppliers'
    });
    
  } catch (error: any) {
    console.error('Errore nell\'aggiunta dei campi:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Errore nell\'aggiunta dei campi alla tabella suppliers'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}