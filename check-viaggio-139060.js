const mysql = require('mysql2/promise');

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'viaggi_db'
  });

  try {
    console.log('🔍 Verificando le tabelle nel database viaggi_db...');
    
    // Mostra tutte le tabelle
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tabelle disponibili:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // Cerca tabelle che potrebbero contenere i viaggi
    const tableNames = tables.map(t => Object.values(t)[0]);
    const possibleTables = tableNames.filter(name => 
      name.toLowerCase().includes('viag') || 
      name.toLowerCase().includes('travel') ||
      name.toLowerCase().includes('trip')
    );
    
    console.log('\n🎯 Tabelle che potrebbero contenere viaggi:', possibleTables);
    
    // Se troviamo travel_images, controlliamo la sua struttura
    if (tableNames.includes('travel_images')) {
      console.log('\n🖼️ Struttura tabella travel_images:');
      const [structure] = await connection.execute('DESCRIBE travel_images');
      structure.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
      
      // Mostra alcuni esempi di travelId
      const [samples] = await connection.execute(
        'SELECT DISTINCT travelId FROM travel_images LIMIT 10'
      );
      console.log('\n📝 Esempi di travelId:');
      samples.forEach(row => {
        console.log(`  - ${row.travelId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabase();