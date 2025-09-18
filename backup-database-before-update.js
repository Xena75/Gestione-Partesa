const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Script per creare backup di sicurezza del database backup_management
async function createDatabaseBackup() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'backup_management'
    });

    try {
        console.log('🔄 Creazione backup di sicurezza del database backup_management...');
        
        // Ottieni tutte le tabelle
        const [tables] = await connection.execute('SHOW TABLES');
        
        let backupSQL = '-- Backup di sicurezza database backup_management\n';
        backupSQL += `-- Creato il: ${new Date().toISOString()}\n\n`;
        
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            
            // Ottieni struttura tabella
            const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
            backupSQL += `-- Struttura tabella ${tableName}\n`;
            backupSQL += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            backupSQL += createTable[0]['Create Table'] + ';\n\n';
            
            // Ottieni dati tabella
            const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
            if (rows.length > 0) {
                backupSQL += `-- Dati tabella ${tableName}\n`;
                for (const row of rows) {
                    const values = Object.values(row).map(val => {
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        return val;
                    }).join(', ');
                    backupSQL += `INSERT INTO \`${tableName}\` VALUES (${values});\n`;
                }
                backupSQL += '\n';
            }
        }
        
        // Salva backup
        const backupFileName = `backup_management_backup_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')}.sql`;
        const backupPath = path.join(__dirname, 'database', backupFileName);
        
        // Crea directory se non esiste
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        fs.writeFileSync(backupPath, backupSQL);
        
        console.log('✅ Backup creato con successo:');
        console.log(`📁 File: ${backupPath}`);
        console.log(`📊 Dimensione: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);
        console.log(`🕒 Data: ${new Date().toLocaleString()}`);
        
        return backupPath;
        
    } catch (error) {
        console.error('❌ Errore durante la creazione del backup:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Esegui backup
if (require.main === module) {
    createDatabaseBackup()
        .then(backupPath => {
            console.log('\n🎯 Backup completato. Ora puoi procedere con gli aggiornamenti del database.');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Errore fatale:', error.message);
            process.exit(1);
        });
}

module.exports = { createDatabaseBackup };