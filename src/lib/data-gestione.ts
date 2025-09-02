// src/lib/data-gestione.ts
import pool from './db-gestione';

export type FatturaDelivery = {
  id: number;
  consegna_num: string;
  data_mov_merce: string;
  viaggio: string;
  dep: string;
  ordine: string;
  descr_vettore: string;
  tipologia: string;
  ragione_sociale: string;
  cod_cliente: string;
  cod_articolo: string;
  descr_articolo: string;
  colli: number;
  tariffa: number;
  tariffa_vuoti: number;
  compenso: number;
  tr_cons: number;
  tot_compenso: number;
  bu: string;
  div: string;
  classe_prod: string;
  classe_tariffa: string;
};

export type DeliveryStats = {
  totalConsegne: number;
  totalViaggi: number;
  totalColli: number;
  totalCompenso: number;
  totalCorrispettivi: number;
  totalFatturato: number;
};

export type DeliveryFilters = {
  viaggio?: string;
  ordine?: string;
  bu?: string;
  divisione?: string;
  deposito?: string;
  vettore?: string;
  tipologia?: string;
  codCliente?: string;
  cliente?: string;
  dataDa?: string;
  dataA?: string;
};

export type DeliverySort = {
  field: string;
  order: 'ASC' | 'DESC';
};

// Definiamo il numero di risultati per pagina
const ITEMS_PER_PAGE = 50;

