import { NextResponse } from 'next/server';
import { createPool } from 'mysql2/promise';

export async function POST() {
  let connection;
  
  try {
    console.log('📥 API Import Terzisti - Inizio import dati');

    // Crea connessione al database
    connection = await createPool({
      host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
      user: process.env.DB_GESTIONE_USER || 'root',
      password: process.env.DB_GESTIONE_PASS || '',
      database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }).getConnection();

    // 1. Verifica tabella destinazione
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'gestionelogistica' 
      AND TABLE_NAME = 'tab_delivery_terzisti'
    `) as [any[], any];

    if (tables.length === 0) {
      return NextResponse.json(
        { error: 'Tabella tab_delivery_terzisti non trovata! Eseguire prima il comando SQL per creare la tabella.' },
        { status: 400 }
      );
    }

    // 2. Conta record esistenti
    const [existingCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM tab_delivery_terzisti
    `);
    console.log(`📊 Record esistenti: ${(existingCount as any[])[0].count}`);

    // 3. Query per estrarre dati con JOIN e filtri (CORRETTA)
    const extractQuery = `
      SELECT 
        fd.id,
        fd.\`div\`,
        fd.bu,
        fd.dep,
        fd.data_mov_merce,
        fd.viaggio,
        fd.ordine,
        fd.consegna_num,
        tv.Cod_Vettore,
        fd.descr_vettore,
        fd.tipologia,
        fd.cod_articolo,
        fd.descr_articolo,
        fd.colli,
        NULL as peso,
        NULL as volume,
        fd.compenso,
        fd.tr_cons,
        fd.tot_compenso,
        fd.cod_cliente,
        fd.ragione_sociale,
        fd.classe_prod,
        fd.classe_tariffa,
        -- Campi da tab_vettori (usando descr_vettore come chiave di join)
        tv.Descr_Vettore as Descr_Vettore_Join,
        tv.Tipo_Vettore,
        tv.Azienda_Vettore,
        -- Campo da tab_viaggi (tabella viaggi corretta)
        tvi.data as data_viaggio
      FROM fatt_delivery fd
      INNER JOIN tab_vettori tv ON fd.descr_vettore = tv.Descr_Vettore
      INNER JOIN tab_viaggi tvi ON fd.viaggio = tvi.viaggio
      WHERE fd.\`div\` IN ('W007', 'W009')
      AND tv.Tipo_Vettore = 'Terzista'
      AND fd.tipologia = 'Consegna pieni'
      ORDER BY fd.data_mov_merce DESC
    `;

    const [sourceData] = await connection.execute(extractQuery);
    console.log(`📈 Record estratti da fatt_delivery: ${(sourceData as any[]).length}`);

    if ((sourceData as any[]).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun record trovato con i filtri specificati',
        insertedCount: 0,
        totalRecords: 0
      });
    }

    // 4. Inserimento dati nella tabella terzisti
    let insertedCount = 0;
    let errorCount = 0;
    const batchSize = 1000;

    for (let i = 0; i < (sourceData as any[]).length; i += batchSize) {
      const batch = (sourceData as any[]).slice(i, i + batchSize);
      
      try {
        // Prepara i valori per l'inserimento batch (CORRETTI)
        const values = batch.map(record => [
          record.div,
          record.bu,
          record.dep,
          record.data_mov_merce,
          record.viaggio,
          record.ordine,
          record.consegna_num,
          record.Cod_Vettore,
          record.descr_vettore,
          record.tipologia,
          record.cod_articolo,
          record.descr_articolo,
          record.colli,
          record.peso,
          record.volume,
          record.compenso,
          record.tr_cons,
          record.tot_compenso,
          record.cod_cliente,
          record.ragione_sociale,
          record.classe_prod,
          record.classe_tariffa,
          record.Descr_Vettore_Join,
          record.Tipo_Vettore,
          record.Azienda_Vettore,
          record.data_viaggio
        ]);

        const insertQuery = `
          INSERT IGNORE INTO tab_delivery_terzisti (
            \`div\`, bu, dep, data_mov_merce, viaggio, ordine, consegna_num,
            Cod_Vettore, descr_vettore, tipologia, cod_articolo, descr_articolo,
            colli, peso, volume, compenso, tr_cons, tot_compenso,
            cod_cliente, ragione_sociale, classe_prod, classe_tariffa,
            Descr_Vettore_Join, Tipo_Vettore, Azienda_Vettore, data_viaggio
          ) VALUES ?
        `;

        await connection.query(insertQuery, [values]);
        insertedCount += batch.length;
        
        console.log(`📊 Processati ${i + batch.length} / ${(sourceData as any[]).length} record`);

      } catch (error) {
        console.log(`❌ Errore batch ${i}-${i + batch.length}: ${(error as Error).message}`);
        errorCount += batch.length;
      }
    }

    // 5. Verifica finale
    const [finalCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM tab_delivery_terzisti
    `);

    // 6. Statistiche per divisione
    const [statsByDiv] = await connection.execute(`
      SELECT 
        \`div\`,
        COUNT(*) as total_records,
        COUNT(DISTINCT Cod_Vettore) as unique_vettori,
        COUNT(DISTINCT viaggio) as unique_viaggi,
        SUM(tot_compenso) as total_compenso
      FROM tab_delivery_terzisti
      GROUP BY \`div\`
      ORDER BY \`div\`
    `);

    console.log('✅ Import completato!');

    return NextResponse.json({
      success: true,
      message: 'Import dati completato con successo',
      insertedCount,
      errorCount,
      totalRecords: (finalCount as any[])[0].count,
      statsByDivision: statsByDiv
    });

  } catch (error) {
    console.error('❌ Errore durante l\'import:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Errore interno del server',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
