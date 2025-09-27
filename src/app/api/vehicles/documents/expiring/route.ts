import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '30'); // Default 30 giorni
    
    const query = `
      SELECT 
        vd.id,
        vd.vehicle_id,
        v.targa as vehicle_plate,
        v.marca as vehicle_brand,
        v.modello as vehicle_model,
        vd.document_type,
        vd.file_name,
        vd.expiry_date,
        DATEDIFF(vd.expiry_date, CURDATE()) as days_until_expiry
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE vd.expiry_date IS NOT NULL
        AND vd.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY vd.expiry_date ASC, v.targa ASC
    `;

    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(query, [daysAhead]);
    await connection.end();
    
    return NextResponse.json({
      success: true,
      documents: rows
    });

  } catch (error) {
    console.error('Errore nel recupero documenti in scadenza:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore interno del server' 
      },
      { status: 500 }
    );
  }
}