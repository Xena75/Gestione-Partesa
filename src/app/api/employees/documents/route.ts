import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getEmployeeDocuments, createEmployeeDocument, EmployeeDocument } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const expiring = searchParams.get('expiring') === 'true';
    
    // Se l'utente è employee, può vedere solo i propri documenti
    let targetUserId = userId;
    if (userCheck.user?.role === 'employee') {
      targetUserId = userCheck.user.id;
    }
    
    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'ID utente non fornito'
      }, { status: 400 });
    }
    
    console.log('Recupero documenti per dipendente ID:', targetUserId);
    
    const documents = await getEmployeeDocuments(targetUserId, expiring);
    
    console.log(`Recuperati ${documents.length} documenti per dipendente ${targetUserId}`);
    
    return NextResponse.json({
      success: true,
      data: documents,
      message: 'Documenti recuperati con successo'
    });
    
  } catch (error) {
    console.error('Errore API employees/documents GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dei documenti',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, document_type, document_number, issue_date, expiry_date, notes } = body;
    
    // Se l'utente è employee, può creare documenti solo per se stesso
    let targetUserId = user_id;
    if (userCheck.user?.role === 'employee') {
      targetUserId = userCheck.user.id;
    }
    
    if (!targetUserId || !document_type) {
      return NextResponse.json({
        success: false,
        error: 'Dati mancanti: user_id e document_type sono obbligatori'
      }, { status: 400 });
    }
    
    const documentData: Partial<EmployeeDocument> = {
      employee_id: targetUserId,
      document_type,
      document_number,
      issue_date: issue_date ? new Date(issue_date) : undefined,
      expiry_date: expiry_date ? new Date(expiry_date) : undefined,
      notes
    };
    
    const newDocument = await createEmployeeDocument(documentData);
    
    return NextResponse.json({
      success: true,
      data: newDocument,
      message: 'Documento creato con successo'
    });
    
  } catch (error) {
    console.error('Errore API employees/documents POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nella creazione del documento',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}