import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Configurazione database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_PORT || '3306')
};

export async function GET() {
  try {
    console.log('🔍 API Mappings - Inizio richiesta GET');
    
    // Prova a connetterti al database
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('✅ Connessione database stabilita');
    } catch (dbError) {
      console.error('❌ Errore connessione database:', dbError);
      // Se non riesce a connettersi, restituisci array vuoto invece di errore
      return NextResponse.json({
        success: true,
        mappings: [],
        message: 'Database non disponibile, nessun mapping salvato'
      });
    }
    
    try {
      // Verifica se la tabella esiste
      const [tableCheck] = await connection.execute('SHOW TABLES LIKE "import_mappings"');
      const tableExists = Array.isArray(tableCheck) && tableCheck.length > 0;
      
      if (!tableExists) {
        console.log('⚠️ Tabella import_mappings non trovata, creo la tabella...');
        
        // Crea la tabella se non esiste
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS import_mappings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            mapping_data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Tabella import_mappings creata');
      }
      
      // Recupera i mappings
      const [rows] = await connection.execute(
        'SELECT id, name, description, mapping_data, created_at, updated_at FROM import_mappings ORDER BY updated_at DESC'
      );
      
      await connection.end();
      console.log('✅ Query eseguita, mappings recuperati');
      
      return NextResponse.json({
        success: true,
        mappings: rows,
        message: 'Mapping recuperati con successo'
      });
      
    } catch (queryError) {
      console.error('❌ Errore durante la query:', queryError);
      await connection.end();
      return NextResponse.json({
        success: true,
        mappings: [],
        message: 'Errore nella query, nessun mapping salvato'
      });
    }
    
  } catch (error) {
    console.error('❌ Errore generale durante il recupero mapping:', error);
    return NextResponse.json({
      success: true,
      mappings: [],
      message: 'Errore generale, nessun mapping salvato'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API Mappings - Inizio richiesta POST');
    
    const body = await request.json();
    const { name, description, mapping_data } = body;

    if (!name || !mapping_data) {
      return NextResponse.json(
        { error: 'Nome e mapping_data sono obbligatori' },
        { status: 400 }
      );
    }

    // Prova a connetterti al database
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('✅ Connessione database stabilita per POST');
    } catch (dbError) {
      console.error('❌ Errore connessione database per POST:', dbError);
      return NextResponse.json(
        { error: 'Database non disponibile per salvare il mapping' },
        { status: 500 }
      );
    }
    
    try {
      // Verifica se la tabella esiste
      const [tableCheck] = await connection.execute('SHOW TABLES LIKE "import_mappings"');
      const tableExists = Array.isArray(tableCheck) && tableCheck.length > 0;
      
      if (!tableExists) {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS import_mappings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            mapping_data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
      }
      
      // Inserisci il nuovo mapping
      const [result] = await connection.execute(
        'INSERT INTO import_mappings (name, description, mapping_data) VALUES (?, ?, ?)',
        [name, description || '', JSON.stringify(mapping_data)]
      );
      
      const insertResult = result as { insertId: number };
      const mappingId = insertResult.insertId;
      
      // Recupera il mapping appena inserito
      const [rows] = await connection.execute(
        'SELECT id, name, description, mapping_data, created_at, updated_at FROM import_mappings WHERE id = ?',
        [mappingId]
      );
      
      await connection.end();
      console.log('✅ Mapping salvato con successo');
      
      return NextResponse.json({
        success: true,
        mapping: (rows as any[])[0],
        message: 'Mapping salvato con successo'
      });
      
    } catch (queryError) {
      console.error('❌ Errore durante il salvataggio mapping:', queryError);
      await connection.end();
      return NextResponse.json(
        { error: 'Errore durante il salvataggio del mapping' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Errore generale durante il salvataggio mapping:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il salvataggio del mapping' },
      { status: 500 }
    );
  }
}
