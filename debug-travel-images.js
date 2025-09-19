// Script per debug della tabella travel_images
const mysql = require('mysql2/promise');

async function debugTravelImages() {
  let connection;
  
  try {
    // Connessione al database MySQL
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'viaggi_db'
    });
    
    console.log('✅ Connesso al database viaggi_db');
    
    // 1. Verifica struttura tabella travel_images
    console.log('\n🔍 Struttura tabella travel_images:');
    const [structure] = await connection.execute('DESCRIBE travel_images');
    console.table(structure);
    
    // 2. Conta totale record
    console.log('\n📊 Conteggio totale record:');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM travel_images');
    console.log(`Totale record: ${countResult[0].total}`);
    
    // 3. Mostra primi 10 record per vedere formato travelId
    console.log('\n📋 Primi 10 record (formato travelId):');
    const [samples] = await connection.execute(`
      SELECT id, travelId, filename, createdAt 
      FROM travel_images 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    console.table(samples);
    
    // 4. Test specifico per il viaggio 57165
    console.log('\n=== TEST SPECIFICO PER VIAGGIO 57165 ===');
    const testTravelIds = [
      '57165',
      'Viaggio - 57165',
      'Viaggio-57165',
      'viaggio - 57165'
    ];
    
    for (const testId of testTravelIds) {
      const [testRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM travel_images WHERE travelId = ?',
        [testId]
      );
      console.log(`Formato "${testId}": ${testRows[0].count} immagini`);
    }
    
    // Mostra tutti i record per il viaggio 57165
    console.log('\n=== DETTAGLI IMMAGINI PER VIAGGIO 57165 ===');
    const [detailRows] = await connection.execute(
      'SELECT * FROM travel_images WHERE travelId LIKE "%57165%"'
    );
    console.log('Record trovati:', detailRows.length);
    detailRows.forEach((row, index) => {
      console.log(`Record ${index + 1}:`, {
        id: row.id,
        travelId: row.travelId,
        imagePath: row.imagePath,
        uploadDate: row.uploadDate
      });
    });
    
    // 5. Cerca con LIKE per pattern simili
    console.log('\n🔍 Ricerca con LIKE per 139109:');
    const [likeResult] = await connection.execute(
      "SELECT travelId, COUNT(*) as count FROM travel_images WHERE travelId LIKE '%139109%' GROUP BY travelId"
    );
    console.table(likeResult);
    
    // 6. Mostra tutti i travelId unici che contengono numeri simili
    console.log('\n📋 TravelId unici che iniziano con 139:');
    const [similarIds] = await connection.execute(
      "SELECT DISTINCT travelId FROM travel_images WHERE travelId LIKE '%139%' ORDER BY travelId"
    );
    console.table(similarIds);
    
    // 7. Test della query dell'endpoint API
    console.log('\n🧪 Test query endpoint API:');
    const apiTravelId = 'Viaggio - 139109';
    const [apiResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM travel_images WHERE travelId = ?',
      [apiTravelId]
    );
    console.log(`Query API con '${apiTravelId}': ${apiResult[0].count} immagini`);
    
    // 8. Verifica se esistono record per altri viaggi noti
    console.log('\n🔍 Verifica altri viaggi con immagini:');
    const [otherTravels] = await connection.execute(`
      SELECT travelId, COUNT(*) as count 
      FROM travel_images 
      GROUP BY travelId 
      ORDER BY count DESC 
      LIMIT 5
    `);
    console.table(otherTravels);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

// Esegui il debug
debugTravelImages();