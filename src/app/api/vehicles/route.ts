import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera tutti i veicoli
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const connection = await mysql.createConnection(dbConfig);

    const query = `
      SELECT 
        id,
        targa,
        marca,
        modello,
        proprieta,
        portata,
        n_palt,
        tipo_patente,
        pallet_kg,
        km_ultimo_tagliando,
        data_ultimo_tagliando,
        data_ultima_revisione,
        active,
        createdAt,
        updatedAt
      FROM vehicles 
      ORDER BY targa ASC
    `;

    const [rows] = await connection.execute(query);
    await connection.end();

    return NextResponse.json({ 
      success: true, 
      vehicles: rows 
    });
  } catch (error) {
    console.error('Errore nel recupero veicoli:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei veicoli' },
      { status: 500 }
    );
  }
}