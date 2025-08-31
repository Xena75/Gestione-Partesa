// src/lib/data.ts
import pool from './db-viaggi'; // <-- Usa la tua connessione al DB dei viaggi

// Il tipo rimane lo stesso
export type Partenza = {
  id: number;
  destinazione: string;
  data: string;
  note: string;
};

// --- FUNZIONE PER LEGGERE TUTTE LE PARTENZE DAL VERO DATABASE ---
export async function getPartenzeData(): Promise<Partenza[]> {
  try {
    // SOSTITUISCI 'travels' con il nome reale della tua tabella.
    // Assicurati che le colonne (id, destinazione, ecc.) esistano nella tua tabella.
    const sql = 'SELECT id, destinazione, data, note FROM travels ORDER BY data DESC';
    const [rows] = await pool.query<Partenza[]>(sql);
    return rows;
  } catch (error) {
    console.error('Errore nel recuperare le partenze:', error);
    return []; // Restituisce un array vuoto in caso di errore
  }
}

// --- FUNZIONE PER CREARE UNA NUOVA PARTENZA NEL VERO DATABASE ---
export async function createPartenzaData(partenza: Omit<Partenza, 'id'>) {
  const { destinazione, data, note } = partenza;
  try {
    // SOSTITUISCI 'travels' e i nomi delle colonne se sono diversi.
    const sql = 'INSERT INTO travels (destinazione, data, note) VALUES (?, ?, ?)';
    
    // Usare i '?' è FONDAMENTALE per la sicurezza contro SQL Injection.
    const [result] = await pool.query(sql, [destinazione, data, note]);
    
    console.log('Partenza inserita con successo nel DB:', result);
    return result;
  } catch (error)
  {
    console.error('Errore nella creazione della partenza:', error);
    throw new Error('Impossibile creare la partenza.');
  }
}