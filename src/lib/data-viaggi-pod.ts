// src/lib/data-viaggi-pod.ts
import pool from './db-viaggi';

// Interfaccia per i dati della tabella viaggi_pod
export interface ViaggioPod {
  ID: number;
  Viaggio: string | null;
  'Magazzino di partenza': string | null;
  'Nome Trasportatore': string | null;
  'Data Inizio': string | null;
  'Data Fine': string | null;
  Ore_Pod: number | null;
  Colli: number | null;
  'Peso (Kg)': number | null;
  Km: number | null;
  Toccate: number | null;
  Ordini: number | null;
  Mese: number | null;
  Sett: number | null;
  Giorno: number | null;
  Trimestre: number | null;
}

// Interfaccia per i filtri
export interface FiltriViaggioPod {
  viaggio?: string | null;
  magazzino?: string | null;
  trasportatore?: string | null;
  dataInizio?: string | null;
  dataFine?: string | null;
  mese?: number | null;
  trimestre?: number | null;
}

// Interfaccia per le statistiche dei viaggi POD
export interface ViaggiPodStats {
  totalViaggi: number;
  totalKm: number;
  totalColli: number;
  totalPeso: number;
  totalOrePod: number;
  totalToccate: number;
  totalOrdini: number;
  viaggiMeseCorrente: number;
}

// --- FUNZIONE PER LEGGERE I VIAGGI POD CON PAGINAZIONE E ORDINAMENTO ---
export async function getViaggiPodData(
  currentPage: number = 1, 
  recordsPerPage: number = 20,
  sortBy: string = 'Data Inizio',
  sortOrder: 'ASC' | 'DESC' = 'DESC',
  filters: FiltriViaggioPod = {}
): Promise<{ viaggiPod: ViaggioPod[], totalPages: number, totalRecords: number }> {
  try {
    const offset = (currentPage - 1) * recordsPerPage;
    
    // Validiamo i campi di ordinamento permessi
    const allowedSortFields = [
      'ID', 'Viaggio', 'Magazzino di partenza', 'Nome Trasportatore', 'Data Inizio', 'Data Fine',
      'Ore_Pod', 'Colli', 'Peso (Kg)', 'Km', 'Toccate', 'Ordini', 'Mese', 'Sett', 'Giorno', 'Trimestre'
    ];
    const validSortBy = allowedSortFields.includes(sortBy) ? `\`${sortBy}\`` : '`Data Inizio`';
    const validSortOrder = sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : 'DESC';
    
    // Costruzione delle condizioni WHERE per i filtri
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    
    if (filters.viaggio) {
      whereConditions.push('`Viaggio` LIKE ?');
      queryParams.push(`%${filters.viaggio}%`);
    }
    
    if (filters.magazzino) {
      whereConditions.push('`Magazzino di partenza` = ?');
      queryParams.push(filters.magazzino);
    }
    
    if (filters.trasportatore) {
      whereConditions.push('`Nome Trasportatore` = ?');
      queryParams.push(filters.trasportatore);
    }
    
    if (filters.dataInizio) {
      whereConditions.push('`Data Inizio` >= ?');
      queryParams.push(filters.dataInizio);
    }
    
    if (filters.dataFine) {
      whereConditions.push('`Data Fine` <= ?');
      queryParams.push(filters.dataFine);
    }
    
    if (filters.mese) {
      whereConditions.push('`Mese` = ?');
      queryParams.push(filters.mese);
    }
    
    if (filters.trimestre) {
      whereConditions.push('`Trimestre` = ?');
      queryParams.push(filters.trimestre);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query per ottenere i dati della pagina corrente
    const dataSql = `
      SELECT 
        ID, Viaggio, \`Magazzino di partenza\`, \`Nome Trasportatore\`, \`Data Inizio\`, \`Data Fine\`,
        Ore_Pod, Colli, \`Peso (Kg)\`, Km, Toccate, Ordini, Mese, Sett, Giorno, Trimestre
      FROM viaggi_pod 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...queryParams, recordsPerPage, offset];
    const [rows] = await pool.query(dataSql, dataParams);
    
    // Query per contare il numero totale di record
    const countSql = `SELECT COUNT(*) as total FROM viaggi_pod ${whereClause}`;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalRecords = (countResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    return {
      viaggiPod: rows as ViaggioPod[],
      totalPages,
      totalRecords
    };
  } catch (error) {
    console.error('Errore nel recuperare i viaggi pod:', error);
    return {
      viaggiPod: [],
      totalPages: 0,
      totalRecords: 0
    };
  }
}

// --- FUNZIONE PER CREARE UN NUOVO VIAGGIO POD ---
export async function createViaggioPodData(viaggio: Partial<ViaggioPod>) {
  try {
    const fields = Object.keys(viaggio).filter(key => key !== 'ID').map(key => `\`${key}\``);
    const values = Object.values(viaggio).filter((_, index) => Object.keys(viaggio)[index] !== 'ID');
    const placeholders = values.map(() => '?').join(', ');
    
    const sql = `INSERT INTO viaggi_pod (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, values);
    console.log('Viaggio POD inserito con successo nel DB:', result);
    return result;
  } catch (error) {
    console.error('Errore nella creazione del viaggio POD:', error);
    throw new Error('Impossibile creare il viaggio POD.');
  }
}

// --- FUNZIONE PER ELIMINARE UN VIAGGIO POD ---
export async function deleteViaggioPodData(id: number) {
  try {
    const sql = 'DELETE FROM viaggi_pod WHERE ID = ?';
    const [result] = await pool.query(sql, [id]);
    console.log(`Viaggio POD con id ${id} eliminato con successo.`);
    return result;
  } catch (error) {
    console.error(`Errore nell'eliminazione del viaggio POD ${id}:`, error);
    throw new Error('Impossibile eliminare il viaggio POD.');
  }
}

