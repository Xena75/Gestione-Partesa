// src/lib/data.ts
import pool from './db-viaggi';

export type Partenza = {
  id: number;
  destinazione: string;
  data: string;
  note: string;
};

// --- FUNZIONE PER LEGGERE TUTTE LE PARTENZE (CORRETTA) ---
export async function getPartenzeData(): Promise<Partenza[]> {
  try {
    const sql = 'SELECT id, destinazione, data, note FROM travels ORDER BY data DESC';
    
    // 1. Lasciamo che la query restituisca il suo tipo generico, senza forzarlo qui.
    const [rows] = await pool.query(sql);
    
    // 2. Solo alla fine, diciamo a TypeScript che questo risultato è un array di Partenza.
    return rows as Partenza[];

  } catch (error) {
    console.error('Errore nel recuperare le partenze:', error);
    return [];
  }
}

// --- FUNZIONE PER CREARE UNA NUOVA PARTENZA (invariata) ---
export async function createPartenzaData(partenza: Omit<Partenza, 'id'>) {
  const { destinazione, data, note } = partenza;
  try {
    const sql = 'INSERT INTO travels (destinazione, data, note) VALUES (?, ?, ?)';
    const [result] = await pool.query(sql, [destinazione, data, note]);
    console.log('Partenza inserita con successo nel DB:', result);
    return result;
  } catch (error) {
    console.error('Errore nella creazione della partenza:', error);
    throw new Error('Impossibile creare la partenza.');
  }
}