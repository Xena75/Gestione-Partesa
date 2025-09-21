import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Parametro id mancante' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 API Handling Details - id: ${id}`);
    
    // Query per ottenere i dettagli dell'handling dalla tabella principale
    const [details] = await pool.execute(`
      SELECT 
        id,
        CAST(pos AS CHAR) AS pos,
        materiale AS cod_articolo,
        descrizione_materiale AS descr_articolo,
        qta_uma AS colli,
        comp,
        tipo_imb,
        t_hf_umv,
        imp_hf_um,
        imp_resi_v,
        imp_doc,
        tot_hand,
        mag
      FROM fatt_handling
      WHERE doc_mat = ?
      ORDER BY pos ASC
    `, [id]);
    
    console.log(`✅ API Handling Details - ${(details as any[]).length} record trovati`);
    
    return NextResponse.json(details);
    
  } catch (error) {
    console.error('❌ Errore API handling details:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}