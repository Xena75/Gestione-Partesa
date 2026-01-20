import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';
import { verifyUserAccess } from '@/lib/auth';

// PATCH - Aggiorna solo il campo exclude_from_pending di un viaggio
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { exclude_from_pending } = body;

    if (typeof exclude_from_pending !== 'boolean') {
      return NextResponse.json(
        { error: 'exclude_from_pending deve essere un valore booleano (true/false)' },
        { status: 400 }
      );
    }

    // Aggiorna solo il campo exclude_from_pending
    const [result] = await poolViaggi.execute(
      `UPDATE travels 
       SET exclude_from_pending = ?, updatedAt = NOW() 
       WHERE id = ?`,
      [exclude_from_pending ? 1 : 0, id]
    ) as [any, any];

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Viaggio non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: exclude_from_pending 
        ? 'Viaggio escluso dal conteggio Monitoraggi Pending' 
        : 'Viaggio incluso nel conteggio Monitoraggi Pending'
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento exclude_from_pending:', error);
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}
