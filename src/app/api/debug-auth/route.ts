import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-auth';
import { verifyPassword } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Test connessione database
    const [connectionTest] = await pool.execute('SELECT 1 as test');
    
    // Verifica esistenza tabella users
    const [tableCheck] = await pool.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
    );
    
    // Verifica utente admin
    const [adminCheck] = await pool.execute(
      'SELECT id, username, password_hash, role FROM users WHERE username = ?',
      ['admin']
    );
    
    // Test password hash
    let passwordTest = null;
    if ((adminCheck as any[]).length > 0) {
      const admin = (adminCheck as any[])[0];
      passwordTest = await verifyPassword('admin123', admin.password_hash);
    }
    
    // Verifica variabili ambiente
    const envCheck = {
      DB_HOST: process.env.DB_GESTIONE_HOST ? 'SET' : 'NOT_SET',
      DB_USER: process.env.DB_GESTIONE_USER ? 'SET' : 'NOT_SET',
      DB_PASSWORD: process.env.DB_GESTIONE_PASSWORD ? 'SET' : 'NOT_SET',
      DB_NAME: process.env.DB_GESTIONE_DATABASE ? 'SET' : 'NOT_SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET'
    };
    
    return NextResponse.json({
      success: true,
      database: {
        connection: connectionTest,
        usersTableExists: (tableCheck as any[])[0].count > 0,
        adminUserExists: (adminCheck as any[]).length > 0,
        adminData: (adminCheck as any[]).length > 0 ? {
          id: (adminCheck as any[])[0].id,
          username: (adminCheck as any[])[0].username,
          role: (adminCheck as any[])[0].role,
          passwordHashLength: (adminCheck as any[])[0].password_hash?.length || 0
        } : null,
        passwordVerification: passwordTest
      },
      environment: envCheck
    });
    
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}