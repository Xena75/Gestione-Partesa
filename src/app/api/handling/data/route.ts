import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestionelogistica',
  port: 3306
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
    
    // Validazione del campo di ordinamento per sicurezza
    const allowedSortFields = [
      'id', 'bu', 'div', 'dep', 'tipo_movimento', 'doc_acq', 
      'data_mov_m', 'tipo_imb', 'mese', 'doc_mat', 'qta_uma', 
      'tot_hand', 'rag_soc'
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
      mese: searchParams.get('mese')
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
        } else {
          whereConditions.push(`\`${key}\` = ?`);
          queryParams.push(value);
        }
      }
    });
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    connection = await mysql.createConnection(dbConfig);
    
    // Query per il conteggio totale
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM \`fatt_handling\` 
      ${whereClause}
    `;
    
    const [countRows] = await connection.execute(countQuery, queryParams);
    const total = Array.isArray(countRows) ? countRows[0].total : countRows.total;
    
    // Query per i dati con paginazione e ordinamento
    const dataQuery = `
      SELECT 
        \`id\`, \`bu\`, \`div\`, \`dep\`, \`tipo_movimento\`, \`doc_acq\`, 
        \`data_mov_m\`, \`tipo_imb\`, \`mese\`, \`doc_mat\`, \`qta_uma\`, 
        \`tot_hand\`, \`rag_soc\`
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