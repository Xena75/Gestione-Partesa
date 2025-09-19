const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkTravelImages() {
  let connection;
  
  try {
    // Connessione al database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'viaggi_db'
    });
    
    console.log('✅ Connesso al database');
    
    // Cerca tutti i record che contengono '57165' nel travelId
    console.log('\n🔍 Ricerca record con 57165 nel travelId:');
    const [rows] = await connection.execute(
      'SELECT * FROM travel_images WHERE travelId LIKE "%57165%"'
    );
    
    console.log(`Trovati ${rows.length} record:`);
    rows.forEach((row, index) => {
      console.log(`Record ${index + 1}:`, {
        id: row.id,
        travelId: row.travelId,
        filename: row.filename,
        url: row.url,
        createdAt: row.createdAt
      });
    });
    
    // Test con diversi formati
    console.log('\n🧪 Test con diversi formati di travelId:');
    const testFormats = [
      '57165',
      'Viaggio - 57165',
      'Viaggio-57165',
      'viaggio - 57165'
    ];
    
    for (const format of testFormats) {
      const [testRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM travel_images WHERE travelId = ?',
        [format]
      );
      console.log(`Formato "${format}": ${testRows[0].count} immagini`);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connessione chiusa');
    }
  }
}

// Test API
async function testAPI() {
  console.log('\n🌐 Test API /api/viaggi/images/count?numeroViaggio=57165');
  
  try {
    const response = await fetch('http://localhost:3001/api/viaggi/images/count?numeroViaggio=57165');
    const data = await response.json();
    console.log('Risposta API:', data);
  } catch (error) {
    console.error('❌ Errore API:', error.message);
  }
}

async function main() {
  await checkTravelImages();
  await testAPI();
}

main();