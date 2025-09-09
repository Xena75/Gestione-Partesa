import { NextRequest, NextResponse } from 'next/server';
import { getImportProgress } from '@/lib/import-progress-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    console.log(`🔍 Richiesta progresso per fileId: ${fileId}`);

    if (!fileId) {
      console.log('❌ File ID mancante');
      return NextResponse.json({ error: 'File ID è obbligatorio' }, { status: 400 });
    }

    const progress = await getImportProgress(fileId);
    console.log(`📊 Progresso trovato:`, progress ? 'SÌ' : 'NO');

    if (!progress) {
      console.log(`❌ Progresso non trovato per fileId: ${fileId}`);
      return NextResponse.json({ error: 'Progresso non trovato' }, { status: 404 });
    }

    console.log(`✅ Restituisco progresso per ${fileId}:`, {
      progress: progress.progress,
      completed: progress.completed,
      currentStep: progress.currentStep
    });

    return NextResponse.json(progress);

  } catch (error) {
    console.error('❌ Errore nel recupero del progresso:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero del progresso' },
      { status: 500 }
    );
  }
}
