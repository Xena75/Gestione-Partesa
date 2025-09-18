const mysql = require('mysql2/promise');

// Configurazione
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'backup_management'
};

async function checkTables() {
    let connection;
    
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connesso al database backup_management');
        
        // Verifica struttura tabella backup_files
        console.log('\n📋 STRUTTURA TABELLA backup_files:');
        console.log('='.repeat(50));
        const [filesStructure] = await connection.execute('DESCRIBE backup_files');
        filesStructure.forEach(col => {
            console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default}`);
        });
        
        // Verifica struttura tabella backup_jobs
        console.log('\n📋 STRUTTURA TABELLA backup_jobs:');
        console.log('='.repeat(50));
        const [jobsStructure] = await connection.execute('DESCRIBE backup_jobs');
        jobsStructure.forEach(col => {
            console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default}`);
        });
        
        // Mostra alcuni record di esempio
        console.log('\n📄 ESEMPI backup_files (ultimi 5):');
        console.log('='.repeat(50));
        const [files] = await connection.execute('SELECT * FROM backup_files ORDER BY id DESC LIMIT 5');
        files.forEach(file => {
            console.log(`ID: ${file.id} | Job: ${file.job_id || 'N/A'} | Path: ${file.file_path || 'N/A'}`);
        });
        
        console.log('\n📄 ESEMPI backup_jobs (ultimi 5):');
        console.log('='.repeat(50));
        const [jobs] = await connection.execute('SELECT * FROM backup_jobs ORDER BY id DESC LIMIT 5');
        jobs.forEach(job => {
            console.log(`ID: ${job.id} | Tipo: ${job.backup_type} | Status: ${job.status} | Start: ${job.start_time}`);
        });
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTables();