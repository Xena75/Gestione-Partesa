import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { 
  getEmployeeDocuments, 
  createEmployeeDocument, 
  deleteEmployeeDocument,
  getEmployeeById,
  getEmployeeByUsername,
  updateDocumentStatus,
  updateEmployeeDocument,
  getEmployeeDocumentById
} from '@/lib/db-employees';

// GET - Recupera tutti i documenti di un dipendente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);
    
    console.log('API GET documents - Employee ID ricevuto:', employeeId);
    
    // Cerca il dipendente prima per ID, poi per username
    let employee = await getEmployeeById(employeeId);
    if (!employee) {
      employee = await getEmployeeByUsername(employeeId);
    }
    
    console.log('API GET documents - Employee trovato:', employee ? 'SI' : 'NO');
    if (!employee) {
      console.log('API GET documents - Dipendente non trovato per ID/username:', employeeId);
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna lo status dei documenti prima di recuperarli
    await updateDocumentStatus();
    
    const documents = await getEmployeeDocuments(employee.id);
    
    // Raggruppa i documenti multipli (fronte/retro) come un unico documento
    // Raggruppa SOLO i documenti che hanno esplicitamente "(Fronte)" o "(Retro)" nel nome
    // Documenti diversi dello stesso tipo con stessa scadenza NON vengono raggruppati
    const documentGroups = new Map<string, typeof documents>();
    
    documents.forEach(doc => {
      // Controlla se il documento ha "(Fronte)" o "(Retro)" nel nome
      const hasFrontBackMarker = /\(Fronte\)|\(Retro\)|\(Parte \d+\)/gi.test(doc.document_name);
      
      if (hasFrontBackMarker) {
        // Solo per documenti con marcatori fronte/retro: raggruppa per tipo, scadenza e nome base
        const baseName = doc.document_name.replace(/ \(Fronte\)| \(Retro\)| \(Parte \d+\)/gi, '').trim();
        const groupKey = `${doc.employee_id}_${doc.document_type}_${doc.expiry_date || 'no_expiry'}_${baseName}`;
        
        if (!documentGroups.has(groupKey)) {
          documentGroups.set(groupKey, []);
        }
        documentGroups.get(groupKey)!.push(doc);
      } else {
        // Per documenti senza marcatori: crea una chiave univoca per ogni documento
        // Usa l'ID del documento per garantire unicità
        const uniqueKey = `${doc.employee_id}_${doc.document_type}_${doc.expiry_date || 'no_expiry'}_${doc.id}`;
        documentGroups.set(uniqueKey, [doc]);
      }
    });
    
    // Per ogni gruppo, prendi solo il primo documento (quello più recente)
    const uniqueDocuments = Array.from(documentGroups.values()).map(group => {
      // Ordina per data di creazione (più recente prima) e prendi il primo
      const sortedGroup = group.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      const mainDoc = sortedGroup[0];
      
      // Se ci sono più file nel gruppo, aggiungi informazioni sui file multipli
      return {
        ...mainDoc,
        isMultiFile: group.length > 1,
        fileCount: group.length,
        allFiles: group.length > 1 ? group.map(d => ({
          id: d.id,
          file_name: d.file_name,
          file_path: d.file_path,
          part: d.document_name.match(/\(Fronte\)|\(Retro\)|\(Parte (\d+)\)/i)?.[0] || 'Parte 1'
        })) : undefined
      };
    });
    
    // Calcola giorni_alla_scadenza per ogni documento
    const documentsWithDays = uniqueDocuments.map(doc => {
      let giorni_alla_scadenza: number | undefined;
      if (doc.expiry_date) {
        const expiryDate = new Date(doc.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        giorni_alla_scadenza = diffDays;
      }
      return {
        ...doc,
        giorni_alla_scadenza,
        document_name: doc.document_name.replace(/ \(Fronte\)| \(Retro\)| \(Parte \d+\)/gi, '').trim()
      };
    });
    
    return NextResponse.json({
      success: true,
      data: documentsWithDays,
      count: documentsWithDays.length
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = decodeURIComponent(resolvedParams.id);
    
    console.log('API POST documents - Employee ID ricevuto:', employeeId);
    
    // Cerca il dipendente prima per ID, poi per username
    let employee = await getEmployeeById(employeeId);
    if (!employee) {
      employee = await getEmployeeByUsername(employeeId);
    }
    
    console.log('API POST documents - Employee trovato:', employee ? 'SI' : 'NO');
    if (!employee) {
      console.log('API POST documents - Dipendente non trovato per ID/username:', employeeId);
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const documentType = formData.get('document_type') as string;
    const documentName = formData.get('document_name') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const notes = formData.get('notes') as string;
    const uploadedBy = formData.get('uploaded_by') as string;
    
    // Supporta sia 'file' (singolo) che 'files' (multipli)
    const singleFile = formData.get('file') as File | null;
    const multipleFiles = formData.getAll('files') as File[];
    
    const files = multipleFiles.length > 0 ? multipleFiles : (singleFile ? [singleFile] : []);

    if (files.length === 0) {
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

    // Validazione dimensione file (max 10MB per file)
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} troppo grande. Dimensione massima: 10MB per file` },
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
          { error: `File ${file.name}: tipo non supportato. Formati accettati: PDF, JPG, PNG, WebP` },
          { status: 400 }
        );
      }
    }

    // SOLUZIONE SEMPLICE: salva i file separatamente con lo stesso nome documento e scadenza
    // Nel frontend verranno raggruppati insieme quando visualizzati
    const timestamp = Date.now();
    const sanitizedEmployeeId = employeeId.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedDocType = documentType.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Genera nome documento se non fornito
    const finalDocumentName = documentName || `${documentType.replace(/_/g, ' ').toUpperCase()} - ${employee.nome} ${employee.cognome}`;

    // Determina status iniziale
    let status = 'valido';
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      
      if (expiry < now) {
        status = 'scaduto';
      }
    }

    // Carica tutti i file separatamente su Vercel Blob e salvali nel database
    const uploadedDocuments: any[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.split('.').pop();
      
      // Genera nome file univoco per ogni file
      const fileName = files.length > 1 
        ? `${sanitizedEmployeeId}_${sanitizedDocType}_${timestamp}_part${i + 1}.${fileExtension}`
        : `${sanitizedEmployeeId}_${sanitizedDocType}_${timestamp}.${fileExtension}`;
      
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
          { error: `Errore durante il caricamento del file ${i + 1}: ${file.name}` },
          { status: 500 }
        );
      }

      // Salva nel database con lo stesso nome documento e scadenza
      const documentId = await createEmployeeDocument({
        employee_id: employee.id,
        document_type: documentType,
        document_name: files.length > 1 
          ? `${finalDocumentName} (${i === 0 ? 'Fronte' : i === 1 ? 'Retro' : `Parte ${i + 1}`})`
          : finalDocumentName,
        file_path: blobUrl,
        file_name: fileName,
        file_size: file.size,
        file_type: file.type,
        expiry_date: expiryDate || undefined,
        status: status as any,
        notes: notes || undefined,
        uploaded_by: uploadedBy || undefined
      });

      uploadedDocuments.push({
        id: documentId,
        document_type: documentType,
        document_name: files.length > 1 
          ? `${finalDocumentName} (${i === 0 ? 'Fronte' : i === 1 ? 'Retro' : `Parte ${i + 1}`})`
          : finalDocumentName,
        file_path: blobUrl,
        file_name: fileName,
        file_size: file.size,
        file_type: file.type,
        expiry_date: expiryDate || undefined,
        status: status,
        notes: notes || undefined,
        uploaded_by: uploadedBy || undefined
      });
    }

    return NextResponse.json({
      success: true,
      message: files.length > 1 
        ? `${files.length} file caricati con successo come documento multiplo` 
        : 'Documento caricato con successo',
      data: uploadedDocuments.length === 1 ? uploadedDocuments[0] : uploadedDocuments,
      isMultiFile: files.length > 1
    });

  } catch (error) {
    console.error('Errore nel caricamento documento:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Cerca il dipendente prima per ID, poi per username
    let employee = await getEmployeeById(employeeId);
    if (!employee) {
      employee = await getEmployeeByUsername(employeeId);
    }
    
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

// PUT - Aggiorna un documento esistente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Cerca il dipendente prima per ID, poi per username
    let employee = await getEmployeeById(employeeId);
    if (!employee) {
      employee = await getEmployeeByUsername(employeeId);
    }
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    // Verifica che il documento esista
    const existingDocument = await getEmployeeDocumentById(parseInt(documentId));
    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string;
    const documentName = formData.get('document_name') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const notes = formData.get('notes') as string;

    // Prepara i dati per l'aggiornamento
    const updateData: any = {};

    if (documentType) updateData.document_type = documentType;
    if (documentName) updateData.document_name = documentName;
    if (expiryDate) updateData.expiry_date = expiryDate;
    if (notes !== undefined) updateData.notes = notes || null;

    // Se è stato fornito un nuovo file, caricalo
    if (file) {
      // Validazione dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File troppo grande. Dimensione massima: 10MB' },
          { status: 400 }
        );
      }

      // Validazione tipo file
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Tipo di file non supportato. Usa PDF, JPG o PNG' },
          { status: 400 }
        );
      }

      try {
        // Carica il nuovo file su Vercel Blob
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const blob = await put(fileName, file, {
          access: 'public',
        });

        // Aggiorna i dati del file
        updateData.file_path = blob.url;
        updateData.file_name = file.name;
        updateData.file_size = file.size;
        updateData.file_type = file.type;

      } catch (uploadError) {
        console.error('Errore upload file:', uploadError);
        return NextResponse.json(
          { error: 'Errore durante il caricamento del file' },
          { status: 500 }
        );
      }
    }

    // Aggiorna il documento nel database
    const success = await updateEmployeeDocument(parseInt(documentId), updateData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento del documento' },
        { status: 500 }
      );
    }

    // Aggiorna lo status dei documenti
    await updateDocumentStatus();

    return NextResponse.json({
      success: true,
      message: 'Documento aggiornato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento documento:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}