// Funzione per ottenere statistiche dashboard
export async function getDeliveryStats(filters?: DeliveryFilters): Promise<DeliveryStats> {
  try {
    let whereClause = '';
    let queryParams: any[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const conditions: string[] = [];
      
      if (filters.viaggio) {
        conditions.push('viaggio LIKE ?');
        queryParams.push(`%${filters.viaggio}%`);
      }
      if (filters.ordine) {
        conditions.push('ordine LIKE ?');
        queryParams.push(`%${filters.ordine}%`);
      }
      if (filters.bu && filters.bu !== 'Tutti') {
        conditions.push('bu = ?');
        queryParams.push(filters.bu);
      }
      if (filters.divisione && filters.divisione !== 'Tutte') {
        conditions.push('`div` = ?');
        queryParams.push(filters.divisione);
      }
      if (filters.deposito && filters.deposito !== 'Tutti') {
        conditions.push('dep = ?');
        queryParams.push(filters.deposito);
      }
      if (filters.vettore && filters.vettore !== 'Tutti') {
        conditions.push('descr_vettore = ?');
        queryParams.push(filters.vettore);
      }
      if (filters.tipologia && filters.tipologia !== 'Tutte') {
        conditions.push('tipologia = ?');
        queryParams.push(filters.tipologia);
      }
      if (filters.codCliente) {
        conditions.push('cod_cliente LIKE ?');
        queryParams.push(`%${filters.codCliente}%`);
      }
      if (filters.cliente) {
        conditions.push('ragione_sociale LIKE ?');
        queryParams.push(`%${filters.cliente}%`);
      }
      if (filters.dataDa) {
        conditions.push('data_mov_merce >= ?');
        queryParams.push(filters.dataDa);
      }
      if (filters.dataA) {
        conditions.push('data_mov_merce <= ?');
        queryParams.push(filters.dataA);
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Query per statistiche con filtri - CORRETTA per totalFatturato
    const statsSql = `
      SELECT 
        COUNT(DISTINCT consegna_num) as totalConsegne,
        COUNT(DISTINCT viaggio) as totalViaggi,
        SUM(colli) as totalColli,
        SUM(compenso) as totalCompenso,
        IFNULL(SUM(tr_cons), 0) as totalCorrispettivi,
        IFNULL(SUM(tot_compenso), 0) as totalFatturato
      FROM fatt_delivery 
      ${whereClause}
    `;

    const [statsResult] = await pool.query(statsSql, queryParams);
    const stats = statsResult as DeliveryStats[];

    return {
      totalConsegne: Number(stats[0]?.totalConsegne) || 0,
      totalViaggi: Number(stats[0]?.totalViaggi) || 0,
      totalColli: Number(stats[0]?.totalColli) || 0,
      totalCompenso: Number(stats[0]?.totalCompenso) || 0,
      totalCorrispettivi: Number(stats[0]?.totalCorrispettivi) || 0,
      totalFatturato: Number(stats[0]?.totalFatturato) || 0
    };
  } catch (error) {
    console.error('Errore nel recuperare le statistiche delivery:', error);
    // Fallback con valori di default
    return {
      totalConsegne: 0,
      totalViaggi: 0,
      totalColli: 0,
      totalCompenso: 0,
      totalCorrispettivi: 0,
      totalFatturato: 0
    };
  }
}

// Funzione per ottenere dati con filtri e ordinamento
export async function getDeliveryData(
  currentPage: number, 
  filters?: DeliveryFilters, 
  sort?: DeliverySort
): Promise<{ fatture: FatturaDelivery[], totalPages: number, totalItems: number }> {
  try {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    let whereClause = '';
    let queryParams: any[] = [];

    // Costruisci WHERE clause per i filtri
    if (filters && Object.keys(filters).length > 0) {
      const conditions: string[] = [];
      
      if (filters.viaggio) {
        conditions.push('viaggio LIKE ?');
        queryParams.push(`%${filters.viaggio}%`);
      }
      if (filters.ordine) {
        conditions.push('ordine LIKE ?');
        queryParams.push(`%${filters.ordine}%`);
      }
      if (filters.bu && filters.bu !== 'Tutti') {
        conditions.push('bu = ?');
        queryParams.push(filters.bu);
      }
      if (filters.divisione && filters.divisione !== 'Tutte') {
        conditions.push('`div` = ?');
        queryParams.push(filters.divisione);
      }
      if (filters.deposito && filters.deposito !== 'Tutti') {
        conditions.push('dep = ?');
        queryParams.push(filters.deposito);
      }
      if (filters.vettore && filters.vettore !== 'Tutti') {
        conditions.push('descr_vettore = ?');
        queryParams.push(filters.vettore);
      }
      if (filters.tipologia && filters.tipologia !== 'Tutte') {
        conditions.push('tipologia = ?');
        queryParams.push(filters.tipologia);
      }
      if (filters.codCliente) {
        conditions.push('cod_cliente LIKE ?');
        queryParams.push(`%${filters.codCliente}%`);
      }
      if (filters.cliente) {
        conditions.push('ragione_sociale LIKE ?');
        queryParams.push(`%${filters.cliente}%`);
      }
      if (filters.dataDa) {
        conditions.push('data_mov_merce >= ?');
        queryParams.push(filters.dataDa);
      }
      if (filters.dataA) {
        conditions.push('data_mov_merce <= ?');
        queryParams.push(filters.dataA);
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Ordinamento
    const sortField = sort?.field || 'data_mov_merce';
    const sortOrder = sort?.order || 'DESC';
    const allowedSortFields = ['data_mov_merce', 'viaggio', 'ordine', 'consegna_num', 'descr_vettore', 'tipologia', 'ragione_sociale', 'colli', 'tot_compenso'];
    const finalSortField = allowedSortFields.includes(sortField) ? sortField : 'data_mov_merce';

    // Query per ottenere i dati della pagina corrente
    const dataSql = `
      SELECT * FROM fatt_delivery 
      ${whereClause}
      ORDER BY ${finalSortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await pool.query(dataSql, [...queryParams, ITEMS_PER_PAGE, offset]);

    // Query per contare il numero totale di record
    const countSql = `SELECT COUNT(*) as total FROM fatt_delivery ${whereClause}`;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalItems = (countResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return {
      fatture: rows as FatturaDelivery[],
      totalPages: totalPages,
      totalItems: totalItems
    };
  } catch (error) {
    console.error('Errore nel recuperare i dati di delivery:', error);
    throw new Error('Errore nel recupero dati.');
  }
}

// Funzione per ottenere dati raggruppati per consegna (Vista Raggruppata)
export async function getDeliveryGrouped(
  currentPage: number, 
  filters?: DeliveryFilters, 
  sort?: DeliverySort
): Promise<{ grouped: any[], totalPages: number, totalItems: number }> {
  try {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    let whereClause = '';
    let queryParams: any[] = [];

    // Costruisci WHERE clause per i filtri
    if (filters && Object.keys(filters).length > 0) {
      const conditions: string[] = [];
      
      if (filters.viaggio) {
        conditions.push('viaggio LIKE ?');
        queryParams.push(`%${filters.viaggio}%`);
      }
      if (filters.ordine) {
        conditions.push('ordine LIKE ?');
        queryParams.push(`%${filters.ordine}%`);
      }
      if (filters.bu && filters.bu !== 'Tutti') {
        conditions.push('bu = ?');
        queryParams.push(filters.bu);
      }
      if (filters.divisione && filters.divisione !== 'Tutte') {
        conditions.push('`div` = ?');
        queryParams.push(filters.divisione);
      }
      if (filters.deposito && filters.deposito !== 'Tutti') {
        conditions.push('dep = ?');
        queryParams.push(filters.deposito);
      }
      if (filters.vettore && filters.vettore !== 'Tutti') {
        conditions.push('descr_vettore = ?');
        queryParams.push(filters.vettore);
      }
      if (filters.tipologia && filters.tipologia !== 'Tutte') {
        conditions.push('tipologia = ?');
        queryParams.push(filters.tipologia);
      }
      if (filters.codCliente) {
        conditions.push('cod_cliente LIKE ?');
        queryParams.push(`%${filters.codCliente}%`);
      }
      if (filters.cliente) {
        conditions.push('ragione_sociale LIKE ?');
        queryParams.push(`%${filters.cliente}%`);
      }
      if (filters.dataDa) {
        conditions.push('data_mov_merce >= ?');
        queryParams.push(filters.dataDa);
      }
      if (filters.dataA) {
        conditions.push('data_mov_merce <= ?');
        queryParams.push(filters.dataA);
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Ordinamento
    const sortField = sort?.field || 'data_mov_merce';
    const sortOrder = sort?.order || 'DESC';
    const allowedSortFields = ['data_mov_merce', 'viaggio', 'ordine', 'consegna_num', 'descr_vettore', 'tipologia', 'ragione_sociale', 'colli', 'tot_compenso'];
    const finalSortField = allowedSortFields.includes(sortField) ? sortField : 'data_mov_merce';

    // Query per dati raggruppati per consegna
    const groupedSql = `
      SELECT 
        consegna_num,
        data_mov_merce,
        viaggio,
        dep as deposito,
        ordine,
        descr_vettore as vettore,
        tipologia,
        ragione_sociale as cliente,
        cod_cliente,
        bu,
        \`div\` as divisione,
        COUNT(DISTINCT cod_articolo) as articoli,
        SUM(colli) as colli_totali,
        SUM(tot_compenso) as compenso_totale,
        SUM(tr_cons) as trasporto_totale,
        SUM(tot_compenso) as fatturato_totale
      FROM fatt_delivery 
      ${whereClause}
      GROUP BY consegna_num, data_mov_merce, viaggio, dep, ordine, descr_vettore, tipologia, ragione_sociale, cod_cliente, bu, \`div\`
      ORDER BY ${finalSortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const [groupedRows] = await pool.query(groupedSql, [...queryParams, ITEMS_PER_PAGE, offset]) as [any[], any];

    // Query per contare il numero totale di gruppi
    const countSql = `
      SELECT COUNT(DISTINCT consegna_num) as total 
      FROM fatt_delivery 
      ${whereClause}
    `;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalItems = (countResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return {
      grouped: groupedRows,
      totalPages: totalPages,
      totalItems: totalItems
    };
  } catch (error) {
    console.error('Errore nel recuperare i dati raggruppati delivery:', error);
    throw new Error('Errore nel recupero dati raggruppati.');
  }
}

// Funzione per ottenere dettagli di una consegna specifica
export async function getDeliveryDetails(consegnaNum: string, vettore: string, tipologia: string): Promise<FatturaDelivery[]> {
  try {
    const detailsSql = `
      SELECT * FROM fatt_delivery 
      WHERE consegna_num = ? AND descr_vettore = ? AND tipologia = ?
      ORDER BY cod_articolo
    `;
    
    const [rows] = await pool.query(detailsSql, [consegnaNum, vettore, tipologia]);
    return rows as FatturaDelivery[];
  } catch (error) {
    console.error('Errore nel recuperare i dettagli della consegna:', error);
    throw new Error('Errore nel recupero dettagli.');
  }
}

// Funzione per ottenere valori distinti per i dropdown dei filtri
export async function getDeliveryFilterOptions(): Promise<{
  depositi: string[];
  vettori: string[];
  tipologie: string[];
  bu: string[];
  divisioni: string[];
}> {
  try {
    const [depositi] = await pool.query('SELECT DISTINCT dep FROM fatt_delivery WHERE dep IS NOT NULL AND dep != "" ORDER BY dep');
    const [vettori] = await pool.query('SELECT DISTINCT descr_vettore FROM fatt_delivery WHERE descr_vettore IS NOT NULL AND descr_vettore != "" ORDER BY descr_vettore');
    const [tipologie] = await pool.query('SELECT DISTINCT tipologia FROM fatt_delivery WHERE tipologia IS NOT NULL AND tipologia != "" ORDER BY tipologia');
    const [bu] = await pool.query('SELECT DISTINCT bu FROM fatt_delivery WHERE bu IS NOT NULL AND bu != "" ORDER BY bu');
    const [divisioni] = await pool.query('SELECT DISTINCT `div` FROM fatt_delivery WHERE `div` IS NOT NULL AND `div` != "" ORDER BY `div`');

    return {
      depositi: (depositi as any[]).map(row => row.dep),
      vettori: (vettori as any[]).map(row => row.descr_vettore),
      tipologie: (tipologie as any[]).map(row => row.tipologia),
      bu: (bu as any[]).map(row => row.bu),
      divisioni: (divisioni as any[]).map(row => row.div)
    };
  } catch (error) {
    console.error('Errore nel recuperare le opzioni dei filtri delivery:', error);
    return {
      depositi: [],
      vettori: [],
      tipologie: [],
      bu: [],
      divisioni: []
    };
  }
}

// Funzione legacy per compatibilità
export async function getFattureData(currentPage: number) {
  return getDeliveryData(currentPage);
}
