import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Configurazione database
const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306')
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const connection = await mysql.createConnection(dbConfig);

    // Costruisci la query base
    let sql = `
      SELECT 
        session_id,
        COUNT(*) as total_rows,
        COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as imported_rows,
        COUNT(CASE WHEN session_id IS NULL THEN 1 END) as error_count,
        MIN(created_at) as created_at,
        CASE 
          WHEN COUNT(CASE WHEN session_id IS NULL THEN 1 END) = 0 THEN 'success'
          WHEN COUNT(CASE WHEN session_id IS NULL THEN 1 END) < COUNT(*) THEN 'partial'
          ELSE 'error'
        END as status
      FROM viaggi_pod 
      WHERE session_id LIKE 'import_%'
    `;

    const params: (string | number)[] = [];

    // Aggiungi filtri
    if (dateFrom) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(dateTo);
    }

    if (search) {
      sql += ' AND session_id LIKE ?';
      params.push(`%${search}%`);
    }

    // Raggruppa per session_id
    sql += ' GROUP BY session_id';

    // Filtra per status se specificato
    if (status && status !== 'all') {
      sql = `
        SELECT * FROM (
          ${sql}
        ) as subquery
        WHERE status = ?
      `;
      params.push(status);
    }

    // Ordina per data creazione (più recenti prima)
    sql += ' ORDER BY created_at DESC';

    // Limita i risultati per performance
    sql += ' LIMIT 100';

    const [rows] = await connection.execute(sql, params);
    await connection.end();

    // Calcola la durata per ogni sessione (simulata per ora)
    const sessions = (rows as { session_id: string; total_rows: number; imported_rows: number; error_count: number; created_at: string; status: string }[]).map(row => ({
      session_id: row.session_id,
      total_rows: row.total_rows,
      imported_rows: row.imported_rows,
      error_count: row.error_count,
      duration: Math.floor(Math.random() * 300) + 10, // Simulato: 10-310 secondi
      created_at: row.created_at,
      status: row.status
    }));

    return NextResponse.json({
      success: true,
      sessions,
      total: sessions.length,
      message: 'Storico importazioni recuperato con successo'
    });

  } catch (error) {
    console.error('Errore durante il recupero storico:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero dello storico' },
      { status: 500 }
    );
  }
}
