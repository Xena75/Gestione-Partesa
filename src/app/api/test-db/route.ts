import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-auth';

export async function GET() {
  try {
    // Test connessione database
    const [rows] = await pool.execute('SELECT 1 as test');
    
    // Test query utenti
    const [userRows] = await pool.execute(
      'SELECT COUNT(*) as user_count FROM users'
    );
    
    // Test query admin
    const [adminRows] = await pool.execute(
      'SELECT id, username, email, role FROM users WHERE username = ?',
      ['admin']
    );
    
    return NextResponse.json({
      success: true,
      message: 'Database connesso correttamente',
      data: {
        connection: rows,
        userCount: userRows,
        adminUser: adminRows
      },
      env: {
        host: process.env.DB_GESTIONE_HOST,
        port: process.env.DB_GESTIONE_PORT,
        user: process.env.DB_GESTIONE_USER,
        database: process.env.DB_GESTIONE_NAME,
        hasPassword: !!process.env.DB_GESTIONE_PASS
      }
    });
  } catch (error) {
    console.error('Errore test database:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Errore connessione database',
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
        env: {
          host: process.env.DB_GESTIONE_HOST,
          port: process.env.DB_GESTIONE_PORT,
          user: process.env.DB_GESTIONE_USER,
          database: process.env.DB_GESTIONE_NAME,
          hasPassword: !!process.env.DB_GESTIONE_PASS
        }
      },
      { status: 500 }
    );
  }
}