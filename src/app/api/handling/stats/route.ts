import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import { buildHandlingWhereParts } from '@/lib/handling-filters-where';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const { conditions: whereConditions, params: queryParams } =
      buildHandlingWhereParts(searchParams);
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // Query per le statistiche
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT \`doc_mat\`) as doc_mat_count,
        COALESCE(SUM(\`qta_uma\`), 0) as qta_uma_sum,
        COALESCE(SUM(\`tot_hand\`), 0) as tot_hand_sum,
        COUNT(DISTINCT \`rag_soc\`) as rag_soc_count,
        COALESCE(SUM(\`imp_hf_um\`), 0) as imp_hf_um_sum,
        COALESCE(SUM(\`imp_resi_v\`), 0) as imp_resi_v_sum,
        COALESCE(SUM(\`imp_doc\`), 0) as imp_doc_sum
      FROM \`fatt_handling\` 
      ${whereClause}
    `;
    
    const [rows] = await pool.execute(statsQuery, queryParams);
    const stats = Array.isArray(rows) ? rows[0] as any : rows as any;

    return NextResponse.json({
      doc_mat_count: Number(stats.doc_mat_count) || 0,
      qta_uma_sum: Number(stats.qta_uma_sum) || 0,
      tot_hand_sum: Number(stats.tot_hand_sum) || 0,
      rag_soc_count: Number(stats.rag_soc_count) || 0,
      imp_hf_um_sum: Number(stats.imp_hf_um_sum) || 0,
      imp_resi_v_sum: Number(stats.imp_resi_v_sum) || 0,
      imp_doc_sum: Number(stats.imp_doc_sum) || 0
    });
    
  } catch (error) {
    console.error('Errore nel caricamento delle statistiche handling:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}