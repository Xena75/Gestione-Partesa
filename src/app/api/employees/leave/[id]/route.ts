import { NextRequest, NextResponse } from 'next/server';
import { updateLeaveRequest, deleteLeaveRequest } from '@/lib/db-employees';

// PUT - Modifica una richiesta di ferie
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID richiesta non valido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { start_date, end_date, leave_type, hours, notes } = body;

    // Validazione dei dati
    if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return NextResponse.json(
        { error: 'Formato data inizio non valido (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return NextResponse.json(
        { error: 'Formato data fine non valido (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (leave_type && !['ferie', 'permesso'].includes(leave_type)) {
      return NextResponse.json(
        { error: 'Tipo di richiesta non valido (ferie o permesso)' },
        { status: 400 }
      );
    }

    if (hours !== undefined && (typeof hours !== 'number' || hours < 0)) {
      return NextResponse.json(
        { error: 'Ore non valide' },
        { status: 400 }
      );
    }

    // Validazione logica: se è un permesso, deve avere le ore
    if (leave_type === 'permesso' && (hours === undefined || hours <= 0)) {
      return NextResponse.json(
        { error: 'Per i permessi è necessario specificare le ore' },
        { status: 400 }
      );
    }

    // Validazione logica: se sono ferie, non dovrebbe avere ore
    if (leave_type === 'ferie' && hours !== undefined && hours > 0) {
      return NextResponse.json(
        { error: 'Per le ferie non è necessario specificare le ore' },
        { status: 400 }
      );
    }

    // Validazione date: data inizio non può essere successiva alla data fine
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: 'La data di inizio non può essere successiva alla data di fine' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (leave_type !== undefined) updateData.leave_type = leave_type;
    if (hours !== undefined) updateData.hours = hours;
    if (notes !== undefined) updateData.notes = notes;

    const success = await updateLeaveRequest(id, updateData);

    if (!success) {
      return NextResponse.json(
        { error: 'Impossibile aggiornare la richiesta' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Richiesta aggiornata con successo' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Errore durante l\'aggiornamento della richiesta:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina una richiesta di ferie
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID richiesta non valido' },
        { status: 400 }
      );
    }

    const success = await deleteLeaveRequest(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Impossibile eliminare la richiesta' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Richiesta eliminata con successo' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Errore durante l\'eliminazione della richiesta:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}