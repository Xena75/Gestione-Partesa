import { createPool } from 'mysql2/promise';
import { withCache } from './cache';

// Pool di connessioni per il database
const pool = createPool({
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Interfaccia per i dati terzisti
export interface TerzistiData {
  id: number;
  div: string;
  bu: string;
  dep: string;
  data_mov_merce: string;
  viaggio: string;
  ordine: string;
  consegna_num: string;
  Cod_Vettore: number;
  descr_vettore: string;
  tipologia: string;
  cod_articolo: string;
  descr_articolo: string;
  colli: number;
  compenso: number;
  extra_cons: number;
  tot_compenso: number;
  cod_cliente: string;
  ragione_sociale: string;
  ID_fatt: string;
  classe_prod: string;
  classe_tariffa: string;
  Descr_Vettore_Join: string;
  Tipo_Vettore: string;
  Azienda_Vettore: string;
  data_viaggio: string;
  Id_Tariffa: string;
  tariffa_terzista: number;
  created_at: string;
  updated_at: string;
}

// Interfaccia per le statistiche terzisti
export interface TerzistiStats {
  totalRecords: number;
  totalConsegne: number;
  totalViaggi: number;
  totalColli: number;
  totalCompenso: number;
  totalExtra: number;
  totalFatturato: number;
  uniqueVettori: number;
  uniqueAziende: number;
  mediaColliViaggio: number;
  mediaFatturatoViaggio: number;
}

// Interfaccia per i filtri terzisti
export interface TerzistiFilters {
  divisione?: string;
  vettore?: string;
  azienda?: string;
  dataDa?: string;
  dataA?: string;
  viaggio?: string;
  ordine?: string;
  consegna?: string;
  cliente?: string;
  articolo?: string;
}

// Interfaccia per le opzioni di filtro
export interface TerzistiFilterOptions {
  divisioni: string[];
  vettori: string[];
  aziende: string[];
  viaggi: string[];
  ordini: string[];
  consegne: string[];
  clienti: string[];
  articoli: string[];
}

// Interfaccia per l'ordinamento
export interface TerzistiSort {
  field: string;
  order: 'ASC' | 'DESC';
}

// Interfaccia per la paginazione
export interface TerzistiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Interfaccia per la risposta API
export interface TerzistiResponse {
  data: TerzistiData[];
  pagination: TerzistiPagination;
  stats: TerzistiStats;
}

/**
 * Ottiene i dati terzisti con filtri, ordinamento e paginazione
 */
export async function getTerzistiData(
  filters: TerzistiFilters = {},
  sort: TerzistiSort = { field: 'data_mov_merce', order: 'DESC' },
  page: number = 1,
  limit: number = 50
): Promise<TerzistiResponse> {
  return withCache(`terzisti:${page}:${JSON.stringify(filters)}:${JSON.stringify(sort)}`, async () => {
    const offset = (page - 1) * limit;
    
    // Costruisci la query WHERE
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (filters.divisione) {
      whereConditions.push('`div` = ?');
      queryParams.push(filters.divisione);
    }

    if (filters.vettore) {
      whereConditions.push('Descr_Vettore_Join LIKE ?');
      queryParams.push(`%${filters.vettore}%`);
    }

    if (filters.azienda) {
      whereConditions.push('Azienda_Vettore LIKE ?');
      queryParams.push(`%${filters.azienda}%`);
    }

    if (filters.dataDa) {
      whereConditions.push('data_mov_merce >= ?');
      queryParams.push(filters.dataDa);
    }

    if (filters.dataA) {
      whereConditions.push('data_mov_merce <= ?');
      queryParams.push(filters.dataA);
    }

    if (filters.viaggio) {
      whereConditions.push('viaggio LIKE ?');
      queryParams.push(`%${filters.viaggio}%`);
    }

    if (filters.ordine) {
      whereConditions.push('ordine LIKE ?');
      queryParams.push(`%${filters.ordine}%`);
    }

    if (filters.consegna) {
      whereConditions.push('consegna_num LIKE ?');
      queryParams.push(`%${filters.consegna}%`);
    }

    if (filters.cliente) {
      whereConditions.push('(cod_cliente LIKE ? OR ragione_sociale LIKE ?)');
      queryParams.push(`%${filters.cliente}%`, `%${filters.cliente}%`);
    }

    if (filters.articolo) {
      whereConditions.push('(cod_articolo LIKE ? OR descr_articolo LIKE ?)');
      queryParams.push(`%${filters.articolo}%`, `%${filters.articolo}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query per i dati (AGGIORNATA con campi tariffa)
    const dataQuery = `
      SELECT 
        *,
        Id_Tariffa,
        tariffa_terzista,
        ID_fatt
      FROM tab_delivery_terzisti
      ${whereClause}
      ORDER BY ${sort.field} ${sort.order}
      LIMIT ? OFFSET ?
    `;

    // Query per il conteggio totale
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tab_delivery_terzisti
      ${whereClause}
    `;

    // Query per le statistiche
    const statsQuery = `
      SELECT 
        COUNT(*) as totalRecords,
        COUNT(DISTINCT consegna_num) as totalConsegne,
        COUNT(DISTINCT viaggio) as totalViaggi,
        SUM(colli) as totalColli,
        SUM(compenso) as totalCompenso,
        SUM(extra_cons) as totalExtra,
        SUM(tot_compenso) as totalFatturato,
        COUNT(DISTINCT Cod_Vettore) as uniqueVettori,
        COUNT(DISTINCT Azienda_Vettore) as uniqueAziende,
        CASE 
          WHEN COUNT(DISTINCT consegna_num) > 0 
          THEN SUM(colli) / COUNT(DISTINCT consegna_num) 
          ELSE 0 
        END as mediaColliViaggio,
        CASE 
          WHEN COUNT(DISTINCT consegna_num) > 0 
          THEN SUM(compenso) / COUNT(DISTINCT consegna_num) 
          ELSE 0 
        END as mediaFatturatoViaggio
      FROM tab_delivery_terzisti
      ${whereClause}
    `;

    try {
      const [dataResult] = await pool.execute(dataQuery, [...queryParams, limit, offset]);
      const [countResult] = await pool.execute(countQuery, queryParams);
      const [statsResult] = await pool.execute(statsQuery, queryParams);

      const total = (countResult as any[])[0].total;
      const totalPages = Math.ceil(total / limit);

      const rawStats = (statsResult as any[])[0];

      const stats: TerzistiStats = {
        totalRecords: rawStats.totalRecords || 0,
        totalConsegne: rawStats.totalConsegne || 0,
        totalViaggi: rawStats.totalViaggi || 0,
        totalColli: rawStats.totalColli || 0,
        totalCompenso: rawStats.totalCompenso || 0,
        totalExtra: rawStats.totalExtra || 0,
        totalFatturato: rawStats.totalFatturato || 0,
        uniqueVettori: rawStats.uniqueVettori || 0,
        uniqueAziende: rawStats.uniqueAziende || 0,
        mediaColliViaggio: rawStats.mediaColliViaggio || 0,
        mediaFatturatoViaggio: rawStats.mediaFatturatoViaggio || 0
      };


      return {
        data: dataResult as TerzistiData[],
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        stats
      };

    } catch (error) {
      console.error('Errore nella query terzisti:', error);
      throw error;
    }
  }, 60000); // Cache per 1 minuto
}

/**
 * Ottiene le statistiche terzisti
 */

export async function getTerzistiStats(filters: TerzistiFilters = {}): Promise<TerzistiStats> {
  return withCache(`terzisti-stats:${JSON.stringify(filters)}`, async () => {
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (filters.divisione) {
      whereConditions.push('`div` = ?');
      queryParams.push(filters.divisione);
    }

    if (filters.vettore) {
      whereConditions.push('Descr_Vettore_Join LIKE ?');
      queryParams.push(`%${filters.vettore}%`);
    }

    if (filters.azienda) {
      whereConditions.push('Azienda_Vettore LIKE ?');
      queryParams.push(`%${filters.azienda}%`);
    }

    if (filters.dataDa) {
      whereConditions.push('data_mov_merce >= ?');
      queryParams.push(filters.dataDa);
    }

    if (filters.dataA) {
      whereConditions.push('data_mov_merce <= ?');
      queryParams.push(filters.dataA);
    }

    if (filters.viaggio) {
      whereConditions.push('viaggio LIKE ?');
      queryParams.push(`%${filters.viaggio}%`);
    }

    if (filters.ordine) {
      whereConditions.push('ordine LIKE ?');
      queryParams.push(`%${filters.ordine}%`);
    }

    if (filters.consegna) {
      whereConditions.push('consegna_num LIKE ?');
      queryParams.push(`%${filters.consegna}%`);
    }

    if (filters.cliente) {
      whereConditions.push('(cod_cliente LIKE ? OR ragione_sociale LIKE ?)');
      queryParams.push(`%${filters.cliente}%`, `%${filters.cliente}%`);
    }

    if (filters.articolo) {
      whereConditions.push('(cod_articolo LIKE ? OR descr_articolo LIKE ?)');
      queryParams.push(`%${filters.articolo}%`, `%${filters.articolo}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*) as totalRecords,
        COUNT(DISTINCT consegna_num) as totalConsegne,
        COUNT(DISTINCT viaggio) as totalViaggi,
        SUM(colli) as totalColli,
        SUM(compenso) as totalCompenso,
        SUM(extra_cons) as totalExtra,
        SUM(tot_compenso) as totalFatturato,
        COUNT(DISTINCT Cod_Vettore) as uniqueVettori,
        COUNT(DISTINCT Azienda_Vettore) as uniqueAziende,
        CASE 
          WHEN COUNT(DISTINCT consegna_num) > 0 
          THEN SUM(colli) / COUNT(DISTINCT consegna_num) 
          ELSE 0 
        END as mediaColliViaggio,
        CASE 
          WHEN COUNT(DISTINCT consegna_num) > 0 
          THEN SUM(compenso) / COUNT(DISTINCT consegna_num) 
          ELSE 0 
        END as mediaFatturatoViaggio
      FROM tab_delivery_terzisti
      ${whereClause}
    `;

    try {
      const [result] = await pool.execute(query, queryParams);
      const stats = (result as any[])[0];

      return {
        totalRecords: stats.totalRecords || 0,
        totalConsegne: stats.totalConsegne || 0,
        totalViaggi: stats.totalViaggi || 0,
        totalColli: stats.totalColli || 0,
        totalCompenso: stats.totalCompenso || 0,
        totalExtra: stats.totalExtra || 0,
        totalFatturato: stats.totalFatturato || 0,
        uniqueVettori: stats.uniqueVettori || 0,
        uniqueAziende: stats.uniqueAziende || 0,
        mediaColliViaggio: stats.mediaColliViaggio || 0,
        mediaFatturatoViaggio: stats.mediaFatturatoViaggio || 0
      };

    } catch (error) {
      console.error('Errore nella query statistiche terzisti:', error);
      throw error;
    }
  }, 30000); // Cache per 30 secondi
}

/**
 * Ottiene le opzioni di filtro per i terzisti
 */
export async function getTerzistiFilterOptions(): Promise<TerzistiFilterOptions> {
  return withCache('terzisti-filters', async () => {
    try {
      const [divisioniResult] = await pool.execute('SELECT DISTINCT `div` FROM tab_delivery_terzisti ORDER BY `div`');
      const [vettoriResult] = await pool.execute('SELECT DISTINCT Descr_Vettore_Join FROM tab_delivery_terzisti WHERE Descr_Vettore_Join IS NOT NULL ORDER BY Descr_Vettore_Join');
      const [aziendeResult] = await pool.execute('SELECT DISTINCT Azienda_Vettore FROM tab_delivery_terzisti WHERE Azienda_Vettore IS NOT NULL ORDER BY Azienda_Vettore');
      const [viaggiResult] = await pool.execute('SELECT DISTINCT viaggio FROM tab_delivery_terzisti WHERE viaggio IS NOT NULL ORDER BY viaggio');
      const [ordiniResult] = await pool.execute('SELECT DISTINCT ordine FROM tab_delivery_terzisti WHERE ordine IS NOT NULL ORDER BY ordine');
      const [consegneResult] = await pool.execute('SELECT DISTINCT consegna_num FROM tab_delivery_terzisti WHERE consegna_num IS NOT NULL ORDER BY consegna_num');
      const [clientiResult] = await pool.execute('SELECT DISTINCT ragione_sociale FROM tab_delivery_terzisti WHERE ragione_sociale IS NOT NULL ORDER BY ragione_sociale');
      const [articoliResult] = await pool.execute('SELECT DISTINCT descr_articolo FROM tab_delivery_terzisti WHERE descr_articolo IS NOT NULL ORDER BY descr_articolo');

      return {
        divisioni: (divisioniResult as any[]).map(row => row.div),
        vettori: (vettoriResult as any[]).map(row => row.Descr_Vettore_Join),
        aziende: (aziendeResult as any[]).map(row => row.Azienda_Vettore),
        viaggi: (viaggiResult as any[]).map(row => row.viaggio),
        ordini: (ordiniResult as any[]).map(row => row.ordine),
        consegne: (consegneResult as any[]).map(row => row.consegna_num),
        clienti: (clientiResult as any[]).map(row => row.ragione_sociale),
        articoli: (articoliResult as any[]).map(row => row.descr_articolo)
      };

    } catch (error) {
      console.error('Errore nella query opzioni filtro terzisti:', error);
      throw error;
    }
  }, 600000); // Cache per 10 minuti
}

/**
 * Ottiene i dettagli di una consegna specifica
 */
export async function getTerzistiConsegnaDetails(consegna: string, vettore: string, tipologia: string): Promise<TerzistiData[]> {
  return withCache(`terzisti-details:${consegna}:${vettore}:${tipologia}`, async () => {
    const query = `
      SELECT 
        *,
        Id_Tariffa,
        tariffa_terzista,
        ID_fatt
      FROM tab_delivery_terzisti
      WHERE consegna_num = ? 
      AND Descr_Vettore_Join = ? 
      AND tipologia = ?
      ORDER BY cod_articolo
    `;

    try {
      const [result] = await pool.execute(query, [consegna, vettore, tipologia]);
      return result as TerzistiData[];

    } catch (error) {
      console.error('Errore nella query dettagli consegna terzisti:', error);
      throw error;
    }
  }, 300000); // Cache per 5 minuti
}

/**
 * Ottiene i dati raggruppati per consegna
 */
export async function getTerzistiGroupedData(
  filters: TerzistiFilters = {},
  sort: TerzistiSort = { field: 'data_mov_merce', order: 'DESC' },
  page: number = 1,
  limit: number = 50
): Promise<TerzistiResponse> {
  return withCache(`terzisti-grouped:${page}:${JSON.stringify(filters)}:${JSON.stringify(sort)}`, async () => {
    const offset = (page - 1) * limit;
    
    // Costruisci la query WHERE
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (filters.divisione) {
      whereConditions.push('`div` = ?');
      queryParams.push(filters.divisione);
    }

    if (filters.vettore) {
      whereConditions.push('Descr_Vettore_Join LIKE ?');
      queryParams.push(`%${filters.vettore}%`);
    }

    if (filters.azienda) {
      whereConditions.push('Azienda_Vettore LIKE ?');
      queryParams.push(`%${filters.azienda}%`);
    }

    if (filters.dataDa) {
      whereConditions.push('data_mov_merce >= ?');
      queryParams.push(filters.dataDa);
    }

    if (filters.dataA) {
      whereConditions.push('data_mov_merce <= ?');
      queryParams.push(filters.dataA);
    }

    if (filters.viaggio) {
      whereConditions.push('viaggio LIKE ?');
      queryParams.push(`%${filters.viaggio}%`);
    }

    if (filters.ordine) {
      whereConditions.push('ordine LIKE ?');
      queryParams.push(`%${filters.ordine}%`);
    }

    if (filters.consegna) {
      whereConditions.push('consegna_num LIKE ?');
      queryParams.push(`%${filters.consegna}%`);
    }

    if (filters.cliente) {
      whereConditions.push('(cod_cliente LIKE ? OR ragione_sociale LIKE ?)');
      queryParams.push(`%${filters.cliente}%`, `%${filters.cliente}%`);
    }

    if (filters.articolo) {
      whereConditions.push('(cod_articolo LIKE ? OR descr_articolo LIKE ?)');
      queryParams.push(`%${filters.articolo}%`, `%${filters.articolo}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query per i dati raggruppati (AGGIORNATA con campi tariffa)
    const groupedQuery = `
      SELECT 
        \`div\`,
        dep,
        data_mov_merce,
        viaggio,
        ordine,
        consegna_num,
        Descr_Vettore_Join,
        Azienda_Vettore,
        tipologia,
        ragione_sociale,
        COUNT(*) as articoli_count,
        SUM(colli) as total_colli,
        SUM(extra_cons) as total_extra_cons,
        SUM(tot_compenso) as total_compenso,
        data_viaggio,
        Id_Tariffa,
        AVG(tariffa_terzista) as avg_tariffa_terzista,
        ID_fatt
      FROM tab_delivery_terzisti
      ${whereClause}
      GROUP BY consegna_num, Descr_Vettore_Join, tipologia
      ORDER BY ${sort.field} ${sort.order}
      LIMIT ? OFFSET ?
    `;

    // Query per il conteggio totale
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT consegna_num, Descr_Vettore_Join, tipologia
        FROM tab_delivery_terzisti
        ${whereClause}
        GROUP BY consegna_num, Descr_Vettore_Join, tipologia
      ) as grouped
    `;

    // Query per le statistiche
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT consegna_num) as totalConsegne,
        COUNT(DISTINCT viaggio) as totalViaggi,
        SUM(colli) as totalColli,
        SUM(compenso) as totalCompenso,
        SUM(extra_cons) as totalExtra,
        SUM(tot_compenso) as totalFatturato,
        COUNT(DISTINCT Cod_Vettore) as uniqueVettori,
        COUNT(DISTINCT Azienda_Vettore) as uniqueAziende
      FROM tab_delivery_terzisti
      ${whereClause}
    `;

    try {
      const [groupedResult] = await pool.execute(groupedQuery, [...queryParams, limit, offset]);
      const [countResult] = await pool.execute(countQuery, queryParams);
      const [statsResult] = await pool.execute(statsQuery, queryParams);

      const total = (countResult as any[])[0].total;
      const totalPages = Math.ceil(total / limit);

      const stats: TerzistiStats = {
        totalRecords: total,
        totalConsegne: (statsResult as any[])[0].totalConsegne || 0,
        totalViaggi: (statsResult as any[])[0].totalViaggi || 0,
        totalColli: (statsResult as any[])[0].totalColli || 0,
        totalCompenso: (statsResult as any[])[0].totalCompenso || 0,
        totalExtra: (statsResult as any[])[0].totalExtra || 0,
        totalFatturato: (statsResult as any[])[0].totalFatturato || 0,
        uniqueVettori: (statsResult as any[])[0].uniqueVettori || 0,
        uniqueAziende: (statsResult as any[])[0].uniqueAziende || 0,
        mediaColliViaggio: (statsResult as any[])[0].mediaColliViaggio || 0,
        mediaFatturatoViaggio: (statsResult as any[])[0].mediaFatturatoViaggio || 0
      };

      return {
        data: groupedResult as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        stats
      };

    } catch (error) {
      console.error('Errore nella query dati raggruppati terzisti:', error);
      throw error;
    }
  }, 60000); // Cache per 1 minuto
}
