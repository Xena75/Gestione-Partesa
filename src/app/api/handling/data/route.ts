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
    
    // Parametri di paginazione
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
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
    
    const [countRows] = await connection.execute(countQuery, queryParams);
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
        LIMIT ? OFFSET ?
      `
      : `
        SELECT * 
        FROM \`fatt_handling\` 
        ${whereClause}
        ORDER BY \`${validSortField}\` ${validSortDirection}
        LIMIT ? OFFSET ?
      `;
    
    const dataParams = [...queryParams, limit, offset];
    const [dataRows] = await connection.execute(dataQuery, dataParams);
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      data: dataRows,
      total: Number(total),
      page: page,
      limit: limit,
      totalPages: totalPages
    });
    
  } catch (error) {
    console.error('Errore nel caricamento dei dati handling:', error);
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