// --- FUNZIONE PER LEGGERE UN SINGOLO VIAGGIO POD TRAMITE ID ---
export async function getViaggioPodById(id: number): Promise<ViaggioPod | null> {
  try {
    const sql = `
      SELECT 
        ID, Viaggio, \`Magazzino di partenza\`, \`Nome Trasportatore\`, \`Data Inizio\`, \`Data Fine\`,
        Ore_Pod, Colli, \`Peso (Kg)\`, Km, Toccate, Ordini, Mese, Sett, Giorno, Trimestre
      FROM viaggi_pod WHERE ID = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    return (rows as ViaggioPod[])[0] || null;
  } catch (error) {
    console.error(`Errore nel recuperare il viaggio POD ${id}:`, error);
    return null;
  }
}

// Funzione helper per convertire le date ISO in formato MySQL
function convertDateForMySQL(dateString: string | null): string | null {
  if (!dateString) return null;
  
  try {
    // Se è già in formato ISO, convertiamo in formato MySQL
    if (dateString.includes('T') && dateString.includes('Z')) {
      const date = new Date(dateString);
      // Formato MySQL: YYYY-MM-DD HH:MM:SS
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    // Se è già in formato MySQL o altro formato valido, restituiamo così com'è
    return dateString;
  } catch (error) {
    console.error('Errore nella conversione della data:', error);
    return dateString;
  }
}

// --- FUNZIONE PER AGGIORNARE UN VIAGGIO POD ---
export async function updateViaggioPodData(id: number, viaggio: Partial<ViaggioPod>) {
  try {
    console.log(`updateViaggioPodData - Inizio aggiornamento per ID: ${id}`);
    console.log('updateViaggioPodData - Dati ricevuti:', JSON.stringify(viaggio, null, 2));
    
    // Converti le date dal formato ISO al formato MySQL se necessario
    const viaggioProcessed = { ...viaggio };
    if (viaggioProcessed['Data Inizio']) {
      viaggioProcessed['Data Inizio'] = convertDateForMySQL(viaggioProcessed['Data Inizio']);
    }
    if (viaggioProcessed['Data Fine']) {
      viaggioProcessed['Data Fine'] = convertDateForMySQL(viaggioProcessed['Data Fine']);
    }
    
    console.log('updateViaggioPodData - Dati dopo conversione date:', JSON.stringify(viaggioProcessed, null, 2));
    
    // Lista dei campi che NON possono essere aggiornati (STORED GENERATED o chiavi)
    const excludedFields = ['ID', 'Ore_Pod', 'Data', 'Mese', 'Giorno', 'Sett', 'Trimestre', 'created_at'];
    
    // Filtra solo i campi che possono essere aggiornati
    const fields = Object.keys(viaggioProcessed).filter(key => !excludedFields.includes(key));
    const values = fields.map(field => viaggioProcessed[field as keyof typeof viaggioProcessed]);
    const setClause = fields.map(field => `\`${field}\` = ?`).join(', ');
    
    console.log('updateViaggioPodData - Campi da aggiornare (esclusi i generated):', fields);
    console.log('updateViaggioPodData - Valori:', values);
    console.log('updateViaggioPodData - SET clause:', setClause);
    
    if (fields.length === 0) {
      console.log('updateViaggioPodData - Nessun campo da aggiornare');
      return { affectedRows: 0 };
    }
    
    const sql = `UPDATE viaggi_pod SET ${setClause} WHERE ID = ?`;
    console.log('updateViaggioPodData - Query SQL:', sql);
    console.log('updateViaggioPodData - Parametri finali:', [...values, id]);
    
    const [result] = await pool.query(sql, [...values, id]);
    console.log(`updateViaggioPodData - Viaggio POD con id ${id} aggiornato con successo.`);
    console.log('updateViaggioPodData - Risultato query:', result);
    return result;
  } catch (error) {
    console.error(`updateViaggioPodData - Errore nell'aggiornamento del viaggio POD ${id}:`, error);
    console.error('updateViaggioPodData - Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    // Log dettagliato dell'errore MySQL
    if (error && typeof error === 'object') {
      console.error('updateViaggioPodData - Codice errore MySQL:', (error as any).code);
      console.error('updateViaggioPodData - Messaggio errore MySQL:', (error as any).sqlMessage);
      console.error('updateViaggioPodData - Query SQL che ha fallito:', (error as any).sql);
      console.error('updateViaggioPodData - Stato SQL:', (error as any).sqlState);
    }
    
    throw new Error('Impossibile aggiornare il viaggio POD.');
  }
}

