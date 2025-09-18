const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'backup_management'
    });

    const [rows] = await conn.execute(`
      SELECT id, start_time, end_time, duration_seconds, status 
      FROM backup_jobs 
      ORDER BY id DESC 
      LIMIT 10
    `);

    console.log('=== ULTIMI 10 JOB BACKUP ===');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}`);
      console.log(`  Start: ${row.start_time}`);
      console.log(`  End: ${row.end_time}`);
      console.log(`  Duration: ${row.duration_seconds}s`);
      
      // Calcola la differenza manualmente
      if (row.start_time && row.end_time) {
        const startMs = new Date(row.start_time).getTime();
        const endMs = new Date(row.end_time).getTime();
        const diffSeconds = Math.round((endMs - startMs) / 1000);
        console.log(`  Calculated Duration: ${diffSeconds}s`);
      }
      console.log('---');
    });

    await conn.end();
  } catch (error) {
    console.error('Errore:', error);
  }
})();