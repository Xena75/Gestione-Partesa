import { NextRequest, NextResponse } from 'next/server';
import { getImportProgress } from '@/lib/import-progress-db';

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

    console.log(`🔍 Richiesta progresso per fileId: ${fileId}`);
    
    const progress = await getImportProgress(fileId);
    
    if (!progress) {
      console.log(`❌ Progresso non trovato per fileId: ${fileId}`);
      return NextResponse.json(
        { error: 'Progresso non trovato' },
        { status: 404 }
      );
    }

    console.log(`📊 Progresso trovato:`, {
      progress: progress.progress,
      step: progress.currentStep,
      completed: progress.completed,
      hasResult: !!progress.result
    });

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Errore durante il recupero progresso:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero del progresso' },
      { status: 500 }
    );
  }
}
