const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: Number(process.env.DB_VIAGGI_PORT) || 3306,
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db'
};

async function addMeseField() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('🔧 Aggiunta campo mese calcolato alla tabella travels...');
    
    // Aggiungiamo il campo mese come generated column
    const alterQuery = `
      ALTER TABLE travels 
      ADD COLUMN mese TINYINT GENERATED ALWAYS AS (
        CASE 
          WHEN data_viaggio IS NOT NULL THEN MONTH(data_viaggio)
          ELSE NULL
        END
      ) STORED
    `;
    
    await connection.execute(alterQuery);
    console.log('✅ Campo mese aggiunto con successo!');
    
    // Verifichiamo che sia stato aggiunto
    const [columns] = await connection.execute('DESCRIBE travels');
    const meseColumn = columns.find(col => col.Field === 'mese');
    
    if (meseColumn) {
      console.log('\n📋 Campo mese creato:');
      console.log(`- Nome: ${meseColumn.Field}`);
      console.log(`- Tipo: ${meseColumn.Type}`);
      console.log(`- Null: ${meseColumn.Null}`);
      console.log(`- Extra: ${meseColumn.Extra}`);
    }
    
    // Testiamo con alcuni dati
    console.log('\n🧪 Test del campo mese:');
    const [testData] = await connection.execute(`
      SELECT id, data_viaggio, mese 
      FROM travels 
      WHERE data_viaggio IS NOT NULL 
      LIMIT 5
    `);
    
    testData.forEach(row => {
      console.log(`- ID: ${row.id}, Data: ${row.data_viaggio}, Mese: ${row.mese}`);
    });
    
    await connection.end();
    console.log('\n🎉 Operazione completata con successo!');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    
    if (error.message.includes('Duplicate column name')) {
      console.log('ℹ️  Il campo mese esiste già nella tabella.');
    }
  }
}

addMeseField();
