import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica'
};

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Ottieni il tipo di vista (raggruppata o dettagliata)
    const viewType = searchParams.get('viewType') || 'grouped';
    
    // Costruisci la query WHERE basata sui filtri
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    
    // Filtri disponibili
    const filters = {
      bu: searchParams.get('bu'),
      div: searchParams.get('div'),
      dep: searchParams.get('dep'),
      tipo_movimento: searchParams.get('tipo_movimento'),
      doc_acq: searchParams.get('doc_acq'),
      data_mov_m: searchParams.get('data_mov_m'),
      tipo_imb: searchParams.get('tipo_imb'),
      mese: searchParams.get('mese'),
      anno: searchParams.get('anno')
    };
    
    // Aggiungi condizioni WHERE per ogni filtro
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'Tutti' && value !== 'Tutte' && value !== '') {
        if (key === 'doc_acq') {
          whereConditions.push(`\`${key}\` LIKE ?`);
          queryParams.push(`%${value}%`);
        } else if (key === 'data_mov_m') {
          whereConditions.push(`DATE(\`${key}\`) = ?`);
          queryParams.push(value);
        } else if (key === 'mese') {
          // Usa mese_fatturazione se disponibile, altrimenti mese (basato su data_mov_m)
          whereConditions.push('(mese_fatturazione = ? OR (mese_fatturazione IS NULL AND mese = ?))');
          queryParams.push(parseInt(value), parseInt(value));
        } else if (key === 'anno') {
          // Usa anno_fatturazione se disponibile, altrimenti YEAR(data_mov_m)
          whereConditions.push('(anno_fatturazione = ? OR (anno_fatturazione IS NULL AND YEAR(data_mov_m) = ?))');
          queryParams.push(parseInt(value), parseInt(value));
        } else {
          whereConditions.push(`\`${key}\` = ?`);
          queryParams.push(value);
        }
      }
    });
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    connection = await mysql.createConnection(dbConfig);
    
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
    
    const [rows] = await connection.execute(statsQuery, queryParams);
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}