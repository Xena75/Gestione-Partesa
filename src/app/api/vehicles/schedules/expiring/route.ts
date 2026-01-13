import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '30'); // Default 30 giorni
    
    const query = `
      SELECT 
        vs.id,
        vs.vehicle_id,
        v.targa as vehicle_plate,
        v.marca as vehicle_brand,
        v.modello as vehicle_model,
        vs.schedule_type,
        COALESCE(vs.booking_date, vs.data_scadenza) as scheduled_date,
        vs.data_scadenza as original_due_date,
        vs.booking_date as programmed_date,
        vs.description,
        vs.status,
        vs.priority,
        vs.provider,
        vs.cost,
        DATEDIFF(COALESCE(vs.booking_date, vs.data_scadenza), CURDATE()) as days_until_expiry
      FROM vehicle_schedules vs
      INNER JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE vs.completed_date IS NULL
        AND vs.status != 'completed'
        AND COALESCE(vs.booking_date, vs.data_scadenza) <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY COALESCE(vs.booking_date, vs.data_scadenza) ASC, v.targa ASC
    `;

    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(query, [daysAhead]);
    await connection.end();
    
    return NextResponse.json({
      success: true,
      schedules: rows
    });

  } catch (error) {
    console.error('Errore nel recupero scadenze programmate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore interno del server' 
      },
      { status: 500 }
    );
  }
}