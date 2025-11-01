import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db-employees';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, check_modulo } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID richiesta mancante' },
        { status: 400 }
      );
    }

    const connection = await getConnection();
    
    try {
      // Aggiorna il campo check_modulo nella tabella employee_leave_requests
      const [result] = await connection.execute(
        'UPDATE employee_leave_requests SET check_modulo = ? WHERE id = ?',
        [check_modulo ? 1 : 0, id]
      );

      const updateResult = result as any;
      
      if (updateResult.affectedRows === 0) {
        return NextResponse.json(
          { success: false, message: 'Richiesta non trovata' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Campo modulo aggiornato con successo'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore aggiornamento check_modulo:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}