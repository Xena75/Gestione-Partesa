// src/app/api/autisti/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Rimuovi il cookie di autenticazione
    const cookieStore = await cookies();
    cookieStore.delete('employee_token');

    return NextResponse.json({
      success: true,
      message: 'Logout effettuato con successo'
    });

  } catch (error) {
    console.error('Errore API /autisti/logout:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}