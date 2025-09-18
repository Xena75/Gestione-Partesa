const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'backup_management'
    });

    console.log('🔄 Correzione durate backup...');

    // Trova tutti i job con durata NULL o 0 che hanno start_time e end_time
    const [rows] = await conn.execute(`
      SELECT id, start_time, end_time, duration_seconds 
      FROM backup_jobs 
      WHERE (duration_seconds IS NULL OR duration_seconds = 0) 
        AND start_time IS NOT NULL 
        AND end_time IS NOT NULL
        AND start_time != end_time
      ORDER BY id
    `);

    console.log(`Trovati ${rows.length} job da correggere`);

    let corrected = 0;
    for (const job of rows) {
      const startMs = new Date(job.start_time).getTime();
      const endMs = new Date(job.end_time).getTime();
      const durationSeconds = Math.round((endMs - startMs) / 1000);

      if (durationSeconds > 0) {
        await conn.execute(
          'UPDATE backup_jobs SET duration_seconds = ? WHERE id = ?',
          [durationSeconds, job.id]
        );
        console.log(`✅ Job ${job.id}: durata aggiornata a ${durationSeconds}s`);
        corrected++;
      }
    }

    // Trova job con start_time = end_time e stima una durata
    const [sameTimeRows] = await conn.execute(`
      SELECT id, start_time, end_time, file_size_bytes 
      FROM backup_jobs 
      WHERE (duration_seconds IS NULL OR duration_seconds = 0) 
        AND start_time IS NOT NULL 
        AND end_time IS NOT NULL
        AND start_time = end_time
      ORDER BY id
    `);

    console.log(`\nTrovati ${sameTimeRows.length} job con tempi identici da stimare`);

    for (const job of sameTimeRows) {
      // Stima durata basata sulla dimensione del file
      const fileSize = job.file_size_bytes || 0;
      const estimatedDuration = Math.max(1, Math.min(Math.round(fileSize / 1000000), 60)); // 1s-60s
      
      await conn.execute(
        'UPDATE backup_jobs SET duration_seconds = ? WHERE id = ?',
        [estimatedDuration, job.id]
      );
      console.log(`📊 Job ${job.id}: durata stimata ${estimatedDuration}s (file: ${fileSize} bytes)`);
      corrected++;
    }

    console.log(`\n✅ Correzione completata! ${corrected} job aggiornati.`);
    
    // Verifica risultati
    const [checkRows] = await conn.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN duration_seconds IS NULL OR duration_seconds = 0 THEN 1 END) as still_zero
      FROM backup_jobs
    `);
    
    const stats = checkRows[0];
    console.log(`\n📈 Statistiche finali:`);
    console.log(`   Total job: ${stats.total}`);
    console.log(`   Job con durata 0/NULL: ${stats.still_zero}`);
    console.log(`   Job con durata valida: ${stats.total - stats.still_zero}`);

    await conn.end();
  } catch (error) {
    console.error('❌ Errore:', error);
  }
})();