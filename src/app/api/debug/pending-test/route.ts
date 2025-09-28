import { NextRequest, NextResponse } from 'next/server';
import gestionePool from '@/lib/db-gestione';

interface PendingViaggio {
  'Numero Viaggio': string;
  'Nominativo': string;
  'Data Inizio': string;
  'Deposito': string;
  'Targa': string;
}

// GET - Test endpoint per verificare la connessione al database gestionelogistica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = (page - 1) * limit;

    // Test connessione database
    const [testConnection] = await gestionePool.execute('SELECT 1 as test');
    console.log('Connessione database OK:', testConnection);

    // Verifica esistenza tabella viaggi
    const [tables] = await gestionePool.execute(
      "SHOW TABLES LIKE 'tab_viaggi'"
    );
    console.log('Tabella tab_viaggi trovata:', tables);

    // Verifica struttura tabella viaggi
    const [columns] = await gestionePool.execute(
      "DESCRIBE tab_viaggi"
    );
    console.log('Struttura tabella viaggi:', columns);

    // Query per contare il totale dei viaggi pending
    const [countResult] = await gestionePool.execute(
      `SELECT COUNT(*) as total 
       FROM tab_viaggi 
       WHERE stato = 'pending'`
    );
    const totalItems = (countResult as any[])[0]?.total || 0;

    // Query per recuperare i viaggi pending con paginazione
    const [viaggiResult] = await gestionePool.execute(
      `SELECT 
         numero_viaggio as 'Numero Viaggio',
         nominativo as 'Nominativo',
         DATE_FORMAT(data_inizio, '%d/%m/%Y') as 'Data Inizio',
         deposito as 'Deposito',
         targa as 'Targa'
       FROM tab_viaggi 
       WHERE stato = 'pending'
       ORDER BY data_inizio DESC, numero_viaggio DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const viaggi = viaggiResult as PendingViaggio[];

    return NextResponse.json({
      success: true,
      database: 'gestionelogistica',
      totalPendingViaggi: totalItems,
      viaggi,
      debug: {
        connection: 'OK',
        tableExists: (tables as any[]).length > 0,
        columns: columns
      }
    });

  } catch (error) {
    console.error('Errore nel test pending viaggi:', error);
    return NextResponse.json(
      { 
        error: 'Errore nel test',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
        database: 'gestionelogistica'
      },
      { status: 500 }
    );
  }
}