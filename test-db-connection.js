const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('🔄 Testing database connections...');
  
  // Test database VIAGGI
  try {
    console.log('Testing VIAGGI database...');
    const poolViaggi = mysql.createPool({
      host: 'bore.pub',
      port: 54000,
      user: 'root',
      password: '',
      database: 'viaggi_db',
      connectionLimit: 10,
      acquireTimeout: 10000,
      timeout: 10000
    });
    
    const [result] = await poolViaggi.execute('SELECT 1 as test');
    console.log('✅ VIAGGI database connection successful:', result);
    await poolViaggi.end();
  } catch (error) {
    console.error('❌ VIAGGI database connection failed:', error.message);
  }
  
  // Test database GESTIONE
  try {
    console.log('Testing GESTIONE database...');
    const poolGestione = mysql.createPool({
      host: 'bore.pub',
      port: 54000,
      user: 'root',
      password: '',
      database: 'gestionelogistica',
      connectionLimit: 10,
      acquireTimeout: 10000,
      timeout: 10000
    });
    
    const [result] = await poolGestione.execute('SELECT 1 as test');
    console.log('✅ GESTIONE database connection successful:', result);
    await poolGestione.end();
  } catch (error) {
    console.error('❌ GESTIONE database connection failed:', error.message);
  }
}

testDatabaseConnection();