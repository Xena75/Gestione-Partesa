#!/usr/bin/env node

/**
 * Script di Pulizia Database Backup
 * Gestione Partesa - Sistema Backup MySQL
 * 
 * Rimuove record vecchi dalle tabelle di monitoraggio backup
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configurazione database
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.BACKUP_DB || 'backup_management',
    charset: 'utf8mb4'
};

// Configurazione retention (giorni)
const DEFAULT_RETENTION_DAYS = 90;

/**
 * Classe per la pulizia del database
 */
class DatabaseCleaner {
    constructor() {
        this.connection = null;
        this.retentionDays = DEFAULT_RETENTION_DAYS;
        this.logFile = null;
    }

    /**
     * Inizializza la connessione al database
     */
    async initialize() {
        try {
            this.connection = await mysql.createConnection(DB_CONFIG);
            console.log(`[${new Date().toISOString()}] Connessione al database stabilita`);
            return true;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Errore connessione database:`, error.message);
            return false;
        }
    }

    /**
     * Pulisce i record vecchi dalle tabelle di backup
     */
    async cleanupBackupRecords() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const tables = [
            { name: 'backup_logs', dateColumn: 'created_at' },
            { name: 'backup_jobs', dateColumn: 'start_time' },
            { name: 'backup_files', dateColumn: 'created_at' }
        ];

        let totalDeleted = 0;

        for (const table of tables) {
            try {
                // Conta i record da eliminare
                const [countResult] = await this.connection.execute(
                    `SELECT COUNT(*) as count FROM ${table.name} WHERE ${table.dateColumn} < ?`,
                    [cutoffDateStr]
                );

                const recordsToDelete = countResult[0].count;

                if (recordsToDelete > 0) {
                    // Elimina i record vecchi
                    const [deleteResult] = await this.connection.execute(
                        `DELETE FROM ${table.name} WHERE ${table.dateColumn} < ?`,
                        [cutoffDateStr]
                    );

                    console.log(`[${new Date().toISOString()}] Eliminati ${deleteResult.affectedRows} record da ${table.name}`);
                    totalDeleted += deleteResult.affectedRows;
                } else {
                    console.log(`[${new Date().toISOString()}] Nessun record da eliminare in ${table.name}`);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Errore pulizia ${table.name}:`, error.message);
            }
        }

        return totalDeleted;
    }

    /**
     * Pulisce i file orfani (riferimenti a file non esistenti)
     */
    async cleanupOrphanedFiles() {
        try {
            const [files] = await this.connection.execute(
                'SELECT id, file_path FROM backup_files WHERE status = "completed"'
            );

            let orphanedCount = 0;

            for (const file of files) {
                try {
                    await fs.access(file.file_path);
                } catch (error) {
                    // File non esiste, rimuovi il record
                    await this.connection.execute(
                        'DELETE FROM backup_files WHERE id = ?',
                        [file.id]
                    );
                    
                    console.log(`[${new Date().toISOString()}] Rimosso riferimento file orfano: ${file.file_path}`);
                    orphanedCount++;
                }
            }

            return orphanedCount;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Errore pulizia file orfani:`, error.message);
            return 0;
        }
    }

    /**
     * Ottimizza le tabelle del database
     */
    async optimizeTables() {
        const tables = ['backup_jobs', 'backup_files', 'backup_logs', 'backup_schedules', 'backup_configs'];
        
        for (const table of tables) {
            try {
                await this.connection.execute(`OPTIMIZE TABLE ${table}`);
                console.log(`[${new Date().toISOString()}] Tabella ${table} ottimizzata`);
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Errore ottimizzazione ${table}:`, error.message);
            }
        }
    }

    /**
     * Registra l'operazione di pulizia
     */
    async logCleanupOperation(deletedRecords, orphanedFiles) {
        try {
            await this.connection.execute(
                `INSERT INTO backup_logs (job_id, level, message, details, created_at) 
                 VALUES (NULL, 'INFO', 'Database cleanup completed', ?, NOW())`,
                [JSON.stringify({
                    deleted_records: deletedRecords,
                    orphaned_files: orphanedFiles,
                    retention_days: this.retentionDays
                })]
            );
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Errore registrazione log:`, error.message);
        }
    }

    /**
     * Chiude la connessione al database
     */
    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log(`[${new Date().toISOString()}] Connessione database chiusa`);
        }
    }

    /**
     * Esegue la pulizia completa
     */
    async run() {
        console.log(`[${new Date().toISOString()}] Avvio pulizia database backup...`);
        console.log(`[${new Date().toISOString()}] Retention: ${this.retentionDays} giorni`);

        if (!(await this.initialize())) {
            process.exit(1);
        }

        try {
            // Pulizia record vecchi
            const deletedRecords = await this.cleanupBackupRecords();
            
            // Pulizia file orfani
            const orphanedFiles = await this.cleanupOrphanedFiles();
            
            // Ottimizzazione tabelle
            await this.optimizeTables();
            
            // Registrazione operazione
            await this.logCleanupOperation(deletedRecords, orphanedFiles);
            
            console.log(`[${new Date().toISOString()}] Pulizia database completata:`);
            console.log(`[${new Date().toISOString()}] - Record eliminati: ${deletedRecords}`);
            console.log(`[${new Date().toISOString()}] - File orfani rimossi: ${orphanedFiles}`);
            
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Errore durante la pulizia:`, error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Parsing argomenti command line
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        retentionDays: DEFAULT_RETENTION_DAYS
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--retention-days' && i + 1 < args.length) {
            options.retentionDays = parseInt(args[i + 1]);
            i++;
        } else if (arg.startsWith('--retention-days=')) {
            options.retentionDays = parseInt(arg.split('=')[1]);
        } else if (arg === '--help' || arg === '-h') {
            console.log('Uso: node cleanup-database.js [opzioni]');
            console.log('Opzioni:');
            console.log('  --retention-days <giorni>  Giorni di retention (default: 90)');
            console.log('  --help, -h                 Mostra questo aiuto');
            process.exit(0);
        }
    }

    return options;
}

// Esecuzione principale
if (require.main === module) {
    const options = parseArguments();
    
    const cleaner = new DatabaseCleaner();
    cleaner.retentionDays = options.retentionDays;
    
    cleaner.run().catch(error => {
        console.error(`[${new Date().toISOString()}] Errore fatale:`, error.message);
        process.exit(1);
    });
}

module.exports = DatabaseCleaner;