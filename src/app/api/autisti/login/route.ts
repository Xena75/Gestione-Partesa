// src/app/api/autisti/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmployee } from '@/lib/auth-employees';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username e password sono richiesti' },
        { status: 400 }
      );
    }

    // Autentica il dipendente
    const authResult = await authenticateEmployee(username, password);

    if (!authResult.success || !authResult.user || !authResult.token) {
      return NextResponse.json(
        { error: authResult.message || 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Imposta il cookie di autenticazione
    const cookieStore = await cookies();
    cookieStore.set('employee_token', authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 ore
    });

    return NextResponse.json({
      success: true,
      message: 'Login effettuato con successo',
      employee: {
        id: authResult.user.id,
        nome: authResult.user.nome,
        cognome: authResult.user.cognome,
        email: authResult.user.email,
        is_driver: authResult.user.is_driver,
        role: authResult.user.role || 'employee'
      }
    });

  } catch (error) {
    console.error('Errore API /autisti/login:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}