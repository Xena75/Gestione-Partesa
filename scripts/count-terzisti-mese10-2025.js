const mysql = require('mysql2/promise');

async function countRecords() {
  let connection;
  
  try {
    // Crea connessione al database
    connection = await mysql.createConnection({
      host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
      user: process.env.DB_GESTIONE_USER || 'root',
      password: process.env.DB_GESTIONE_PASS || '',
      database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
    });

    const mese = 10;
    const anno = 2025;

    console.log(`\n🔍 Conteggio record importati per mese ${mese} anno ${anno}\n`);

    // Conta record in tab_delivery_terzisti che corrispondono a fatt_delivery con mese 10 e anno 2025
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
    `, [mese, anno]);

    const totalCount = countResult[0].count;
    console.log(`📊 Totale record da eliminare: ${totalCount}`);

    // Conta per divisione
    const [countByDiv] = await connection.execute(`
      SELECT 
        fd.div,
        COUNT(*) as count,
        SUM(tdt.colli) as total_colli,
        SUM(tdt.tot_compenso) as total_compenso
      FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
      GROUP BY fd.div
      ORDER BY fd.div
    `, [mese, anno]);

    console.log(`\n📊 Dettaglio per divisione:`);
    countByDiv.forEach(row => {
      console.log(`  - ${row.div}: ${row.count} record, ${row.total_colli} colli, €${parseFloat(row.total_compenso).toFixed(2)}`);
    });

    // Conta per vettore (top 10)
    const [countByVettore] = await connection.execute(`
      SELECT 
        tdt.Descr_Vettore_Join,
        COUNT(*) as count,
        SUM(tdt.colli) as total_colli
      FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
      GROUP BY tdt.Descr_Vettore_Join
      ORDER BY count DESC
      LIMIT 10
    `, [mese, anno]);

    console.log(`\n📊 Top 10 vettori per numero di record:`);
    countByVettore.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.Descr_Vettore_Join}: ${row.count} record, ${row.total_colli} colli`);
    });

    // Verifica il viaggio 143077
    const [viaggio143077] = await connection.execute(`
      SELECT COUNT(*) as count, SUM(tdt.colli) as total_colli
      FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
        AND tdt.viaggio = '143077'
        AND tdt.Descr_Vettore_Join LIKE '%LAI01%FUTURA%'
    `, [mese, anno]);

    console.log(`\n🔍 Verifica viaggio 143077 (LAI01 FUTURA):`);
    console.log(`  Record: ${viaggio143077[0].count}, Colli: ${viaggio143077[0].total_colli || 0}`);

    // Query SQL per eliminazione (solo per visualizzazione)
    console.log(`\n📝 Query SQL per eliminazione:`);
    console.log(`DELETE tdt FROM tab_delivery_terzisti tdt`);
    console.log(`INNER JOIN fatt_delivery fd ON tdt.id = fd.id`);
    console.log(`WHERE fd.mese = ${mese} AND fd.anno = ${anno};`);

    console.log(`\n⚠️ ATTENZIONE: Questa query eliminerà ${totalCount} record!`);
    console.log(`   Conferma prima di eseguire l'eliminazione.\n`);

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

countRecords();




