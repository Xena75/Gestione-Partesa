// src/lib/data-viaggi-tab.ts
import pool from './db-gestione';

// Tipo per i dati della tabella tab_viaggi
export interface ViaggioTab {
  'Magazzino di partenza': string;
  'Viaggio': string;
  'Data': string;
  'Nome Trasportatore': string;
  'Data Inizio': string;
  'Data Fine': string;
  'Ore PoD': number;
  'Tipo_Vettore': string;
  'Azienda_Vettore': string;
  'Cognome_Vettore': string;
  'Nome_Vettore': string;
  'Nominativo': string;
  'Ora Inizio': string;
  'Ora Fine': string;
  'Ore': number;
  'Colli': number;
  'Peso (Kg)': number;
  'Targa': string;
  'Tipo Patente': string;
  'Km': number;
  'Km Iniziali Viaggio': number;
  'Km Finali Viaggio': number;
  'Km Viaggio': number;
  'Km al Rifornimento': number;
  'Litri Riforniti': number;
  '€/lt': number;
  'Toccate': number;
  'Ordini': number;
  'Mese': number;
  'Trimestre': number;
  'Sett': number;
  'Giorno': string;
  'euro_rifornimento': number;
}

// Tipo per le statistiche
export interface Statistiche {
  totalRecords: number;
  totalPages: number;
  recordsPerPage: number;
  totalKm: number;
  totalColli: number;
  totalTrasporti: number;
  trasportiMese: number;
}

// Tipo per i filtri
export interface FiltriViaggi {
  aziendaVettore?: string | null;
  nominativo?: string | null;
  trasportatore?: string | null;
  numeroViaggio?: string | null;
  targa?: string | null;
  magazzino?: string | null;
  haiEffettuatoRitiri?: string | null;
  mese?: string | null;
  trimestre?: string | null;
  dataDa?: string | null;
  dataA?: string | null;
}

