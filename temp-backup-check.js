const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'backup_management'
        });
        
        console.log('\n============================================================================');
        console.log('REPORT STATO SISTEMA BACKUP - TEMPI E FREQUENZE');
        console.log('============================================================================');
        
        // Ultimi backup registrati
        console.log('\n=== ULTIMI 10 BACKUP REGISTRATI ===');
        const [recent] = await conn.execute(
            'SELECT id, backup_type, file_path, file_size_bytes, created_at FROM backup_files ORDER BY created_at DESC LIMIT 10'
        );
        
        recent.forEach(row => {
            const sizeGB = (row.file_size_bytes / (1024*1024*1024)).toFixed(2);
            console.log(`${row.created_at.toISOString()} - ${row.backup_type || 'N/A'} - ${sizeGB} GB`);
        });
        
        // Statistiche per tipo
        console.log('\n=== STATISTICHE PER TIPO DI BACKUP ===');
        const [stats] = await conn.execute(
            'SELECT backup_type, COUNT(*) as count, SUM(file_size_bytes) as total_size, MAX(created_at) as last_backup FROM backup_files GROUP BY backup_type'
        );
        
        stats.forEach(row => {
            const sizeGB = (row.total_size / (1024*1024*1024)).toFixed(2);
            console.log(`${row.backup_type || 'Non specificato'}: ${row.count} backup, ${sizeGB} GB, ultimo: ${row.last_backup ? row.last_backup.toISOString() : 'N/A'}`);
        });
        
        // Frequenza backup ultimi 7 giorni
        console.log('\n=== FREQUENZA BACKUP ULTIMI 7 GIORNI ===');
        const [frequency] = await conn.execute(
            `SELECT DATE(created_at) as backup_date, backup_type, COUNT(*) as count 
             FROM backup_files 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
             GROUP BY DATE(created_at), backup_type 
             ORDER BY backup_date DESC`
        );
        
        if (frequency.length > 0) {
            frequency.forEach(row => {
                console.log(`${row.backup_date} - ${row.backup_type || 'N/A'}: ${row.count} backup`);
            });
        } else {
            console.log('Nessun backup negli ultimi 7 giorni');
        }
        
        // Schedules attive
        console.log('\n=== SCHEDULE BACKUP ATTIVE ===');
        const [schedules] = await conn.execute(
            'SELECT schedule_name, backup_type, cron_expression, is_active, last_run, next_run FROM backup_schedules WHERE is_active = 1'
        );
        
        if (schedules.length > 0) {
            schedules.forEach(row => {
                console.log(`${row.schedule_name} (${row.backup_type}) - Cron: ${row.cron_expression}`);
                console.log(`  Ultimo: ${row.last_run ? row.last_run.toISOString() : 'Mai'}, Prossimo: ${row.next_run ? row.next_run.toISOString() : 'N/A'}`);
            });
        } else {
            console.log('Nessuna schedule attiva trovata');
        }
        
        // Controllo salute sistema
        console.log('\n=== STATO SALUTE SISTEMA ===');
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const [recentBackups] = await conn.execute(
            'SELECT COUNT(*) as count FROM backup_files WHERE created_at >= ?',
            [oneDayAgo]
        );
        
        console.log(`Backup nelle ultime 24 ore: ${recentBackups[0].count}`);
        
        if (recentBackups[0].count === 0) {
            console.log('⚠️  ATTENZIONE: Nessun backup nelle ultime 24 ore!');
        } else {
            console.log('✅ Sistema di backup attivo');
        }
        
        console.log('\n============================================================================');
        
        await conn.end();
        
    } catch (error) {
        console.error('Errore:', error.message);
    }
})();