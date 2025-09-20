import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestionelogistica',
  port: 3306
};

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Query per ottenere i valori distinti per ogni filtro
    const queries = {
      bu: 'SELECT DISTINCT bu FROM fatt_handling WHERE bu IS NOT NULL AND bu != "" ORDER BY bu',
      divisioni: 'SELECT DISTINCT `div` FROM fatt_handling WHERE `div` IS NOT NULL AND `div` != "" ORDER BY `div`',
      depositi: 'SELECT DISTINCT dep FROM fatt_handling WHERE dep IS NOT NULL AND dep != "" ORDER BY dep',
      tipiMovimento: 'SELECT DISTINCT tipo_movimento FROM fatt_handling WHERE tipo_movimento IS NOT NULL AND tipo_movimento != "" ORDER BY tipo_movimento',
      docAcq: 'SELECT DISTINCT doc_acq FROM fatt_handling WHERE doc_acq IS NOT NULL AND doc_acq != "" ORDER BY doc_acq LIMIT 100',
      tipiImb: 'SELECT DISTINCT tipo_imb FROM fatt_handling WHERE tipo_imb IS NOT NULL AND tipo_imb != "" ORDER BY tipo_imb',
      mesi: 'SELECT DISTINCT mese FROM fatt_handling WHERE mese IS NOT NULL AND mese != "" ORDER BY mese'
    };
    
    const results: any = {};
    
    // Esegui tutte le query
    for (const [key, query] of Object.entries(queries)) {
      try {
        const [rows] = await connection.execute(query);
        
        if (key === 'bu') {
          results.bu = (rows as any[]).map(row => row.bu);
        } else if (key === 'divisioni') {
          results.divisioni = (rows as any[]).map(row => row.div);
        } else if (key === 'depositi') {
          results.depositi = (rows as any[]).map(row => row.dep);
        } else if (key === 'tipiMovimento') {
          results.tipiMovimento = (rows as any[]).map(row => row.tipo_movimento);
        } else if (key === 'docAcq') {
          results.docAcq = (rows as any[]).map(row => row.doc_acq);
        } else if (key === 'tipiImb') {
          results.tipiImb = (rows as any[]).map(row => row.tipo_imb);
        } else if (key === 'mesi') {
          // Formatta i mesi per una migliore visualizzazione
          results.mesi = (rows as any[]).map(row => {
            const mese = row.mese;
            // Se il mese è in formato numerico, convertilo in nome
            if (/^\d{1,2}$/.test(mese)) {
              const mesiNomi = [
                '01-Gennaio', '02-Febbraio', '03-Marzo', '04-Aprile',
                '05-Maggio', '06-Giugno', '07-Luglio', '08-Agosto',
                '09-Settembre', '10-Ottobre', '11-Novembre', '12-Dicembre'
              ];
              const meseNum = parseInt(mese);
              return mesiNomi[meseNum - 1] || mese;
            }
            return mese;
          });
        }
      } catch (queryError) {
        console.error(`Errore nella query ${key}:`, queryError);
        // Imposta un array vuoto in caso di errore
        if (key === 'bu') results.bu = [];
        else if (key === 'divisioni') results.divisioni = [];
        else if (key === 'depositi') results.depositi = [];
        else if (key === 'tipiMovimento') results.tipiMovimento = [];
        else if (key === 'docAcq') results.docAcq = [];
        else if (key === 'tipiImb') results.tipiImb = [];
        else if (key === 'mesi') results.mesi = [];
      }
    }
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('Errore nel caricamento delle opzioni filtri:', error);
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        bu: [],
        divisioni: [],
        depositi: [],
        tipiMovimento: [],
        docAcq: [],
        tipiImb: [],
        mesi: []
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}