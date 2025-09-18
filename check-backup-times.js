const mysql = require('mysql2/promise');

async function checkBackupTimes() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'backup_management'
    });
    
    const [rows] = await conn.execute(
      'SELECT id, backup_type, database_list, start_time, end_time FROM backup_jobs ORDER BY start_time DESC LIMIT 5'
    );
    
    console.log('Ultimi 5 backup:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Tipo: ${row.backup_type}, DB: ${row.database_list}`);
      console.log(`Inizio: ${row.start_time}, Fine: ${row.end_time}`);
      console.log('---');
    });
    
    await conn.end();
  } catch (error) {
    console.error('Errore:', error.message);
  }
}

checkBackupTimes();