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
    console.log('🔍 Configurazione database:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port
    });

    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connessione database stabilita');
    
    // Prima verifica se la tabella esiste
    try {
      const [tableCheck] = await connection.execute('SHOW TABLES LIKE "import_mappings"');
      const tableExists = Array.isArray(tableCheck) && tableCheck.length > 0;
      console.log('🔍 Tabella import_mappings esiste:', tableExists);
      
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
    } catch (tableError) {
      console.error('❌ Errore durante il controllo/creazione tabella:', tableError);
    }
    
    const [rows] = await connection.execute(
      'SELECT id, name, description, mapping_data, created_at, updated_at FROM import_mappings ORDER BY updated_at DESC'
    );
    
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    console.log('✅ Query eseguita, righe trovate:', rowCount);
    
    await connection.end();
    console.log('✅ Connessione database chiusa');
    
    return NextResponse.json({
      success: true,
      mappings: rows,
      message: 'Mapping recuperati con successo'
    });
    
  } catch (error) {
    console.error('❌ Errore durante il recupero mapping:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero dei mapping' },
      { status: 500 }
    );
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

    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connessione database stabilita per POST');
    
    // Inserisci il nuovo mapping
    const [result] = await connection.execute(
      'INSERT INTO import_mappings (name, description, mapping_data, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [name, description || '', JSON.stringify(mapping_data)]
    );
    
    const insertResult = result as { insertId: number };
    const mappingId = insertResult.insertId;
    console.log('✅ Mapping inserito con ID:', mappingId);
    
    // Recupera il mapping appena inserito
    const [rows] = await connection.execute(
      'SELECT id, name, description, mapping_data, created_at, updated_at FROM import_mappings WHERE id = ?',
      [mappingId]
    );
    
    await connection.end();
    console.log('✅ Connessione database chiusa per POST');
    
    return NextResponse.json({
      success: true,
      mapping: (rows as { id: number; name: string; description: string; mapping_data: string; created_at: Date; updated_at: Date }[])[0],
      message: 'Mapping salvato con successo'
    });
    
  } catch (error) {
    console.error('❌ Errore durante il salvataggio mapping:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il salvataggio del mapping' },
      { status: 500 }
    );
  }
}
