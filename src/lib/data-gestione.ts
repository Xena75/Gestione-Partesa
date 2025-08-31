// src/lib/data-gestione.ts
import pool from './db-gestione';

export type FatturaDelivery = {
  id: number;
  ragione_sociale: string;
  viaggio: string;
  data_mov_merce: string;
  tot_compenso: number;
};

// Definiamo il numero di risultati per pagina
const ITEMS_PER_PAGE = 50;

export async function getFattureData(currentPage: number) {
  try {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    // Query per ottenere i dati della pagina corrente
    const dataSql = `
      SELECT id, ragione_sociale, viaggio, data_mov_merce, tot_compenso 
      FROM fatt_delivery 
      ORDER BY data_mov_merce DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [ITEMS_PER_PAGE, offset]);

    // Query per contare il numero totale di record
    const countSql = 'SELECT COUNT(*) as total FROM fatt_delivery';
    const [countResult] = await pool.query(countSql);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return {
      fatture: rows as FatturaDelivery[],
      totalPages: totalPages,
    };
  } catch (error) {
    console.error('Errore nel recuperare i dati di delivery:', error);
    throw new Error('Errore nel recupero dati.');
  }
}
