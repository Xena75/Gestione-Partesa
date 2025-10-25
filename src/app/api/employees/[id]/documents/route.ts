// src/app/api/employees/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeDocuments, createEmployeeDocument, EmployeeDocument } from '@/lib/db-employees';
import { put } from '@vercel/blob';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API employee documents GET chiamata per ID:', params.id);
    
    const documents = await getEmployeeDocuments(params.id);
    
    console.log('Documenti recuperati con successo:', documents.length);
    
    return NextResponse.json({
      success: true,
      data: documents,
      message: 'Documenti recuperati con successo'
    });
    
  } catch (error) {
    console.error('Errore API employee documents GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dei documenti',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API employee documents POST chiamata per ID:', params.id);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const notes = formData.get('notes') as string;
    const uploadedBy = formData.get('uploaded_by') as string;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File è obbligatorio'
      }, { status: 400 });
    }
    
    if (!documentType) {
      return NextResponse.json({
        success: false,
        error: 'Tipo documento è obbligatorio'
      }, { status: 400 });
    }
    
    if (!uploadedBy) {
      return NextResponse.json({
        success: false,
        error: 'Utente che carica è obbligatorio'
      }, { status: 400 });
    }
    
    // Validazione tipo documento
    const validTypes = ['patente', 'carta_identita', 'codice_fiscale', 'contratto', 'certificato_medico', 'altro'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json({
        success: false,
        error: 'Tipo documento non valido'
      }, { status: 400 });
    }
    
    // Upload su Vercel Blob
    const fileName = `employees/${params.id}/${documentType}_${Date.now()}_${file.name}`;
    const blob = await put(fileName, file, {
      access: 'public',
    });
    
    // Salva nel database
    const documentData: Omit<EmployeeDocument, 'id' | 'created_at' | 'updated_at'> = {
      employee_id: params.id,
      document_type: documentType as any,
      document_name: file.name,
      file_path: blob.url,
      file_size: file.size,
      expiry_date: expiryDate || null,
      upload_date: new Date().toISOString(),
      uploaded_by: uploadedBy,
      notes: notes || null,
      is_active: true
    };
    
    const documentId = await createEmployeeDocument(documentData);
    
    console.log('Documento creato con successo:', documentId);
    
    return NextResponse.json({
      success: true,
      data: { 
        id: documentId,
        file_url: blob.url 
      },
      message: 'Documento caricato con successo'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Errore API employee documents POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel caricamento del documento',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}