// --- FUNZIONE PER OTTENERE LE STATISTICHE DEI VIAGGI POD ---
export async function getViaggiPodStats(filters: FiltriViaggioPod = {}): Promise<ViaggiPodStats> {
  try {
    // Costruzione delle condizioni WHERE per i filtri
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    
    if (filters.viaggio) {
      whereConditions.push('`Viaggio` LIKE ?');
      queryParams.push(`%${filters.viaggio}%`);
    }
    
    if (filters.magazzino) {
      whereConditions.push('`Magazzino di partenza` = ?');
      queryParams.push(filters.magazzino);
    }
    
    if (filters.trasportatore) {
      whereConditions.push('`Nome Trasportatore` = ?');
      queryParams.push(filters.trasportatore);
    }
    
    if (filters.dataInizio) {
      whereConditions.push('`Data Inizio` >= ?');
      queryParams.push(filters.dataInizio);
    }
    
    if (filters.dataFine) {
      whereConditions.push('`Data Fine` <= ?');
      queryParams.push(filters.dataFine);
    }
    
    if (filters.mese) {
      whereConditions.push('`Mese` = ?');
      queryParams.push(filters.mese);
    }
    
    if (filters.trimestre) {
      whereConditions.push('`Trimestre` = ?');
      queryParams.push(filters.trimestre);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query per le statistiche
    const statsSql = `
      SELECT 
        COUNT(*) as totalRecords,
        SUM(COALESCE(Km, 0)) as totalKm,
        SUM(COALESCE(Colli, 0)) as totalColli,
        SUM(COALESCE(\`Peso (Kg)\`, 0)) as totalPeso,
        SUM(COALESCE(Ore_Pod, 0)) as totalOre,
        SUM(COALESCE(Toccate, 0)) as totalToccate,
        SUM(COALESCE(Ordini, 0)) as totalOrdini
      FROM viaggi_pod ${whereClause}
    `;
    
    const [statsResult] = await pool.query(statsSql, queryParams);
    const stats = (statsResult as any[])[0];
    
    // Query per i viaggi del mese corrente
    const currentMonth = new Date().getMonth() + 1;
    const monthSql = `
      SELECT COUNT(*) as viaggiMeseCorrente
      FROM viaggi_pod 
      ${whereClause ? `${whereClause} AND` : 'WHERE'} Mese = ?
    `;
    
    const [monthResult] = await pool.query(monthSql, [...queryParams, currentMonth]);
    const monthStats = (monthResult as any[])[0];
    
    return {
      totalViaggi: stats.totalRecords || 0,
      totalKm: stats.totalKm || 0,
      totalColli: stats.totalColli || 0,
      totalPeso: stats.totalPeso || 0,
      totalOrePod: stats.totalOre || 0,
      totalToccate: stats.totalToccate || 0,
      totalOrdini: stats.totalOrdini || 0,
      viaggiMeseCorrente: monthStats.viaggiMeseCorrente || 0
    };
  } catch (error) {
    console.error('Errore nel recuperare le statistiche viaggi POD:', error);
    return {
      totalViaggi: 0,
      totalKm: 0,
      totalColli: 0,
      totalPeso: 0,
      totalOrePod: 0,
      totalToccate: 0,
      totalOrdini: 0,
      viaggiMeseCorrente: 0
    };
  }
}

// --- FUNZIONE PER OTTENERE I VALORI DISTINTI PER I FILTRI ---
export async function getFilterOptionsViaggiPod() {
  try {
    // Query per ottenere tutti i valori distinti
    const viaggioSql = 'SELECT DISTINCT `Viaggio` FROM viaggi_pod WHERE `Viaggio` IS NOT NULL AND `Viaggio` != "" ORDER BY `Viaggio`';
    const magazzinoSql = 'SELECT DISTINCT `Magazzino di partenza` FROM viaggi_pod WHERE `Magazzino di partenza` IS NOT NULL AND `Magazzino di partenza` != "" ORDER BY `Magazzino di partenza`';
    const trasportatoreSql = 'SELECT DISTINCT `Nome Trasportatore` FROM viaggi_pod WHERE `Nome Trasportatore` IS NOT NULL AND `Nome Trasportatore` != "" ORDER BY `Nome Trasportatore`';
    const meseSql = 'SELECT DISTINCT `Mese` FROM viaggi_pod WHERE `Mese` IS NOT NULL ORDER BY `Mese`';
    const trimestreSql = 'SELECT DISTINCT `Trimestre` FROM viaggi_pod WHERE `Trimestre` IS NOT NULL ORDER BY `Trimestre`';
    
    const [viaggi] = await pool.query(viaggioSql);
    const [magazzini] = await pool.query(magazzinoSql);
    const [trasportatori] = await pool.query(trasportatoreSql);
    const [mesi] = await pool.query(meseSql);
    const [trimestri] = await pool.query(trimestreSql);
    
    return {
      viaggi: (viaggi as { Viaggio: string }[]).map(row => row.Viaggio),
      magazzini: (magazzini as { 'Magazzino di partenza': string }[]).map(row => row['Magazzino di partenza']),
      trasportatori: (trasportatori as { 'Nome Trasportatore': string }[]).map(row => row['Nome Trasportatore']),
      mesi: (mesi as { Mese: number }[]).map(row => row.Mese),
      trimestri: (trimestri as { Trimestre: number }[]).map(row => row.Trimestre)
    };
  } catch (error) {
    console.error('Errore nel recuperare le opzioni dei filtri viaggi POD:', error);
    return {
      viaggi: [],
      magazzini: [],
      trasportatori: [],
      mesi: [],
      trimestri: []
    };
  }
}