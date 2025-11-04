import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeByUsername } from '@/lib/db-employees';

// GET - Trova dipendente per username
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username richiesto' },
        { status: 400 }
      );
    }
    
    console.log('API GET /api/employees/by-username - Cercando per username:', username);
    
    // Cerca il dipendente per username_login
    const employee = await getEmployeeByUsername(username);
    
    if (!employee) {
      console.log('Dipendente non trovato per username:', username);
      return NextResponse.json(
        { success: false, error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }
    
    console.log('Dipendente trovato:', employee.id, `${employee.nome} ${employee.cognome}`);
    
    return NextResponse.json({
      success: true,
      data: {
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome,
        username_login: employee.username_login
      }
    });
    
  } catch (error) {
    console.error('Errore nel recupero dipendente per username:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

