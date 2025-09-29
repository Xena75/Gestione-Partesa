import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth';
import pool from '@/lib/db-auth';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Verifica che l'utente corrente sia admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Solo gli admin possono cambiare utente' },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utente richiesto' },
        { status: 400 }
      );
    }

    // Recupera i dati dell'utente target
    const [rows] = await pool.execute(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    const targetUser = users[0];

    // Crea un nuovo token per l'utente target
    const token = jwt.sign(
      { 
        userId: targetUser.id, 
        username: targetUser.username,
        role: targetUser.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Imposta il nuovo cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role
      }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 ore
    });

    return response;

  } catch (error) {
    console.error('Errore switch user:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}