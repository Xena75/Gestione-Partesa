const mysql = require('mysql2/promise');

async function importTerzistiMonthly() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'gestionelogistica'
    });

    console.log('📥 IMPORT MENSILE DATI TERZISTI');
    console.log('=' .repeat(50));

    // 1. Verifica tabella destinazione
    console.log('\n📋 Verifica tabella tab_delivery_terzisti...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'gestionelogistica' 
      AND TABLE_NAME = 'tab_delivery_terzisti'
    `);

    if (tables.length === 0) {
      console.log('❌ Tabella tab_delivery_terzisti non trovata!');
      console.log('🔧 Eseguire prima il comando SQL per creare la tabella');
      return;
    }
    console.log('✅ Tabella tab_delivery_terzisti trovata');

    // 2. Conta record esistenti
    const [existingCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM tab_delivery_terzisti
    `);
    console.log(`📊 Record esistenti: ${existingCount[0].count}`);

    // 3. Query per estrarre dati con JOIN e filtri
    console.log('\n🔍 Estrazione dati con JOIN e filtri...');
    console.log('📋 Filtri applicati:');
    console.log('   - Divisioni: W007, W009');
    console.log('   - Tipo Vettore: Terzista');
    console.log('   - Tipologia: Consegna pieni');

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
        fd.Cod_Vettore,
        fd.descr_vettore,
        fd.tipologia,
        fd.cod_articolo,
        fd.descr_articolo,
        fd.colli,
        fd.peso,
        fd.volume,
        fd.compenso,
        fd.tr_cons,
        fd.tot_compenso,
        fd.cod_cliente,
        fd.ragione_sociale,
        fd.classe_prod,
        fd.classe_tariffa,
        -- Campi da tab_vettori
        tv.Descr_Vettore as Descr_Vettore_Join,
        tv.Tipo_Vettore,
        tv.Azienda_Vettore,
        -- Campo da tab_viaggi
        tvi.data_viaggio
      FROM fatt_delivery fd
      INNER JOIN tab_vettori tv ON fd.Cod_Vettore = tv.Cod_Vettore
      INNER JOIN tab_viaggi tvi ON fd.viaggio = tvi.viaggio
      WHERE fd.\`div\` IN ('W007', 'W009')
      AND tv.Tipo_Vettore = 'Terzista'
      AND fd.tipologia = 'Consegna pieni'
      ORDER BY fd.data_mov_merce DESC
    `;

    const [sourceData] = await connection.execute(extractQuery);
    console.log(`📈 Record estratti da fatt_delivery: ${sourceData.length}`);

    if (sourceData.length === 0) {
      console.log('⚠️ Nessun record trovato con i filtri specificati');
      return;
    }

    // 4. Inserimento dati nella tabella terzisti
    console.log('\n💾 Inserimento dati in tab_delivery_terzisti...');
    
    let insertedCount = 0;
    let errorCount = 0;
    const batchSize = 1000;

    for (let i = 0; i < sourceData.length; i += batchSize) {
      const batch = sourceData.slice(i, i + batchSize);
      
      try {
        // Prepara i valori per l'inserimento batch
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

        await connection.execute(insertQuery, [values]);
        insertedCount += batch.length;
        
        if (i % (batchSize * 5) === 0) {
          console.log(`   📊 Processati ${i + batch.length} / ${sourceData.length} record`);
        }

      } catch (error) {
        console.log(`❌ Errore batch ${i}-${i + batch.length}: ${error.message}`);
        errorCount += batch.length;
      }
    }

    console.log(`✅ Inserimento completato!`);
    console.log(`   📈 Record inseriti: ${insertedCount}`);
    console.log(`   ❌ Record con errori: ${errorCount}`);

    // 5. Verifica finale
    console.log('\n🔍 Verifica finale...');
    const [finalCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM tab_delivery_terzisti
    `);
    console.log(`📊 Record totali in tab_delivery_terzisti: ${finalCount[0].count}`);

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

    console.log('\n📊 Statistiche per divisione:');
    statsByDiv.forEach(stat => {
      console.log(`   ${stat.div}: ${stat.total_records} record, ${stat.unique_vettori} vettori, ${stat.unique_viaggi} viaggi, €${stat.total_compenso?.toFixed(2) || '0.00'}`);
    });

    // 7. Statistiche per vettore
    const [statsByVettore] = await connection.execute(`
      SELECT 
        Azienda_Vettore,
        COUNT(*) as total_records,
        SUM(tot_compenso) as total_compenso
      FROM tab_delivery_terzisti
      GROUP BY Azienda_Vettore
      ORDER BY total_compenso DESC
      LIMIT 10
    `);

    console.log('\n📊 Top 10 vettori per compenso:');
    statsByVettore.forEach((stat, index) => {
      console.log(`   ${index + 1}. ${stat.Azienda_Vettore}: ${stat.total_records} record, €${stat.total_compenso?.toFixed(2) || '0.00'}`);
    });

    console.log('\n🎉 IMPORT MENSILE COMPLETATO!');
    console.log('✅ Dati estratti con JOIN e filtri applicati');
    console.log('✅ Inserimento batch ottimizzato');
    console.log('✅ Statistiche generate');
    console.log('✅ Pronto per fatturazione mensile');

  } catch (error) {
    console.error('❌ Errore durante l\'import:', error.message);
    if (error.code) {
      console.error('Codice errore:', error.code);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connessione chiusa');
    }
  }
}

// Esegui l'import
importTerzistiMonthly();