// --- FUNZIONE PER LEGGERE I VIAGGI CON PAGINAZIONE E ORDINAMENTO ---
export async function getViaggiData(
  currentPage: number = 1, 
  recordsPerPage: number = 20,
  sortBy: string = 'Data',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<{ viaggi: ViaggioTab[], totalPages: number, totalRecords: number }> {
  try {
    const offset = (currentPage - 1) * recordsPerPage;
    
    // Validiamo i campi di ordinamento permessi (tutte le 15 colonne principali)
    const allowedSortFields = [
      'Data', 'Viaggio', 'Nome Trasportatore', 'Nominativo', 'Tipo Patente',
      'Ore', 'Colli', 'Peso (Kg)', 'Ordini', 'Toccate',
      'Targa', 'Magazzino di partenza', 'Km Iniziali Viaggio', 'Km Finali Viaggio', 'Km Viaggio'
    ];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'Data';
    const validSortOrder = sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : 'DESC';
    
    // Query per ottenere i dati della pagina corrente
    const dataSql = `
      SELECT * FROM tab_viaggi 
      ORDER BY \`${validSortBy}\` ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [recordsPerPage, offset]);
    
    // Converti i valori numerici di haiEffettuatoRitiri in boolean
    const viaggiConvertiti = (rows as any[]).map(viaggio => ({
      ...viaggio,
      haiEffettuatoRitiri: viaggio.haiEffettuatoRitiri === 1 ? true : viaggio.haiEffettuatoRitiri === 0 ? false : null
    }));
    
    // Query per contare il numero totale di record
    const countSql = 'SELECT COUNT(*) as total FROM tab_viaggi';
    const [countResult] = await pool.query(countSql);
    const totalRecords = (countResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    return {
      viaggi: viaggiConvertiti as ViaggioTab[],
      totalPages,
      totalRecords
    };
  } catch (error) {
    console.error('Errore nel recuperare i viaggi:', error);
    return {
      viaggi: [],
      totalPages: 0,
      totalRecords: 0
    };
  }
}

// --- FUNZIONE PER FILTRARE I VIAGGI CON ORDINAMENTO ---
export async function getViaggiFiltrati(
  currentPage: number = 1, 
  recordsPerPage: number = 20,
  sortBy: string = 'Data',
  sortOrder: 'ASC' | 'DESC' = 'DESC',
  filters: FiltriViaggi
): Promise<{ viaggi: ViaggioTab[], totalPages: number, totalRecords: number }> {
  try {
    const offset = (currentPage - 1) * recordsPerPage;
    
    // Validiamo i campi di ordinamento permessi
    const allowedSortFields = [
      'Data', 'Viaggio', 'Nome Trasportatore', 'Nominativo', 'Tipo Patente',
      'Ore', 'Colli', 'Peso (Kg)', 'Ordini', 'Toccate',
      'Targa', 'Magazzino di partenza', 'Km Iniziali Viaggio', 'Km Finali Viaggio', 'Km Viaggio'
    ];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'Data';
    const validSortOrder = sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : 'DESC';
    
    // Costruiamo la query WHERE dinamicamente
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];
    
    if (filters.aziendaVettore) {
      whereConditions.push('`Azienda_Vettore` = ?');
      queryParams.push(filters.aziendaVettore);
    }
    
    if (filters.nominativo) {
      whereConditions.push('`Nominativo` LIKE ?');
      queryParams.push(`%${filters.nominativo}%`);
    }
    
    if (filters.trasportatore) {
      whereConditions.push('`Nome Trasportatore` = ?');
      queryParams.push(filters.trasportatore);
    }
    
    if (filters.numeroViaggio) {
      whereConditions.push('`Viaggio` LIKE ?');
      queryParams.push(`%${filters.numeroViaggio}%`);
    }
    
    if (filters.targa) {
      whereConditions.push('`Targa` = ?');
      queryParams.push(filters.targa);
    }
    
    if (filters.magazzino) {
      whereConditions.push('`Magazzino di partenza` = ?');
      queryParams.push(filters.magazzino);
    }
    
    if (filters.haiEffettuatoRitiri !== null && filters.haiEffettuatoRitiri !== '') {
      console.log('📊 DB - Filtro haiEffettuatoRitiri ricevuto:', filters.haiEffettuatoRitiri, typeof filters.haiEffettuatoRitiri);
      const ritiriValue = filters.haiEffettuatoRitiri === 'true' ? 1 : 0;
      console.log('📊 DB - Valore convertito per query:', ritiriValue);
      whereConditions.push('haiEffettuatoRitiri = ?');
      queryParams.push(ritiriValue);
    }
    
    if (filters.mese) {
      whereConditions.push('`Mese` = ?');
      queryParams.push(Number(filters.mese));
    }
    
    if (filters.trimestre) {
      whereConditions.push('`Trimestre` = ?');
      queryParams.push(Number(filters.trimestre));
    }
    
    if (filters.dataDa) {
      whereConditions.push('`Data` >= ?');
      queryParams.push(filters.dataDa);
    }
    
    if (filters.dataA) {
      whereConditions.push('`Data` <= ?');
      queryParams.push(filters.dataA);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query per ottenere i dati filtrati
    const dataSql = `
      SELECT * FROM tab_viaggi 
      ${whereClause}
      ORDER BY \`${validSortBy}\` ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    console.log('📊 DB - Query SQL:', dataSql);
    console.log('📊 DB - Parametri query:', [...queryParams, recordsPerPage, offset]);
    
    const [rows] = await pool.query(dataSql, [...queryParams, recordsPerPage, offset]);
    
    console.log('📊 DB - Risultati trovati:', (rows as any[]).length);
    
    // Converti i valori numerici di haiEffettuatoRitiri in boolean
    const viaggiConvertiti = (rows as any[]).map(viaggio => ({
      ...viaggio,
      haiEffettuatoRitiri: viaggio.haiEffettuatoRitiri === 1 ? true : viaggio.haiEffettuatoRitiri === 0 ? false : null
    }));
    
    // Query per contare i record filtrati
    const countSql = `SELECT COUNT(*) as total FROM tab_viaggi ${whereClause}`;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalRecords = (countResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    return {
      viaggi: viaggiConvertiti as ViaggioTab[],
      totalPages,
      totalRecords
    };
  } catch (error) {
    console.error('Errore nel filtrare i viaggi:', error);
    return {
      viaggi: [],
      totalPages: 0,
      totalRecords: 0
    };
  }
}

// --- FUNZIONE PER OTTENERE LE STATISTICHE DEI VIAGGI ---
export async function getViaggiStats(_currentPage: number = 1, recordsPerPage: number = 20): Promise<Statistiche> {
  try {
    // Statistiche generali
    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM tab_viaggi');
    const totalRecords = (totalResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    // Calcola totali aggregati
    const [totalsResult] = await pool.query(`
      SELECT 
        SUM(COALESCE(\`Km Viaggio\`, 0)) as totalKm,
        SUM(COALESCE(\`Colli\`, 0)) as totalColli,
        COUNT(*) as totalTrasporti
      FROM tab_viaggi
    `);
    const totals = (totalsResult as any[])[0];
    
    // Calcola viaggi del mese corrente
    const currentMonth = new Date().getMonth() + 1;
    const [monthResult] = await pool.query(
      'SELECT COUNT(*) as count FROM tab_viaggi WHERE `Mese` = ?',
      [currentMonth]
    );
    const trasportiMese = (monthResult as { count: number }[])[0].count;
    
    return {
      totalRecords,
      totalPages,
      recordsPerPage,
      totalKm: totals.totalKm || 0,
      totalColli: totals.totalColli || 0,
      totalTrasporti: totals.totalTrasporti || 0,
      trasportiMese
    };
  } catch (error) {
    console.error('Errore nel calcolare le statistiche:', error);
    return {
      totalRecords: 0,
      totalPages: 0,
      recordsPerPage,
      totalKm: 0,
      totalColli: 0,
      totalTrasporti: 0,
      trasportiMese: 0
    };
  }
}

// --- FUNZIONE PER CALCOLARE STATISTICHE CON FILTRI ---
export async function getTotalsByFilters(filters: FiltriViaggi): Promise<Statistiche> {
  try {
    // Costruiamo la query WHERE dinamicamente
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];
    
    if (filters.aziendaVettore) {
      whereConditions.push('`Azienda_Vettore` = ?');
      queryParams.push(filters.aziendaVettore);
    }
    
    if (filters.nominativo) {
      whereConditions.push('`Nominativo` LIKE ?');
      queryParams.push(`%${filters.nominativo}%`);
    }
    
    if (filters.trasportatore) {
      whereConditions.push('`Nome Trasportatore` = ?');
      queryParams.push(filters.trasportatore);
    }
    
    if (filters.numeroViaggio) {
      whereConditions.push('`Viaggio` LIKE ?');
      queryParams.push(`%${filters.numeroViaggio}%`);
    }
    
    if (filters.targa) {
      whereConditions.push('`Targa` = ?');
      queryParams.push(filters.targa);
    }
    
    if (filters.magazzino) {
      whereConditions.push('`Magazzino di partenza` = ?');
      queryParams.push(filters.magazzino);
    }
    
    if (filters.haiEffettuatoRitiri) {
      const ritiriValue = filters.haiEffettuatoRitiri === 'true' ? 1 : filters.haiEffettuatoRitiri === 'false' ? 0 : null;
      if (ritiriValue !== null) {
        whereConditions.push('`haiEffettuatoRitiri` = ?');
        queryParams.push(ritiriValue);
      }
    }
    
    if (filters.mese) {
      whereConditions.push('`Mese` = ?');
      queryParams.push(Number(filters.mese));
    }
    
    if (filters.trimestre) {
      whereConditions.push('`Trimestre` = ?');
      queryParams.push(Number(filters.trimestre));
    }
    
    if (filters.dataDa) {
      whereConditions.push('`Data` >= ?');
      queryParams.push(filters.dataDa);
    }
    
    if (filters.dataA) {
      whereConditions.push('`Data` <= ?');
      queryParams.push(filters.dataA);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Calcola statistiche con filtri applicati
    const query = `
      SELECT 
        COUNT(*) as totalTrasporti,
        SUM(COALESCE(\`Km Viaggio\`, 0)) as totalKm,
        SUM(COALESCE(\`Colli\`, 0)) as totalColli
      FROM tab_viaggi 
      ${whereClause}
    `;
    
    const [totalsResult] = await pool.query(query, queryParams);
    const totals = (totalsResult as any[])[0];
    
    // Calcola "Viaggi del Mese" - se c'è un filtro mese, usa quello, altrimenti usa il mese corrente
    const currentMonth = new Date().getMonth() + 1;
    const targetMonth = filters.mese && filters.mese !== '' ? Number(filters.mese) : currentMonth;
    
    const monthWhereConditions = [...whereConditions];
    const monthQueryParams = [...queryParams];
    
    // Se non c'è già un filtro per il mese, aggiungi il mese target
    if (!filters.mese || filters.mese === '') {
      monthWhereConditions.push('`Mese` = ?');
      monthQueryParams.push(targetMonth);
    }
    
    const monthWhereClause = monthWhereConditions.length > 0 ? `WHERE ${monthWhereConditions.join(' AND ')}` : '';
    
    const [monthResult] = await pool.query(`
      SELECT COUNT(*) as trasportiMese
      FROM tab_viaggi 
      ${monthWhereClause}
    `, monthQueryParams);
    
    const monthTotals = (monthResult as any[])[0];
    
    const result = {
      totalRecords: totals.totalTrasporti || 0,
      totalPages: Math.ceil((totals.totalTrasporti || 0) / 20),
      recordsPerPage: 20,
      totalKm: totals.totalKm || 0,
      totalColli: totals.totalColli || 0,
      totalTrasporti: totals.totalTrasporti || 0,
      trasportiMese: monthTotals.trasportiMese || 0
    };
    
    return result;
  } catch (error) {
    console.error('Errore nel calcolare le statistiche filtrate:', error);
    return {
      totalRecords: 0,
      totalPages: 0,
      recordsPerPage: 20,
      totalKm: 0,
      totalColli: 0,
      totalTrasporti: 0,
      trasportiMese: 0
    };
  }
}

// --- FUNZIONE PER OTTENERE VALORI DISTINTI PER I FILTRI ---
export async function getDistinctValues(column: string): Promise<any[]> {
  try {
    // Whitelist di colonne consentite per sicurezza
    const allowedColumns = [
      'Azienda_Vettore', 'Nome Trasportatore', 'Targa', 'Magazzino di partenza', 'Mese', 'Trimestre'
    ];
    
    if (!allowedColumns.includes(column)) {
      throw new Error('Colonna non consentita per i filtri');
    }
    
    const sql = `SELECT DISTINCT \`${column}\` FROM tab_viaggi WHERE \`${column}\` IS NOT NULL ORDER BY \`${column}\``;
    const [rows] = await pool.query(sql);
    
    return (rows as any[]).map(row => row[column]);
  } catch (error) {
    console.error(`Errore nel recuperare valori distinti per ${column}:`, error);
    return [];
  }
}
