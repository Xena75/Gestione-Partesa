// src/app/api/employees/[id]/profile-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateEmployee } from '@/lib/db-employees';
import { uploadProfileImage, deleteProfileImage, validateImageFile } from '@/lib/upload-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decodedId = decodeURIComponent(params.id);
    console.log('API profile-image POST chiamata per ID:', decodedId);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Nessun file fornito'
      }, { status: 400 });
    }

    // Validazione file utilizzando la utility
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    // Upload del file utilizzando la utility multi-ambiente
    const uploadResult = await uploadProfileImage(file, decodedId);
    
    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: uploadResult.error || 'Errore nel caricamento del file'
      }, { status: 500 });
    }

    // Aggiorna il database con l'URL della foto
    const success = await updateEmployee(decodedId, { foto_url: uploadResult.url });

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Errore nell\'aggiornamento del database'
      }, { status: 500 });
    }

    console.log('Foto profilo caricata con successo:', uploadResult.url);

    return NextResponse.json({
      success: true,
      message: 'Foto profilo caricata con successo',
      foto_url: uploadResult.url
    });

  } catch (error) {
    console.error('Errore API profile-image POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel caricamento della foto',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decodedId = decodeURIComponent(params.id);
    console.log('API profile-image DELETE chiamata per ID:', decodedId);
    
    // Ottieni l'URL della foto attuale dal body della richiesta
    const body = await request.json();
    const currentImageUrl = body.imageUrl;
    
    // Elimina il file fisico se presente
    if (currentImageUrl) {
      const deleteResult = await deleteProfileImage(currentImageUrl);
      if (!deleteResult.success) {
        console.warn('Errore nell\'eliminazione del file fisico:', deleteResult.error);
        // Continua comunque con l'aggiornamento del database
      }
    }
    
    // Rimuovi il riferimento alla foto dal database
    const success = await updateEmployee(decodedId, { foto_url: null });

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Errore nell\'aggiornamento del database'
      }, { status: 500 });
    }

    console.log('Foto profilo rimossa con successo per:', decodedId);

    return NextResponse.json({
      success: true,
      message: 'Foto profilo rimossa con successo'
    });

  } catch (error) {
    console.error('Errore API profile-image DELETE:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nella rimozione della foto',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}