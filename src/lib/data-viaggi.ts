// src/lib/data-viaggi.ts
import pool from './db-viaggi';

// Aggiorniamo il tipo per corrispondere alle colonne reali
export type Viaggio = {
  id: number;
  deposito: string;
  dataOraInizioViaggio: string;
};

// --- FUNZIONE PER LEGGERE I VIAGGI ---
export async function getViaggiData(): Promise<Viaggio[]> {
  try {
    // Usiamo i nomi delle colonne corrette: deposito, dataOraInizioViaggio
    const sql = 'SELECT id, deposito, dataOraInizioViaggio FROM travels ORDER BY dataOraInizioViaggio DESC';
    const [rows] = await pool.query(sql);
    return rows as Viaggio[];
  } catch (error) {
    console.error('Errore nel recuperare i viaggi:', error);
    return [];
  }
}

// --- FUNZIONE PER CREARE UN NUOVO VIAGGIO ---
export async function createViaggioData(viaggio: { deposito: string, data: string }) {
  // Riceviamo 'data' dal form e la usiamo per 'dataOraInizioViaggio'
  const { deposito, data } = viaggio; 
  try {
    // Usiamo i nomi delle colonne corrette per l'inserimento
    const sql = 'INSERT INTO travels (deposito, dataOraInizioViaggio) VALUES (?, ?)';
    const [result] = await pool.query(sql, [deposito, data]);
    console.log('Viaggio inserito con successo nel DB:', result);
    return result;
  } catch (error) {
    console.error('Errore nella creazione del viaggio:', error);
    throw new Error('Impossibile creare il viaggio.');
  }
}