import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db-employees';
import { getEmployeeById, getEmployeeByUsername } from '@/lib/db-employees';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { username_login } = await request.json();
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);

    // Validazione username
    if (!username_login || username_login.trim().length < 3) {
      return NextResponse.json(
        { error: 'L\'username deve essere di almeno 3 caratteri' },
        { status: 400 }
      );
    }

    // Validazione formato username (solo lettere, numeri, punti e underscore)
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username_login.trim())) {
      return NextResponse.json(
        { error: 'L\'username può contenere solo lettere, numeri, punti e underscore' },
        { status: 400 }
      );
    }

    // Cerca il dipendente prima per ID, poi per username
    let employee = await getEmployeeById(employeeId);
    if (!employee) {
      employee = await getEmployeeByUsername(employeeId);
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    const connection = await getConnection();

    try {
      // Verifica se l'username è già in uso da un altro dipendente
      const [existingRows] = await connection.execute(
        'SELECT id FROM employees WHERE username_login = ? AND id != ?',
        [username_login.trim(), employee.id]
      ) as any;

      if (existingRows.length > 0) {
        return NextResponse.json(
          { error: 'Questo username è già in uso da un altro dipendente' },
          { status: 409 }
        );
      }

      // Aggiorna l'username nel database
      await connection.execute(
        'UPDATE employees SET username_login = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [username_login.trim(), employee.id]
      );

      console.log(`Username aggiornato per dipendente: ${employee.nome} ${employee.cognome} (${employee.id}) - Nuovo username: ${username_login.trim()}`);

      return NextResponse.json({ 
        success: true, 
        message: 'Username aggiornato con successo',
        username_login: username_login.trim()
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore durante l\'aggiornamento dell\'username:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante l\'aggiornamento dell\'username' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);

    // Cerca il dipendente prima per ID, poi per username
    let employee = await getEmployeeById(employeeId);
    if (!employee) {
      employee = await getEmployeeByUsername(employeeId);
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      username_login: employee.username_login || null
    });

  } catch (error) {
    console.error('Errore durante il recupero dell\'username:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero dell\'username' },
      { status: 500 }
    );
  }
}