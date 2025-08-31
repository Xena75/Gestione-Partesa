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
};

// --- FUNZIONE PER LEGGERE I VIAGGI ---
export async function getViaggiData(): Promise<Viaggio[]> {
  try {
    // Selezioniamo tutte le colonne disponibili - usando i nomi reali del database
    const sql = `
      SELECT 
        id, deposito, numeroViaggio, nominativoId, affiancatoDaId, totaleColli,
        dataOraInizioViaggio, dataOraFineViaggio, targaMezzoId, kmIniziali, kmFinali,
        kmAlRifornimento, litriRiforniti, euroLitro, haiEffettuatoRitiri,
        updatedAt, createdAt, kmEffettivi, oreEffettive
      FROM travels 
      ORDER BY dataOraInizioViaggio DESC
      LIMIT 100
    `;
    const [rows] = await pool.query(sql);
    return rows as Viaggio[];
  } catch (error) {
    console.error('Errore nel recuperare i viaggi:', error);
    return [];
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
        updatedAt, createdAt, kmEffettivi, oreEffettive
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