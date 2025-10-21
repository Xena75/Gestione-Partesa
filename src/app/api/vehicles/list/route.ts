import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera lista veicoli con contatori documenti
export async function GET(request: NextRequest) {
  try {
    console.log('🚗 API /vehicles/list chiamata');
    
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      console.log('❌ Autenticazione fallita:', authResult.message);
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }
    console.log('✅ Autenticazione OK');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    console.log('🔍 Parametro search:', search);

    console.log('🔌 Tentativo connessione database con config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    });

    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connessione database stabilita');

    // Costruisci la query con filtro di ricerca (rimosso filtro automatico active = 1)
    let whereCondition = '1=1';
    let queryParams: any[] = [];

    if (search) {
      whereCondition += ' AND (v.targa LIKE ? OR v.marca LIKE ? OR v.modello LIKE ? OR v.proprieta LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Query per recuperare veicoli con contatori documenti
    const vehiclesQuery = `
      SELECT 
        v.id,
        v.targa,
        v.marca,
        v.modello,
        v.proprieta,
        v.tipo_patente,
        v.active,
        COUNT(vd.id) as total_documents,
        COUNT(CASE WHEN vd.expiry_date < CURDATE() THEN 1 END) as expired_documents,
        COUNT(CASE WHEN vd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN vd.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as valid_documents
      FROM vehicles v
      LEFT JOIN vehicle_documents vd ON v.id = vd.vehicle_id
      WHERE ${whereCondition}
      GROUP BY v.id, v.targa, v.marca, v.modello, v.proprieta, v.tipo_patente, v.active
      ORDER BY v.targa ASC
    `;

    console.log('📝 Esecuzione query:', vehiclesQuery);
    console.log('📝 Parametri query:', queryParams);
    
    const [vehiclesRows] = await connection.execute(vehiclesQuery, queryParams);
    console.log('📊 Risultati query - Numero veicoli trovati:', Array.isArray(vehiclesRows) ? vehiclesRows.length : 0);
    console.log('📊 Primi 3 veicoli:', Array.isArray(vehiclesRows) ? vehiclesRows.slice(0, 3) : 'Nessun risultato');
    
    await connection.end();
    console.log('🔌 Connessione database chiusa');

    const response = {
      success: true,
      vehicles: vehiclesRows
    };
    console.log('📤 Risposta API:', { success: response.success, vehicleCount: Array.isArray(vehiclesRows) ? vehiclesRows.length : 0 });

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Errore nel recupero lista veicoli:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero lista veicoli' },
      { status: 500 }
    );
  }
}