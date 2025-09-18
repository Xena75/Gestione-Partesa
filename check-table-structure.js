const mysql = require('mysql2/promise');

async function checkTableStructure() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'backup_management'
    });

    try {
        console.log('🔍 Struttura tabella backup_files:');
        const [columns] = await connection.execute('DESCRIBE backup_files');
        
        console.log('\n📋 Colonne presenti:');
        columns.forEach((col, index) => {
            console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n🔍 Verifica presenza colonna backup_type:');
        const hasBackupType = columns.some(col => col.Field === 'backup_type');
        console.log(`backup_type presente: ${hasBackupType ? '✅ SÌ' : '❌ NO'}`);

        if (!hasBackupType) {
            console.log('\n⚠️ La colonna backup_type non esiste nella tabella backup_files');
            console.log('💡 Questo spiega l\'errore nel sistema di backup');
        }

        console.log('\n🔍 Controllo dati esistenti:');
        const [rows] = await connection.execute('SELECT COUNT(*) as total FROM backup_files');
        console.log(`📊 Totale record: ${rows[0].total}`);

    } catch (error) {
        console.error('❌ Errore:', error.message);
    } finally {
        await connection.end();
    }
}

checkTableStructure();