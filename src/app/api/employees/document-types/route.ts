import { NextRequest, NextResponse } from 'next/server';
import { getDistinctDocumentTypes } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const documentTypes = await getDistinctDocumentTypes();
    return NextResponse.json({
      success: true,
      data: documentTypes
    });
  } catch (error) {
    console.error('Errore nel recupero dei tipi di documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei tipi di documento' },
      { status: 500 }
    );
  }
}

