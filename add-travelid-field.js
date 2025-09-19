const mysql = require('mysql2/promise');

async function addTravelIdField() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gestionelogistica'
  });

  try {
    console.log('Connesso al database gestionelogistica');
    
    // Verifica se il campo travelId esiste già
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestionelogistica' 
      AND TABLE_NAME = 'tab_viaggi' 
      AND COLUMN_NAME = 'travelId'
    `);
    
    if (columns.length > 0) {
      console.log('Il campo travelId esiste già nella tabella tab_viaggi');
      return;
    }
    
    // Aggiunge il campo calcolato travelId
    console.log('Aggiungendo il campo calcolato travelId...');
    await connection.execute(`
      ALTER TABLE tab_viaggi 
      ADD COLUMN travelId VARCHAR(255) 
      GENERATED ALWAYS AS (CONCAT('Viaggio - ', Viaggio)) STORED
    `);
    
    console.log('Campo travelId aggiunto con successo!');
    
    // Crea un indice sul campo travelId
    console.log('Creando indice sul campo travelId...');
    await connection.execute(`
      CREATE INDEX idx_tab_viaggi_travelid ON tab_viaggi(travelId)
    `);
    
    console.log('Indice creato con successo!');
    
    // Verifica che il campo sia stato creato correttamente
    console.log('Verificando i primi 5 record...');
    const [rows] = await connection.execute(`
      SELECT Viaggio, travelId FROM tab_viaggi LIMIT 5
    `);
    
    console.log('Primi 5 record con travelId:');
    rows.forEach(row => {
      console.log(`Viaggio: ${row.Viaggio}, travelId: ${row.travelId}`);
    });
    
  } catch (error) {
    console.error('Errore durante l\'aggiunta del campo travelId:', error);
  } finally {
    await connection.end();
    console.log('Connessione chiusa');
  }
}

addTravelIdField().catch(console.error);