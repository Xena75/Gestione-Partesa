const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkOrphanedImages() {
  let connection;
  
  try {
    // Connessione al database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('🔌 Connesso al database');
    
    // Ottieni tutti i travelId dalla tabella travel_images
    const [imageRows] = await connection.execute(
      'SELECT DISTINCT travelId FROM travel_images ORDER BY travelId'
    );
    
    console.log(`\n📸 Trovati ${imageRows.length} travelId unici nella tabella travel_images`);
    
    // Estrai i numeri di viaggio dai travelId
    const viaggiConImmagini = imageRows.map(row => {
      const match = row.travelId.match(/Viaggio - (\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    console.log(`\n🔢 Numeri di viaggio estratti:`, viaggiConImmagini.slice(0, 10), '...');
    
    // Verifica quali di questi viaggi esistono nella tabella viaggi
    const viaggiOrfani = [];
    const viaggiEsistenti = [];
    
    for (const numeroViaggio of viaggiConImmagini) {
      const [viaggiRows] = await connection.execute(
        'SELECT Viaggio FROM viaggi WHERE Viaggio = ?',
        [numeroViaggio]
      );
      
      if (viaggiRows.length === 0) {
        viaggiOrfani.push(numeroViaggio);
      } else {
        viaggiEsistenti.push(numeroViaggio);
      }
    }
    
    console.log(`\n✅ Viaggi con immagini che esistono nella tabella viaggi (${viaggiEsistenti.length}):`);
    console.table(viaggiEsistenti.slice(0, 20));
    
    console.log(`\n❌ Viaggi orfani - hanno immagini ma non esistono nella tabella viaggi (${viaggiOrfani.length}):`);
    console.table(viaggiOrfani);
    
    // Verifica specificamente il viaggio 57165
    console.log(`\n🔍 Verifica specifica per viaggio 57165:`);
    const [immagini57165] = await connection.execute(
      'SELECT COUNT(*) as count FROM travel_images WHERE travelId = ?',
      ['Viaggio - 57165']
    );
    
    const [viaggio57165] = await connection.execute(
      'SELECT Viaggio FROM viaggi WHERE Viaggio = ?',
      ['57165']
    );
    
    console.log(`- Immagini per 57165: ${immagini57165[0].count}`);
    console.log(`- Viaggio 57165 esiste in tabella viaggi: ${viaggio57165.length > 0 ? 'SÌ' : 'NO'}`);
    
    if (viaggiOrfani.includes('57165')) {
      console.log(`\n⚠️  Il viaggio 57165 è un viaggio orfano - ha immagini ma non esiste nella tabella viaggi!`);
      console.log(`   Questo spiega perché il pulsante mostra "Nessuna immagine" - il viaggio non appare nei risultati di ricerca.`);
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

checkOrphanedImages();