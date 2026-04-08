import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import { buildHandlingWhereParts } from '@/lib/handling-filters-where';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parametri di paginazione (LIMIT/OFFSET come interi: MySQL 8 + prepared statements → ER_WRONG_ARGUMENTS)
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(Number(rawLimit)) || 50));
    const safePage = Math.max(1, Math.trunc(Number(rawPage)) || 1);
    const safeOffset = Math.min(50_000_000, Math.max(0, (safePage - 1) * safeLimit));
    
    // Parametri di ordinamento
    const sortField = searchParams.get('sortField') || 'id';
    const sortDirection = searchParams.get('sortDirection') || 'asc';
    
    // Tipo di vista (raggruppata o dettagliata)
    const viewType = searchParams.get('viewType') || 'detailed';
    
    // Validazione del campo di ordinamento per sicurezza
    const allowedSortFields = [
      'id', 'bu', 'div', 'dep', 'tipo_movimento', 'doc_acq', 
      'data_mov_m', 'tipo_imb', 'mese', 'doc_mat', 'qta_uma', 
      'tot_hand', 'rag_soc', 't_hf_umv', 'imp_hf_um', 'imp_resi_v', 'imp_doc', 'articoli_count'
    ];
    
    const validSortField = allowedSortFields.includes(sortField) ? sortField : 'id';
    const validSortDirection = ['asc', 'desc'].includes(sortDirection.toLowerCase()) ? sortDirection.toLowerCase() : 'asc';
    
    const { conditions: whereConditions, params: queryParams } =
      buildHandlingWhereParts(searchParams);
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // Query per il conteggio totale in base al tipo di vista
    const countQuery = viewType === 'grouped' 
      ? `
        SELECT COUNT(DISTINCT \`doc_mat\`) as total 
        FROM \`fatt_handling\` 
        ${whereClause}
      `
      : `
        SELECT COUNT(*) as total 
        FROM \`fatt_handling\` 
        ${whereClause}
      `;
    
    const [countRows] = await pool.execute(countQuery, queryParams);
    const total = Array.isArray(countRows) ? (countRows[0] as any).total : (countRows as any).total;
    
    // Query per i dati con paginazione e ordinamento, in base al tipo di vista
    const dataQuery = viewType === 'grouped'
      ? `
        SELECT 
          MIN(\`id\`) as id, \`bu\`, \`div\`, \`dep\`, \`tipo_movimento\`, \`doc_acq\`, 
          \`data_mov_m\`, \`tipo_imb\`, \`mese\`, \`doc_mat\`, SUM(\`qta_uma\`) as qta_uma, 
          SUM(\`tot_hand\`) as tot_hand, \`rag_soc\`, AVG(\`t_hf_umv\`) as t_hf_umv, 
          SUM(\`imp_hf_um\`) as imp_hf_um, SUM(\`imp_resi_v\`) as imp_resi_v, SUM(\`imp_doc\`) as imp_doc,
          COUNT(DISTINCT \`materiale\`) as articoli_count
        FROM \`fatt_handling\` 
        ${whereClause}
        GROUP BY \`doc_mat\`
        ORDER BY \`${validSortField}\` ${validSortDirection}
        LIMIT ${safeLimit} OFFSET ${safeOffset}
      `
      : `
        SELECT * 
        FROM \`fatt_handling\` 
        ${whereClause}
        ORDER BY \`${validSortField}\` ${validSortDirection}
        LIMIT ${safeLimit} OFFSET ${safeOffset}
      `;
    
    const [dataRows] = await pool.execute(dataQuery, queryParams);
    
    const totalPages = Math.ceil(total / safeLimit);
    
    return NextResponse.json({
      data: dataRows,
      total: Number(total),
      page: safePage,
      limit: safeLimit,
      totalPages: totalPages
    });
    
  } catch (error) {
    console.error('Errore nel caricamento dei dati handling:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}