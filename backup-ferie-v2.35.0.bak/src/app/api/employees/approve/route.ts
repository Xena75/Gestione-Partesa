// src/app/api/employees/leave/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateLeaveRequestStatus } from '@/lib/db-employees';

export async function PUT(request: NextRequest) {
  try {
    console.log('API leave approve PUT chiamata');
    
    const body = await request.json();
    
    // Validazione dati base
    if (!body.id || !body.status || !body.approved_by) {
      return NextResponse.json({
        success: false,
        error: 'id, status e approved_by sono obbligatori'
      }, { status: 400 });
    }
    
    // Validazione status
    if (!['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({
        success: false,
        error: 'Status deve essere approved o rejected'
      }, { status: 400 });
    }
    
    const success = await updateLeaveRequestStatus(
      body.id,
      body.status,
      body.approved_by,
      body.notes
    );
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Richiesta ferie non trovata'
      }, { status: 404 });
    }
    
    console.log('Richiesta ferie aggiornata con successo:', body.id);
    
    return NextResponse.json({
      success: true,
      message: `Richiesta ferie ${body.status === 'approved' ? 'approvata' : 'rifiutata'} con successo`
    });
    
  } catch (error) {
    console.error('Errore API leave approve:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nell\'aggiornamento della richiesta ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}