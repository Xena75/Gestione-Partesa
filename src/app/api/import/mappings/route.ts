import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 API Mappings - Inizio richiesta GET');
    
    // Per ora restituisci sempre un array vuoto per testare
    return NextResponse.json({
      success: true,
      mappings: [],
      message: 'Test API - Nessun mapping salvato'
    });
    
  } catch (error) {
    console.error('❌ Errore generale durante il recupero mapping:', error);
    return NextResponse.json({
      success: true,
      mappings: [],
      message: 'Errore generale, nessun mapping salvato'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API Mappings - Inizio richiesta POST');
    
    const body = await request.json();
    const { name, description, mapping_data } = body;

    if (!name || !mapping_data) {
      return NextResponse.json(
        { error: 'Nome e mapping_data sono obbligatori' },
        { status: 400 }
      );
    }

    // Per ora restituisci successo senza salvare
    return NextResponse.json({
      success: true,
      mapping: {
        id: 1,
        name,
        description: description || '',
        mapping_data: JSON.stringify(mapping_data),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      message: 'Test API - Mapping simulato'
    });
    
  } catch (error) {
    console.error('❌ Errore generale durante il salvataggio mapping:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il salvataggio del mapping' },
      { status: 500 }
    );
  }
}
