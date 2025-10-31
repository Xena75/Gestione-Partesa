import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db-employees';
import { hashPassword } from '@/lib/auth-employees';
import { getEmployeeById, getEmployeeByUsername } from '@/lib/db-employees';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { password } = await request.json();
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);

    // Validazione password
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere di almeno 6 caratteri' },
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

      // Hash della password
      const passwordHash = await hashPassword(password);

      // Aggiorna la password nel database
      await connection.execute(
        'UPDATE employees SET password_hash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, employee.id]
      );

      console.log(`Password aggiornata per dipendente: ${employee.nome} ${employee.cognome} (${employee.id})`);

      return NextResponse.json({
        success: true,
        message: 'Password aggiornata con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore aggiornamento password dipendente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Endpoint per verificare se il dipendente ha già una password impostata
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

    const connection = await getConnection();

    try {
      const [rows] = await connection.execute(
        'SELECT id, nome, cognome, password_hash IS NOT NULL as has_password FROM employees WHERE id = ?',
        [employee.id]
      );

      const employees = rows as any[];
      if (employees.length === 0) {
        return NextResponse.json(
          { error: 'Dipendente non trovato' },
          { status: 404 }
        );
      }

      const employeeData = employees[0];

      return NextResponse.json({
        id: employeeData.id,
        nome: employeeData.nome,
        cognome: employeeData.cognome,
        has_password: Boolean(employeeData.has_password)
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore verifica password dipendente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}