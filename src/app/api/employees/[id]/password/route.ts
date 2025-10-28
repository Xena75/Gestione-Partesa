import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db-employees';
import { hashPassword } from '@/lib/auth-employees';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { password } = await request.json();
    const resolvedParams = await params;
    const employeeId = resolvedParams.id;

    // Validazione password
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere di almeno 6 caratteri' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      // Verifica che l'employee esista
      const [employeeRows] = await connection.execute(
        'SELECT id, nome, cognome FROM employees WHERE id = ? AND active = 1',
        [employeeId]
      );

      const employees = employeeRows as any[];
      if (employees.length === 0) {
        return NextResponse.json(
          { error: 'Dipendente non trovato o non attivo' },
          { status: 404 }
        );
      }

      const employee = employees[0];

      // Hash della password
      const passwordHash = await hashPassword(password);

      // Aggiorna la password nel database
      await connection.execute(
        'UPDATE employees SET password_hash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, employeeId]
      );

      console.log(`Password aggiornata per dipendente: ${employee.nome} ${employee.cognome} (${employeeId})`);

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
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const employeeId = resolvedParams.id;
    const connection = await getConnection();

    try {
      const [rows] = await connection.execute(
        'SELECT id, nome, cognome, password_hash IS NOT NULL as has_password FROM employees WHERE id = ?',
        [employeeId]
      );

      const employees = rows as any[];
      if (employees.length === 0) {
        return NextResponse.json(
          { error: 'Dipendente non trovato' },
          { status: 404 }
        );
      }

      const employee = employees[0];

      return NextResponse.json({
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome,
        has_password: Boolean(employee.has_password)
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