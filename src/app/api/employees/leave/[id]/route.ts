import { NextRequest, NextResponse } from 'next/server';
import { updateLeaveRequest, deleteLeaveRequest } from '@/lib/db-employees';
import { put } from '@vercel/blob';

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

    // Gestisci sia JSON che FormData (per upload file)
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let attachmentFile: File | null = null;
    let attachmentUrl: string | null | undefined = undefined;
    let deleteAttachment = false;

    if (contentType.includes('multipart/form-data')) {
      // Richiesta con FormData (include file)
      const formData = await request.formData();
      
      // Estrai i dati del form
      body = {
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        leave_type: formData.get('leave_type') as string,
        hours: formData.get('hours') ? parseFloat(formData.get('hours') as string) : undefined,
        notes: formData.get('notes') as string
      };
      
      // Controlla se deve eliminare l'allegato
      const deleteAttachmentFlag = formData.get('delete_attachment');
      if (deleteAttachmentFlag === 'true') {
        deleteAttachment = true;
        attachmentUrl = null;
      } else {
        // Estrai il file se presente
        attachmentFile = formData.get('attachment') as File | null;
        
        // Se c'è un file, caricalo su Vercel Blob
        if (attachmentFile && attachmentFile.size > 0) {
          // Validazione tipo file
          const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
          ];
          
          if (!allowedTypes.includes(attachmentFile.type)) {
            return NextResponse.json({
              error: 'Tipo file non supportato. Formati accettati: PDF, JPG, PNG, WebP'
            }, { status: 400 });
          }
          
          // Validazione dimensione (max 10MB)
          if (attachmentFile.size > 10 * 1024 * 1024) {
            return NextResponse.json({
              error: 'File troppo grande. Dimensione massima: 10MB'
            }, { status: 400 });
          }
          
          try {
            // Genera nome file univoco
            const timestamp = Date.now();
            const sanitizedFileName = attachmentFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `leave_requests/${timestamp}_${sanitizedFileName}`;
            
            // Upload su Vercel Blob
            const blob = await put(fileName, attachmentFile, {
              access: 'public',
              addRandomSuffix: false
            });
            
            attachmentUrl = blob.url;
          } catch (uploadError) {
            console.error('Errore upload file:', uploadError);
            return NextResponse.json({
              error: 'Errore durante il caricamento del file'
            }, { status: 500 });
          }
        }
      }
    } else {
      // Richiesta JSON standard (senza file)
      body = await request.json();
      
      // Controlla se deve eliminare l'allegato
      if (body.delete_attachment === true) {
        deleteAttachment = true;
        attachmentUrl = null;
      }
    }

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
    
    // Gestisci attachment_url: se deleteAttachment è true, passa null; se c'è un nuovo file, passa l'URL; altrimenti non modificare
    if (deleteAttachment) {
      updateData.attachment_url = null;
    } else if (attachmentUrl !== undefined) {
      updateData.attachment_url = attachmentUrl;
    }

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