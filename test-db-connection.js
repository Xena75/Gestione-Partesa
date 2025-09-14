const mysql = require('mysql2/promise');

// Configurazione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4'
};

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('Config:', {
      host: backupDbConfig.host,
      port: backupDbConfig.port,
      user: backupDbConfig.user,
      database: backupDbConfig.database
    });
    
    const connection = await mysql.createConnection(backupDbConfig);
    console.log('✅ Connected to backup_management database');
    
    // Test query to check tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables found:', tables);
    
    // Check specific tables
    const requiredTables = ['backup_jobs', 'backup_schedules', 'backup_alerts', 'backup_activity_log'];
    const existingTables = tables.map(row => Object.values(row)[0]);
    
    console.log('\n🔍 Checking required tables:');
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    await connection.end();
    console.log('\n✅ Database connection test completed');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Try to connect without specifying database
    try {
      console.log('\n🔍 Testing connection without database...');
      const basicConfig = { ...backupDbConfig };
      delete basicConfig.database;
      
      const connection = await mysql.createConnection(basicConfig);
      console.log('✅ Connected to MySQL server');
      
      const [databases] = await connection.execute('SHOW DATABASES');
      console.log('📋 Available databases:', databases.map(row => Object.values(row)[0]));
      
      await connection.end();
      
    } catch (basicError) {
      console.error('❌ Basic MySQL connection also failed:', basicError.message);
    }
  }
}

testConnection();