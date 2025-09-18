const mysql = require('mysql2/promise');

async function addBackupTypeColumn() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'backup_management'
    });

    try {
        console.log('🔧 Aggiunta colonna backup_type alla tabella backup_files...');
        
        // Aggiungi la colonna backup_type
        await connection.execute(`
            ALTER TABLE backup_files 
            ADD COLUMN backup_type ENUM('full', 'incremental', 'differential', 'manual') 
            DEFAULT 'manual' 
            AFTER compression_type
        `);
        
        console.log('✅ Colonna backup_type aggiunta con successo!');
        
        // Aggiorna i record esistenti con un valore di default
        const [result] = await connection.execute(`
            UPDATE backup_files 
            SET backup_type = 'manual' 
            WHERE backup_type IS NULL
        `);
        
        console.log(`📊 Aggiornati ${result.affectedRows} record esistenti con backup_type = 'manual'`);
        
        // Verifica la struttura aggiornata
        console.log('\n🔍 Verifica struttura aggiornata:');
        const [columns] = await connection.execute('DESCRIBE backup_files');
        const backupTypeColumn = columns.find(col => col.Field === 'backup_type');
        
        if (backupTypeColumn) {
            console.log(`✅ backup_type: ${backupTypeColumn.Type} - ${backupTypeColumn.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            console.log(`📋 Default: ${backupTypeColumn.Default}`);
        }
        
        console.log('\n🎯 Aggiornamento completato con successo!');
        
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ La colonna backup_type esiste già');
        } else {
            console.error('❌ Errore:', error.message);
        }
    } finally {
        await connection.end();
    }
}

addBackupTypeColumn();