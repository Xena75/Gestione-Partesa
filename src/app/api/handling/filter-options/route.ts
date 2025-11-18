import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Ottieni il tipo di vista (raggruppata o dettagliata)
    const viewType = searchParams.get('viewType') || 'grouped';
    
    // Query per ottenere i valori distinti per ogni filtro - eseguite in parallelo usando il pool
    const queryPromises = [
      // BU
      pool.execute('SELECT DISTINCT bu FROM fatt_handling WHERE bu IS NOT NULL AND bu != "" ORDER BY bu')
        .then(([rows]) => ({ key: 'bu', data: (rows as any[]).map(row => row.bu) }))
        .catch(err => { console.error('Errore query bu:', err); return { key: 'bu', data: [] }; }),
      
      // Divisioni
      pool.execute('SELECT DISTINCT `div` FROM fatt_handling WHERE `div` IS NOT NULL AND `div` != "" ORDER BY `div`')
        .then(([rows]) => ({ key: 'divisioni', data: (rows as any[]).map(row => row.div) }))
        .catch(err => { console.error('Errore query divisioni:', err); return { key: 'divisioni', data: [] }; }),
      
      // Depositi
      pool.execute('SELECT DISTINCT dep FROM fatt_handling WHERE dep IS NOT NULL AND dep != "" ORDER BY dep')
        .then(([rows]) => ({ key: 'depositi', data: (rows as any[]).map(row => row.dep) }))
        .catch(err => { console.error('Errore query depositi:', err); return { key: 'depositi', data: [] }; }),
      
      // Tipi Movimento
      pool.execute('SELECT DISTINCT tipo_movimento FROM fatt_handling WHERE tipo_movimento IS NOT NULL AND tipo_movimento != "" ORDER BY tipo_movimento')
        .then(([rows]) => ({ key: 'tipiMovimento', data: (rows as any[]).map(row => row.tipo_movimento) }))
        .catch(err => { console.error('Errore query tipiMovimento:', err); return { key: 'tipiMovimento', data: [] }; }),
      
      // Doc Acq
      pool.execute('SELECT DISTINCT doc_acq FROM fatt_handling WHERE doc_acq IS NOT NULL AND doc_acq != "" ORDER BY doc_acq LIMIT 100')
        .then(([rows]) => ({ key: 'docAcq', data: (rows as any[]).map(row => row.doc_acq) }))
        .catch(err => { console.error('Errore query docAcq:', err); return { key: 'docAcq', data: [] }; }),
      
      // Doc Mat
      pool.execute('SELECT DISTINCT doc_mat FROM fatt_handling WHERE doc_mat IS NOT NULL AND doc_mat != "" ORDER BY doc_mat LIMIT 100')
        .then(([rows]) => ({ key: 'docMat', data: (rows as any[]).map(row => row.doc_mat) }))
        .catch(err => { console.error('Errore query docMat:', err); return { key: 'docMat', data: [] }; }),
      
      // Tipi Imballo
      pool.execute('SELECT DISTINCT tipo_imb FROM fatt_handling WHERE tipo_imb IS NOT NULL AND tipo_imb != "" ORDER BY tipo_imb')
        .then(([rows]) => ({ key: 'tipiImb', data: (rows as any[]).map(row => row.tipo_imb) }))
        .catch(err => { console.error('Errore query tipiImb:', err); return { key: 'tipiImb', data: [] }; }),
      
      // Mesi
      pool.execute('SELECT DISTINCT mese FROM fatt_handling WHERE mese IS NOT NULL AND mese != "" ORDER BY mese')
        .then(([rows]) => {
          const mesiNomi = [
            '01-Gennaio', '02-Febbraio', '03-Marzo', '04-Aprile',
            '05-Maggio', '06-Giugno', '07-Luglio', '08-Agosto',
            '09-Settembre', '10-Ottobre', '11-Novembre', '12-Dicembre'
          ];
          return {
            key: 'mesi',
            data: (rows as any[]).map(row => {
              const mese = row.mese;
              if (/^\d{1,2}$/.test(mese)) {
                const meseNum = parseInt(mese);
                return mesiNomi[meseNum - 1] || mese;
              }
              return mese;
            })
          };
        })
        .catch(err => { console.error('Errore query mesi:', err); return { key: 'mesi', data: [] }; })
    ];
    
    // Esegui tutte le query in parallelo usando il pool di connessioni
    const queryResults = await Promise.all(queryPromises);
    
    // Costruisci l'oggetto results
    const results: any = {
      bu: [],
      divisioni: [],
      depositi: [],
      tipiMovimento: [],
      docAcq: [],
      docMat: [],
      tipiImb: [],
      mesi: []
    };
    
    queryResults.forEach(result => {
      results[result.key] = result.data;
    });
    
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
        docMat: [],
        tipiImb: [],
        mesi: []
      },
      { status: 500 }
    );
  }
}