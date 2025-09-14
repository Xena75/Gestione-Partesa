// src/app/api/viaggi-pod/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getViaggioPodById, updateViaggioPodData, deleteViaggioPodData } from '@/lib/data-viaggi-pod';

// GET: Recupera i dati di un viaggio POD specifico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID viaggio POD richiesto' },
        { status: 400 }
      );
    }

    const viaggioPod = await getViaggioPodById(Number(id));

    if (!viaggioPod) {
      return NextResponse.json(
        { error: 'Viaggio POD non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(viaggioPod);

  } catch (error) {
    console.error('Errore nel recupero del viaggio POD:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT: Aggiorna i dati di un viaggio POD
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('PUT Request - ID ricevuto:', id);
    
    // Controlla se il body è presente
    const contentType = request.headers.get('content-type');
    console.log('PUT Request - Content-Type:', contentType);
    
    const bodyText = await request.text();
    console.log('PUT Request - Body raw text:', bodyText);
    console.log('PUT Request - Body length:', bodyText.length);
    
    if (!bodyText || bodyText.trim() === '') {
      console.log('PUT Request - Errore: Body vuoto');
      return NextResponse.json(
        { error: 'Body della richiesta vuoto' },
        { status: 400 }
      );
    }
    
    let body;
    try {
      body = JSON.parse(bodyText);
      console.log('PUT Request - Body parsed:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.log('PUT Request - Errore parsing JSON:', parseError);
      return NextResponse.json(
        { error: 'Formato JSON non valido' },
        { status: 400 }
      );
    }

    if (!id) {
      console.log('PUT Request - Errore: ID mancante');
      return NextResponse.json(
        { error: 'ID viaggio POD richiesto' },
        { status: 400 }
      );
    }

    console.log('PUT Request - Verifica esistenza viaggio con ID:', Number(id));
    // Verifica che il viaggio POD esista
    const existingViaggio = await getViaggioPodById(Number(id));
    console.log('PUT Request - Viaggio esistente trovato:', existingViaggio ? 'Sì' : 'No');

    if (!existingViaggio) {
      console.log('PUT Request - Errore: Viaggio non trovato');
      return NextResponse.json(
        { error: 'Viaggio POD non trovato' },
        { status: 404 }
      );
    }

    // Rimuovi l'ID dal body per evitare di aggiornarlo
    const { ID, ...updateData } = body;
    console.log('PUT Request - Dati per aggiornamento:', JSON.stringify(updateData, null, 2));

    console.log('PUT Request - Chiamata updateViaggioPodData...');
    await updateViaggioPodData(Number(id), updateData);
    console.log('PUT Request - Aggiornamento completato con successo');

    return NextResponse.json({ 
      message: 'Viaggio POD aggiornato con successo',
      id: Number(id)
    });

  } catch (error) {
    console.error('PUT Request - Errore nell\'aggiornamento del viaggio POD:', error);
    console.error('PUT Request - Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE: Elimina un viaggio POD
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID viaggio POD richiesto' },
        { status: 400 }
      );
    }

    // Verifica che il viaggio POD esista
    const existingViaggio = await getViaggioPodById(Number(id));

    if (!existingViaggio) {
      return NextResponse.json(
        { error: 'Viaggio POD non trovato' },
        { status: 404 }
      );
    }

    await deleteViaggioPodData(Number(id));

    return NextResponse.json({ 
      message: 'Viaggio POD eliminato con successo',
      id: Number(id)
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione del viaggio POD:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}