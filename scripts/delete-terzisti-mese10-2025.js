const mysql = require('mysql2/promise');

async function deleteRecords() {
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

    console.log(`\n🗑️ Eliminazione record per mese ${mese} anno ${anno}\n`);

    // Conta prima dell'eliminazione
    const [countBefore] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
    `, [mese, anno]);

    const countBeforeDelete = countBefore[0].count;
    console.log(`📊 Record da eliminare: ${countBeforeDelete}`);

    // Esegui eliminazione
    console.log(`\n🗑️ Esecuzione eliminazione...`);
    const [deleteResult] = await connection.execute(`
      DELETE tdt FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
    `, [mese, anno]);

    const deletedCount = deleteResult.affectedRows;
    console.log(`✅ Record eliminati: ${deletedCount}`);

    // Verifica dopo l'eliminazione
    const [countAfter] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
    `, [mese, anno]);

    const countAfterDelete = countAfter[0].count;
    console.log(`📊 Record rimanenti per mese ${mese}/anno ${anno}: ${countAfterDelete}`);

    // Conta totale record nella tabella
    const [totalCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM tab_delivery_terzisti
    `);
    console.log(`📊 Totale record in tab_delivery_terzisti: ${totalCount[0].count}`);

    console.log(`\n✅ Eliminazione completata con successo!\n`);

  } catch (error) {
    console.error('❌ Errore durante l\'eliminazione:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

deleteRecords();




