// src/lib/data-viaggi.ts
import pool from './db-viaggi';

// Aggiorniamo il tipo per corrispondere alle colonne reali
export type Viaggio = {
  id: string;
  deposito: string;
  numeroViaggio: string;
  nominativoId: string | null;
  affiancatoDaId: string | null;
  totaleColli: number | null;
  dataOraInizioViaggio: string | null;
  dataOraFineViaggio: string | null;
  targaMezzoId: string | null;
  kmIniziali: number | null;
  kmFinali: number | null;
  kmAlRifornimento: number | null;
  litriRiforniti: number | null;
  euroLitro: number | null;
  haiEffettuatoRitiri: boolean | null;
  updatedAt: string | null;
  createdAt: string | null;
  kmEffettivi: number | null;
  oreEffettive: number | null;
  mese: number | null;
};

// --- FUNZIONE PER LEGGERE I VIAGGI CON PAGINAZIONE E ORDINAMENTO ---
export async function getViaggiData(
  currentPage: number = 1, 
  recordsPerPage: number = 20,
  sortBy: string = 'dataOraInizioViaggio',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<{ viaggi: Viaggio[], totalPages: number, totalRecords: number }> {
  try {
    const offset = (currentPage - 1) * recordsPerPage;
    
    // Validiamo i campi di ordinamento permessi
    const allowedSortFields = ['numeroViaggio', 'deposito', 'nominativoId', 'dataOraInizioViaggio', 'dataOraFineViaggio', 'targaMezzoId', 'haiEffettuatoRitiri', 'mese'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'dataOraInizioViaggio';
    const validSortOrder = sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : 'DESC';
    
    // Query per ottenere i dati della pagina corrente
    const dataSql = `
      SELECT 
        id, deposito, numeroViaggio, nominativoId, affiancatoDaId, totaleColli,
        dataOraInizioViaggio, dataOraFineViaggio, targaMezzoId, kmIniziali, kmFinali,
        kmAlRifornimento, litriRiforniti, euroLitro, haiEffettuatoRitiri,
        updatedAt, createdAt, kmEffettivi, oreEffettive, mese
      FROM travels 
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [recordsPerPage, offset]);
    
    // Query per contare il numero totale di record
    const countSql = 'SELECT COUNT(*) as total FROM travels';
    const [countResult] = await pool.query(countSql);
    const totalRecords = (countResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    return {
      viaggi: rows as Viaggio[],
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

// --- FUNZIONE PER CREARE UN NUOVO VIAGGIO ---
export async function createViaggioData(viaggio: { deposito: string, dataOraInizioViaggio: string }) {
  // Riceviamo i dati dal form
  const { deposito, dataOraInizioViaggio } = viaggio; 
  try {
    // Usiamo i nomi delle colonne corrette per l'inserimento
    const sql = 'INSERT INTO travels (deposito, dataOraInizioViaggio) VALUES (?, ?)';
    const [result] = await pool.query(sql, [deposito, dataOraInizioViaggio]);
    console.log('Viaggio inserito con successo nel DB:', result);
    return result;
  } catch (error) {
    console.error('Errore nella creazione del viaggio:', error);
    throw new Error('Impossibile creare il viaggio.');
  }
}

// src/lib/data-viaggi.ts

// ... le tue funzioni getViaggiData e createViaggioData sono già qui ...

// --- FUNZIONE PER ELIMINARE UN VIAGGIO ---
export async function deleteViaggioData(id: string) {
  try {
    // Assicurati che il nome della tabella 'travels' sia corretto
    const sql = 'DELETE FROM travels WHERE id = ?';
    const [result] = await pool.query(sql, [id]);
    console.log(`Viaggio con id ${id} eliminato con successo.`);
    return result;
  } catch (error) {
    console.error(`Errore nell'eliminazione del viaggio ${id}:`, error);
    throw new Error('Impossibile eliminare il viaggio.');
  }
}

// --- FUNZIONE PER LEGGERE UN SINGOLO VIAGGIO TRAMITE ID ---
export async function getViaggioById(id: string): Promise<Viaggio | null> {
  try {
    const sql = `
      SELECT 
        id, deposito, numeroViaggio, nominativoId, affiancatoDaId, totaleColli,
        dataOraInizioViaggio, dataOraFineViaggio, targaMezzoId, kmIniziali, kmFinali,
        kmAlRifornimento, litriRiforniti, euroLitro, haiEffettuatoRitiri,
        updatedAt, createdAt, kmEffettivi, oreEffettive, mese
      FROM travels WHERE id = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    return (rows as Viaggio[])[0] || null; // Restituisce il primo risultato o null se non trovato
  } catch (error) {
    console.error(`Errore nel recuperare il viaggio ${id}:`, error);
    return null;
  }
}

// --- FUNZIONE PER AGGIORNARE UN VIAGGIO ---
export async function updateViaggioData(id: string, viaggio: { deposito: string, dataOraInizioViaggio: string }) {
  const { deposito, dataOraInizioViaggio } = viaggio;
  try {
    const sql = 'UPDATE travels SET deposito = ?, dataOraInizioViaggio = ? WHERE id = ?';
    const [result] = await pool.query(sql, [deposito, dataOraInizioViaggio, id]);
    console.log(`Viaggio con id ${id} aggiornato con successo.`);
    return result;
  } catch (error) {
    console.error(`Errore nell'aggiornamento del viaggio ${id}:`, error);
    throw new Error('Impossibile aggiornare il viaggio.');
  }
}

// --- FUNZIONE PER OTTENERE LE STATISTICHE DEI VIAGGI ---
export async function getViaggiStats(currentPage: number = 1, recordsPerPage: number = 20) {
  try {
    // Query per contare il totale dei record
    const countSql = 'SELECT COUNT(*) as total FROM travels';
    const [countResult] = await pool.query(countSql);
    const totalRecords = (countResult as { total: number }[])[0].total;

    // Calcoliamo le pagine reali
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    // Calcoliamo quanti record sono effettivamente nella pagina corrente
    const offset = (currentPage - 1) * recordsPerPage;
    const remainingRecords = totalRecords - offset;
    const actualRecordsInPage = Math.min(recordsPerPage, Math.max(0, remainingRecords));

    return {
      totalRecords,
      totalPages,
      recordsPerPage: actualRecordsInPage
    };
  } catch (error) {
    console.error('Errore nel recuperare le statistiche:', error);
    return {
      totalRecords: 0,
      totalPages: 0,
      recordsPerPage: 0
    };
  }
}

// --- FUNZIONE PER OTTENERE I VALORI DISTINTI PER I FILTRI ---
export async function getFilterOptions() {
  try {
    // Query per ottenere tutti i valori distinti
    const depositiSql = 'SELECT DISTINCT deposito FROM travels WHERE deposito IS NOT NULL AND deposito != "" ORDER BY deposito';
    const nominativiSql = 'SELECT DISTINCT nominativoId FROM travels WHERE nominativoId IS NOT NULL AND nominativoId != "" ORDER BY nominativoId';
    const targheSql = 'SELECT DISTINCT targaMezzoId FROM travels WHERE targaMezzoId IS NOT NULL AND targaMezzoId != "" ORDER BY targaMezzoId';
    
    const [depositi] = await pool.query(depositiSql);
    const [nominativi] = await pool.query(nominativiSql);
    const [targhe] = await pool.query(targheSql);
    
    return {
      depositi: (depositi as { deposito: string }[]).map(row => row.deposito),
      nominativi: (nominativi as { nominativoId: string }[]).map(row => row.nominativoId),
      targhe: (targhe as { targaMezzoId: string }[]).map(row => row.targaMezzoId)
    };
  } catch (error) {
    console.error('Errore nel recuperare le opzioni dei filtri:', error);
    return {
      depositi: [],
      nominativi: [],
      targhe: []
    };
  }
}

// --- FUNZIONE PER FILTRARE I VIAGGI CON ORDINAMENTO ---
export async function getViaggiFiltrati(
  currentPage: number = 1, 
  recordsPerPage: number = 20,
  sortBy: string = 'dataOraInizioViaggio',
  sortOrder: 'ASC' | 'DESC' = 'DESC',
  filters: {
    dataDa?: string;
    dataA?: string;
    deposito?: string;
    nominativoId?: string;
    numeroViaggio?: string;
    targaMezzoId?: string;
    mese?: string;
  }
): Promise<{ viaggi: Viaggio[], totalPages: number, totalRecords: number }> {
  try {
    const offset = (currentPage - 1) * recordsPerPage;
    
    // Validiamo i campi di ordinamento permessi
    const allowedSortFields = ['numeroViaggio', 'deposito', 'nominativoId', 'dataOraInizioViaggio', 'dataOraFineViaggio', 'targaMezzoId', 'haiEffettuatoRitiri', 'mese'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'dataOraInizioViaggio';
    const validSortOrder = sortOrder === 'ASC' || sortOrder === 'DESC' ? sortOrder : 'DESC';
    
    // Costruiamo la query WHERE dinamicamente
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];
    
    if (filters.dataDa) {
      whereConditions.push('data_viaggio >= ?');
      queryParams.push(filters.dataDa);
    }
    
    if (filters.dataA) {
      whereConditions.push('data_viaggio <= ?');
      queryParams.push(filters.dataA);
    }
    
    if (filters.deposito) {
      whereConditions.push('deposito = ?');
      queryParams.push(filters.deposito);
    }
    
    if (filters.nominativoId) {
      whereConditions.push('nominativoId = ?');
      queryParams.push(filters.nominativoId);
    }
    
    if (filters.numeroViaggio) {
      whereConditions.push('numeroViaggio LIKE ?');
      queryParams.push(`%${filters.numeroViaggio}%`);
    }
    
    if (filters.targaMezzoId) {
      whereConditions.push('targaMezzoId = ?');
      queryParams.push(filters.targaMezzoId);
    }
    
    if (filters.mese) {
      whereConditions.push('mese = ?');
      queryParams.push(filters.mese);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query per ottenere i dati filtrati
    const dataSql = `
      SELECT 
        id, deposito, numeroViaggio, nominativoId, affiancatoDaId, totaleColli,
        dataOraInizioViaggio, dataOraFineViaggio, targaMezzoId, kmIniziali, kmFinali,
        kmAlRifornimento, litriRiforniti, euroLitro, haiEffettuatoRitiri,
        updatedAt, createdAt, kmEffettivi, oreEffettive, mese
      FROM travels 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await pool.query(dataSql, [...queryParams, recordsPerPage, offset]);
    
    // Query per contare i record filtrati
    const countSql = `SELECT COUNT(*) as total FROM travels ${whereClause}`;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalRecords = (countResult as { total: number }[])[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    return {
      viaggi: rows as Viaggio[],
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