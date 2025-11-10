const mysql = require('mysql2/promise');

async function deleteRecordsDirect() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
      user: process.env.DB_GESTIONE_USER || 'root',
      password: process.env.DB_GESTIONE_PASS || '',
      database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
    });

    const mese = 10;
    const anno = 2025;

    console.log(`\n🗑️ Eliminazione record con mese ${mese} e anno ${anno}\n`);

    // Conta prima dell'eliminazione
    const [countBefore] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti
      WHERE mese = ? AND YEAR(data_mov_merce) = ?
    `, [mese, anno]);
    console.log(`📊 Record da eliminare: ${countBefore[0].count}`);

    // Elimina direttamente dalla tabella
    console.log(`\n🗑️ Esecuzione eliminazione...`);
    const [deleteResult] = await connection.execute(`
      DELETE FROM tab_delivery_terzisti
      WHERE mese = ? AND YEAR(data_mov_merce) = ?
    `, [mese, anno]);

    const deletedCount = deleteResult.affectedRows;
    console.log(`✅ Record eliminati: ${deletedCount}`);

    // Verifica dopo l'eliminazione
    const [countAfter] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti
      WHERE mese = ? AND YEAR(data_mov_merce) = ?
    `, [mese, anno]);
    console.log(`📊 Record rimanenti: ${countAfter[0].count}`);

    // Verifica anche solo per mese
    const [countMese] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti
      WHERE mese = ?
    `, [mese]);
    console.log(`📊 Record con mese = ${mese} (qualsiasi anno): ${countMese[0].count}`);

    console.log(`\n✅ Eliminazione completata!\n`);

  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

deleteRecordsDirect();




