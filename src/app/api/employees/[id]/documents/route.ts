import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { 
  getEmployeeDocuments, 
  createEmployeeDocument, 
  deleteEmployeeDocument,
  getEmployeeById,
  updateDocumentStatus
} from '@/lib/db-employees';

// GET - Recupera tutti i documenti di un dipendente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);
    
    // Verifica che il dipendente esista
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna lo status dei documenti prima di recuperarli
    await updateDocumentStatus();
    
    const documents = await getEmployeeDocuments(employeeId);
    
    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Carica un nuovo documento
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);
    
    // Verifica che il dipendente esista
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const documentName = formData.get('document_name') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const notes = formData.get('notes') as string;
    const uploadedBy = formData.get('uploaded_by') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file fornito' },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { error: 'Tipo documento è obbligatorio' },
        { status: 400 }
      );
    }

    // Validazione tipi di documento comuni (ma accettiamo qualsiasi stringa)
    const commonDocumentTypes = [
      'patente_guida', 'carta_identita', 'codice_fiscale', 'contratto_lavoro',
      'certificato_medico', 'attestato_formazione', 'assicurazione_personale', 
      'permesso_soggiorno', 'altro'
    ];

    // Validazione dimensione file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File troppo grande. Dimensione massima: 10MB' },
        { status: 400 }
      );
    }

    // Validazione tipo file
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo file non supportato. Formati accettati: PDF, JPG, PNG, WebP' },
        { status: 400 }
      );
    }

    // Genera nome file univoco
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedEmployeeId = employeeId.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedDocType = documentType.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedEmployeeId}_${sanitizedDocType}_${timestamp}.${fileExtension}`;
    
    // Genera nome documento se non fornito
    const finalDocumentName = documentName || `${documentType.replace(/_/g, ' ').toUpperCase()} - ${employee.nome} ${employee.cognome}`;

    // Upload su Vercel Blob
    let blobUrl: string;
    try {
      const blob = await put(
        `documents/employees/${fileName}`,
        file,
        {
          access: 'public',
          addRandomSuffix: false
        }
      );
      blobUrl = blob.url;
    } catch (uploadError) {
      console.error('Errore upload Vercel Blob:', uploadError);
      return NextResponse.json(
        { error: 'Errore durante il caricamento del file' },
        { status: 500 }
      );
    }

    // Determina status iniziale
    let status = 'valido';
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      
      if (expiry < now) {
        status = 'scaduto';
      }
    }

    // Salva nel database
    const documentId = await createEmployeeDocument({
      employee_id: employeeId,
      document_type: documentType,
      document_name: finalDocumentName,
      file_path: blobUrl,
      file_name: fileName,
      file_size: file.size,
      file_type: file.type,
      expiry_date: expiryDate || undefined,
      status: status as any,
      notes: notes || undefined,
      uploaded_by: uploadedBy || undefined
    });

    return NextResponse.json({
      success: true,
      message: 'Documento caricato con successo',
      data: {
        id: documentId,
        file_url: blobUrl,
        file_name: fileName,
        status
      }
    });

  } catch (error) {
    console.error('Errore nel caricamento documento:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID documento richiesto' },
        { status: 400 }
      );
    }

    // Verifica che il dipendente esista
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    const success = await deleteEmployeeDocument(parseInt(documentId));
    
    if (!success) {
      return NextResponse.json(
        { error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Documento eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione documento:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}