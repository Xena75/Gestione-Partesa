const mysql = require('mysql2/promise');

async function checkRecords() {
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

    console.log(`\n🔍 Verifica record con mese ${mese} e anno ${anno}\n`);

    // Metodo 1: JOIN con fatt_delivery
    const [countJoin] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti tdt
      INNER JOIN fatt_delivery fd ON tdt.id = fd.id
      WHERE fd.mese = ? AND fd.anno = ?
    `, [mese, anno]);
    console.log(`📊 Metodo 1 (JOIN con fatt_delivery): ${countJoin[0].count} record`);

    // Metodo 2: Campo mese direttamente in tab_delivery_terzisti
    const [countDirect] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti
      WHERE mese = ? AND YEAR(data_mov_merce) = ?
    `, [mese, anno]);
    console.log(`📊 Metodo 2 (campo mese diretto): ${countDirect[0].count} record`);

    // Metodo 3: Solo campo mese
    const [countMese] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti
      WHERE mese = ?
    `, [mese]);
    console.log(`📊 Metodo 3 (solo campo mese = ${mese}): ${countMese[0].count} record`);

    // Metodo 4: Per data_mov_merce (mese 10 del 2025)
    const [countDate] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti
      WHERE YEAR(data_mov_merce) = ? AND MONTH(data_mov_merce) = ?
    `, [anno, mese]);
    console.log(`📊 Metodo 4 (data_mov_merce ottobre 2025): ${countDate[0].count} record`);

    // Verifica struttura tabella
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM tab_delivery_terzisti LIKE '%mese%'
    `);
    console.log(`\n📋 Campi mese nella tabella:`);
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    const [columnsAnno] = await connection.execute(`
      SHOW COLUMNS FROM tab_delivery_terzisti LIKE '%anno%'
    `);
    console.log(`\n📋 Campi anno nella tabella:`);
    columnsAnno.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    // Mostra alcuni esempi di record con mese 10
    const [examples] = await connection.execute(`
      SELECT id, mese, data_mov_merce, viaggio, Descr_Vettore_Join, colli
      FROM tab_delivery_terzisti
      WHERE mese = ?
      LIMIT 10
    `, [mese]);
    
    if (examples.length > 0) {
      console.log(`\n📋 Esempi di record con mese = ${mese}:`);
      examples.forEach((row, i) => {
        console.log(`  ${i + 1}. ID: ${row.id}, Mese: ${row.mese}, Data: ${row.data_mov_merce}, Viaggio: ${row.viaggio}, Vettore: ${row.Descr_Vettore_Join}, Colli: ${row.colli}`);
      });
    }

    // Verifica se ci sono record con data ottobre 2025 ma mese diverso
    const [countOct2025] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM tab_delivery_terzisti
      WHERE YEAR(data_mov_merce) = 2025 AND MONTH(data_mov_merce) = 10
        AND (mese IS NULL OR mese != 10)
    `, []);
    console.log(`\n⚠️ Record con data ottobre 2025 ma mese != 10: ${countOct2025[0].count}`);

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkRecords();




