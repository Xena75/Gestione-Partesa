import { NextRequest, NextResponse } from 'next/server';

// Importa la Map del progresso dall'endpoint execute
// In produzione, questo dovrebbe essere in un database o Redis
const importProgress = new Map<string, {
  progress: number;
  currentStep: string;
  completed: boolean;
  result?: {
    success: boolean;
    totalRows: number;
    importedRows: number;
    errors: string[];
    sessionId: string;
    duration: number;
  };
}>();

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

    // Simula il progresso per il testing
    // In produzione, questo dovrebbe leggere da database/Redis
    const progress = importProgress.get(fileId) || {
      progress: 0,
      currentStep: 'Inizializzazione...',
      completed: false
    };

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Errore durante il recupero progresso:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero del progresso' },
      { status: 500 }
    );
  }
}
