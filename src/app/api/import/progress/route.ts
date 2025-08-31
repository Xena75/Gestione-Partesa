import { NextRequest, NextResponse } from 'next/server';
import { importProgress } from '@/lib/import-progress';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID mancante' },
        { status: 400 }
      );
    }

    const progress = importProgress.get(fileId);
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Progresso non trovato' },
        { status: 404 }
      );
    }

    console.log(`📊 API Progress ${fileId}:`, {
      progress: progress.progress,
      step: progress.currentStep,
      completed: progress.completed,
      hasResult: !!progress.result
    });

    // Debug: mostra tutti i fileId nella Map
    console.log('📋 Tutti i fileId nella Map:', Array.from(importProgress.keys()));

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Errore durante il recupero progresso:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero del progresso' },
      { status: 500 }
    );
  }
}
