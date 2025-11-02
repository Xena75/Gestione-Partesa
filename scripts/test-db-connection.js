const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnections() {
  console.log('🔍 Testing database connections...\n');

  // Test 1: Database GESTIONE (gestionelogistica)
  console.log('📊 Testing GESTIONE database connection...');
  try {
    const gestioneConnection = await mysql.createConnection({
      host: process.env.DB_GESTIONE_HOST || 'localhost',
      port: process.env.DB_GESTIONE_PORT || 3306,
      user: process.env.DB_GESTIONE_USER || 'root',
      password: process.env.DB_GESTIONE_PASS || '',
      database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
      connectTimeout: 5000,
      acquireTimeout: 5000,
      timeout: 5000
    });

    const [rows] = await gestioneConnection.execute('SELECT 1 as test');
    console.log('✅ GESTIONE database connection successful!');
    console.log(`   Host: ${process.env.DB_GESTIONE_HOST || 'localhost'}:${process.env.DB_GESTIONE_PORT || 3306}`);
    console.log(`   Database: ${process.env.DB_GESTIONE_NAME || 'gestionelogistica'}\n`);
    
    await gestioneConnection.end();
  } catch (error) {
    console.log('❌ GESTIONE database connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Host: ${process.env.DB_GESTIONE_HOST || 'localhost'}:${process.env.DB_GESTIONE_PORT || 3306}`);
    console.log(`   Database: ${process.env.DB_GESTIONE_NAME || 'gestionelogistica'}\n`);
  }

  // Test 2: Database VIAGGI (viaggi_db)
  console.log('🚗 Testing VIAGGI database connection...');
  try {
    const viaggiConnection = await mysql.createConnection({
      host: process.env.VIAGGI_DB_HOST || process.env.DB_VIAGGI_HOST || 'localhost',
      port: process.env.VIAGGI_DB_PORT || process.env.DB_VIAGGI_PORT || 3306,
      user: process.env.VIAGGI_DB_USER || process.env.DB_VIAGGI_USER || 'root',
      password: process.env.VIAGGI_DB_PASS || process.env.DB_VIAGGI_PASS || '',
      database: process.env.VIAGGI_DB_NAME || process.env.DB_VIAGGI_NAME || 'viaggi_db',
      connectTimeout: 5000,
      acquireTimeout: 5000,
      timeout: 5000
    });

    const [rows] = await viaggiConnection.execute('SELECT 1 as test');
    console.log('✅ VIAGGI database connection successful!');
    console.log(`   Host: ${process.env.VIAGGI_DB_HOST || process.env.DB_VIAGGI_HOST || 'localhost'}:${process.env.VIAGGI_DB_PORT || process.env.DB_VIAGGI_PORT || 3306}`);
    console.log(`   Database: ${process.env.VIAGGI_DB_NAME || process.env.DB_VIAGGI_NAME || 'viaggi_db'}\n`);
    
    await viaggiConnection.end();
  } catch (error) {
    console.log('❌ VIAGGI database connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Host: ${process.env.VIAGGI_DB_HOST || process.env.DB_VIAGGI_HOST || 'localhost'}:${process.env.VIAGGI_DB_PORT || process.env.DB_VIAGGI_PORT || 3306}`);
    console.log(`   Database: ${process.env.VIAGGI_DB_NAME || process.env.DB_VIAGGI_NAME || 'viaggi_db'}\n`);
  }

  // Test 3: Database BACKUP MANAGEMENT
  console.log('💾 Testing BACKUP MANAGEMENT database connection...');
  try {
    const backupConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'backup_management',
      connectTimeout: 5000,
      acquireTimeout: 5000,
      timeout: 5000
    });

    const [rows] = await backupConnection.execute('SELECT 1 as test');
    console.log('✅ BACKUP MANAGEMENT database connection successful!');
    console.log(`   Host: ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || 3306}`);
    console.log(`   Database: ${process.env.MYSQL_DATABASE || 'backup_management'}\n`);
    
    await backupConnection.end();
  } catch (error) {
    console.log('❌ BACKUP MANAGEMENT database connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Host: ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || 3306}`);
    console.log(`   Database: ${process.env.MYSQL_DATABASE || 'backup_management'}\n`);
  }

  console.log('🏁 Database connection tests completed!');
}

// Esegui i test
testDatabaseConnections().catch(console.error);