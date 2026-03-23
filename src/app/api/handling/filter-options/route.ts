import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Ottieni il tipo di vista (raggruppata o dettagliata)
    const viewType = searchParams.get('viewType') || 'grouped';
    
    // Query DISTINCT in batch (max 4 parallele) per non saturare il pool verso MySQL (limite connessioni basso su DB gestito)
    const queryFactories: Array<() => Promise<{ key: string; data: unknown[] }>> = [
      () =>
        pool.execute('SELECT DISTINCT bu FROM fatt_handling WHERE bu IS NOT NULL AND bu != \'\' ORDER BY bu')
          .then(([rows]) => ({ key: 'bu', data: (rows as any[]).map(row => row.bu) }))
          .catch(err => { console.error('Errore query bu:', err); return { key: 'bu', data: [] }; }),
      () =>
        pool.execute('SELECT DISTINCT `div` FROM fatt_handling WHERE `div` IS NOT NULL AND `div` != \'\' ORDER BY `div`')
          .then(([rows]) => ({ key: 'divisioni', data: (rows as any[]).map(row => row.div) }))
          .catch(err => { console.error('Errore query divisioni:', err); return { key: 'divisioni', data: [] }; }),
      () =>
        pool.execute('SELECT DISTINCT dep FROM fatt_handling WHERE dep IS NOT NULL AND dep != \'\' ORDER BY dep')
          .then(([rows]) => ({ key: 'depositi', data: (rows as any[]).map(row => row.dep) }))
          .catch(err => { console.error('Errore query depositi:', err); return { key: 'depositi', data: [] }; }),
      () =>
        pool.execute('SELECT DISTINCT tipo_movimento FROM fatt_handling WHERE tipo_movimento IS NOT NULL AND tipo_movimento != \'\' ORDER BY tipo_movimento')
          .then(([rows]) => ({ key: 'tipiMovimento', data: (rows as any[]).map(row => row.tipo_movimento) }))
          .catch(err => { console.error('Errore query tipiMovimento:', err); return { key: 'tipiMovimento', data: [] }; }),
      () =>
        pool.execute('SELECT DISTINCT doc_acq FROM fatt_handling WHERE doc_acq IS NOT NULL AND doc_acq != \'\' ORDER BY doc_acq LIMIT 100')
          .then(([rows]) => ({ key: 'docAcq', data: (rows as any[]).map(row => row.doc_acq) }))
          .catch(err => { console.error('Errore query docAcq:', err); return { key: 'docAcq', data: [] }; }),
      () =>
        pool.execute('SELECT DISTINCT doc_mat FROM fatt_handling WHERE doc_mat IS NOT NULL AND doc_mat != \'\' ORDER BY doc_mat LIMIT 100')
          .then(([rows]) => ({ key: 'docMat', data: (rows as any[]).map(row => row.doc_mat) }))
          .catch(err => { console.error('Errore query docMat:', err); return { key: 'docMat', data: [] }; }),
      () =>
        pool.execute('SELECT DISTINCT tipo_imb FROM fatt_handling WHERE tipo_imb IS NOT NULL AND tipo_imb != \'\' ORDER BY tipo_imb')
          .then(([rows]) => ({ key: 'tipiImb', data: (rows as any[]).map(row => row.tipo_imb) }))
          .catch(err => { console.error('Errore query tipiImb:', err); return { key: 'tipiImb', data: [] }; }),
      () =>
        pool.execute(`
        SELECT DISTINCT COALESCE(mese_fatturazione, mese) as mese
        FROM fatt_handling 
        WHERE (mese_fatturazione IS NOT NULL OR mese IS NOT NULL)
        GROUP BY COALESCE(mese_fatturazione, mese)
        HAVING COUNT(*) > 0 
        ORDER BY mese ASC
      `)
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
                if (/^\d{1,2}$/.test(String(mese))) {
                  const meseNum = parseInt(String(mese));
                  return mesiNomi[meseNum - 1] || mese;
                }
                return mese;
              })
            };
          })
          .catch(err => { console.error('Errore query mesi:', err); return { key: 'mesi', data: [] }; }),
      () =>
        pool.execute(`
        SELECT DISTINCT COALESCE(anno_fatturazione, YEAR(data_mov_m)) as anno
        FROM fatt_handling 
        WHERE (anno_fatturazione IS NOT NULL OR data_mov_m IS NOT NULL)
        GROUP BY COALESCE(anno_fatturazione, YEAR(data_mov_m))
        HAVING COUNT(*) > 0 
        ORDER BY anno DESC
      `)
          .then(([rows]) => ({
            key: 'anni',
            data: (rows as any[]).map(row => String(row.anno))
          }))
          .catch(err => { console.error('Errore query anni:', err); return { key: 'anni', data: [] }; })
    ];

    const queryResults: { key: string; data: unknown[] }[] = [];
    const PARALLEL_FILTERS = 4;
    for (let i = 0; i < queryFactories.length; i += PARALLEL_FILTERS) {
      const chunk = queryFactories.slice(i, i + PARALLEL_FILTERS).map((f) => f());
      queryResults.push(...(await Promise.all(chunk)));
    }
    
    // Costruisci l'oggetto results
    const results: any = {
      bu: [],
      divisioni: [],
      depositi: [],
      tipiMovimento: [],
      docAcq: [],
      docMat: [],
      tipiImb: [],
      mesi: [],
      anni: []
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
        mesi: [],
        anni: []
      },
      { status: 500 }
    );
  }
}