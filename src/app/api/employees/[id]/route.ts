// src/app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeById, updateEmployee, deleteEmployee, Employee } from '@/lib/db-employees';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    // Decodifica l'URL per gestire spazi e caratteri speciali
    const decodedId = decodeURIComponent(resolvedParams.id);
    console.log('API employee GET chiamata per ID originale:', resolvedParams.id);
    console.log('API employee GET ID decodificato:', decodedId);
    
    const employee = await getEmployeeById(decodedId);
    
    if (!employee) {
      console.log('Dipendente non trovato per ID:', decodedId);
      return NextResponse.json({
        success: false,
        error: 'Dipendente non trovato'
      }, { status: 404 });
    }
    
    console.log('Dipendente recuperato con successo:', employee.id);
    
    return NextResponse.json({
      success: true,
      data: employee,
      message: 'Dipendente recuperato con successo'
    });
    
  } catch (error) {
    console.error('Errore API employee GET:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero del dipendente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    // Decodifica l'URL per gestire spazi e caratteri speciali
    const decodedId = decodeURIComponent(resolvedParams.id);
    console.log('API employee PUT chiamata per ID originale:', resolvedParams.id);
    console.log('API employee PUT ID decodificato:', decodedId);
    
    const body = await request.json();
    console.log('Dati ricevuti dal client:', body);
    
    // Rimuovi campi che non devono essere aggiornati
    const { id, created_at, updated_at, company_name, ...updateData } = body;
    console.log('Dati da aggiornare (dopo filtro):', updateData);
    
    const success = await updateEmployee(decodedId, updateData);
    
    if (!success) {
      console.log('Aggiornamento fallito - dipendente non trovato o nessuna modifica');
      return NextResponse.json({
        success: false,
        error: 'Dipendente non trovato o nessuna modifica effettuata'
      }, { status: 404 });
    }
    
    console.log('Dipendente aggiornato con successo:', decodedId);
    
    return NextResponse.json({
      success: true,
      message: 'Dipendente aggiornato con successo'
    });
    
  } catch (error) {
    console.error('Errore API employee PUT:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      error: 'Errore nell\'aggiornamento del dipendente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    // Decodifica l'URL per gestire spazi e caratteri speciali
    const decodedId = decodeURIComponent(resolvedParams.id);
    console.log('API employee DELETE chiamata per ID originale:', resolvedParams.id);
    console.log('API employee DELETE ID decodificato:', decodedId);
    
    const success = await deleteEmployee(decodedId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Dipendente non trovato'
      }, { status: 404 });
    }
    
    console.log('Dipendente eliminato con successo:', decodedId);
    
    return NextResponse.json({
      success: true,
      message: 'Dipendente eliminato con successo'
    });
    
  } catch (error) {
    console.error('Errore API employee DELETE:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      error: 'Errore nell\'eliminazione del dipendente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}