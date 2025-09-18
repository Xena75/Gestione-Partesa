const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'backup_management'
        });
        
        console.log('\n=== STRUTTURA TABELLA BACKUP_JOBS ===');
        const [structure] = await conn.execute('DESCRIBE backup_jobs');
        structure.forEach(col => {
            console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
        });
        
        console.log('\n=== BACKUP PIÙ RECENTI ===');
        
        // Query semplificata per ottenere i backup più recenti
        const [jobs] = await conn.execute(`
            SELECT 
                id,
                backup_type,
                status,
                start_time,
                end_time
            FROM backup_jobs
            WHERE status = 'completed'
            ORDER BY start_time DESC
            LIMIT 10
        `);
        
        console.log('\nUltimi 10 backup completati:');
        jobs.forEach(job => {
            console.log(`ID: ${job.id} | Tipo: ${job.backup_type} | Status: ${job.status}`);
            console.log(`  Inizio: ${job.start_time}`);
            console.log(`  Fine: ${job.end_time}`);
            console.log('---');
        });
        
        // Query per ottenere i file associati ai backup più recenti
        console.log('\n=== FILE DI BACKUP PIÙ RECENTI ===');
        const [files] = await conn.execute(`
            SELECT 
                bf.backup_job_id,
                bf.file_path,
                bf.file_size,
                bf.created_at,
                bj.backup_type,
                bj.status
            FROM backup_files bf
            JOIN backup_jobs bj ON bf.backup_job_id = bj.id
            WHERE bj.status = 'completed'
            ORDER BY bf.created_at DESC
            LIMIT 20
        `);
        
        files.forEach(file => {
            console.log(`Job ID: ${file.backup_job_id} | Tipo: ${file.backup_type}`);
            console.log(`  File: ${file.file_path}`);
            console.log(`  Dimensione: ${(file.file_size / (1024*1024)).toFixed(2)} MB`);
            console.log(`  Data: ${file.created_at}`);
            console.log('---');
        });
        
        await conn.end();
        
    } catch (error) {
        console.error('Errore:', error.message);
    }
})();