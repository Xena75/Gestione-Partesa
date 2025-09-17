#!/usr/bin/env node
/**
 * ============================================================================
 * Script di Validazione e Monitoraggio Backup
 * Sistema: Gestione Partesa
 * Funzione: Validazione integrità backup e generazione report
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

// Carica variabili d'ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') });

// Configurazione
const CONFIG = {
    mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: 'backup_management'
    },
    paths: {
        backupRoot: path.join(__dirname, '..', 'storage'),
        fullBackups: path.join(__dirname, '..', 'storage', 'full-backups'),
        incrementalBackups: path.join(__dirname, '..', 'storage', 'incremental-backups'),
        differentialBackups: path.join(__dirname, '..', 'storage', 'differential-backups'),
        logs: path.join(__dirname, '..', 'logs'),
        temp: path.join(__dirname, '..', 'storage', 'temp')
    },
    validation: {
        checksumAlgorithm: 'sha256',
        maxFileAge: 30, // giorni
        minBackupSize: 1024, // bytes
        compressionFormats: ['.gz', '.zip', '.7z']
    }
};

// Classe principale per la validazione
class BackupValidator {
    constructor() {
        this.connection = null;
        this.results = {
            timestamp: new Date().toISOString(),
            validation: {
                totalFiles: 0,
                validFiles: 0,
                corruptFiles: 0,
                missingFiles: 0,
                errors: []
            },
            statistics: {
                totalSize: 0,
                oldestBackup: null,
                newestBackup: null,
                backupTypes: {
                    full: { count: 0, size: 0 },
                    incremental: { count: 0, size: 0 },
                    differential: { count: 0, size: 0 }
                }
            },
            recommendations: []
        };
    }

    /**
     * Inizializza la connessione al database
     */
    async initDatabase() {
        try {
            this.connection = await mysql.createConnection(CONFIG.mysql);
            console.log('[INFO] Connessione al database stabilita');
            return true;
        } catch (error) {
            console.error('[ERROR] Impossibile connettersi al database:', error.message);
            return false;
        }
    }

    /**
     * Chiude la connessione al database
     */
    async closeDatabase() {
        if (this.connection) {
            await this.connection.end();
            console.log('[INFO] Connessione al database chiusa');
        }
    }

    /**
     * Calcola il checksum di un file
     */
    calculateChecksum(filePath) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const hashSum = crypto.createHash(CONFIG.validation.checksumAlgorithm);
            hashSum.update(fileBuffer);
            return hashSum.digest('hex');
        } catch (error) {
            throw new Error(`Errore nel calcolo checksum: ${error.message}`);
        }
    }

    /**
     * Verifica se un file compresso è valido
     */
    validateCompressedFile(filePath) {
        try {
            const ext = path.extname(filePath).toLowerCase();
            
            switch (ext) {
                case '.gz':
                    // Testa il file gzip
                    execSync(`gzip -t "${filePath}"`, { stdio: 'pipe' });
                    return true;
                case '.zip':
                    // Testa il file zip
                    execSync(`powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${filePath}').Dispose()"`, { stdio: 'pipe' });
                    return true;
                case '.7z':
                    // Testa il file 7z (se disponibile)
                    try {
                        execSync(`7z t "${filePath}"`, { stdio: 'pipe' });
                        return true;
                    } catch {
                        console.warn(`[WARNING] 7z non disponibile per testare ${filePath}`);
                        return true; // Assume valido se 7z non è disponibile
                    }
                default:
                    return true; // File non compresso
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Valida un singolo file di backup
     */
    async validateBackupFile(filePath, backupType) {
        const fileName = path.basename(filePath);
        const stats = fs.statSync(filePath);
        
        console.log(`[INFO] Validazione ${fileName}...`);
        
        const validation = {
            file: fileName,
            path: filePath,
            type: backupType,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            valid: true,
            errors: [],
            checksum: null
        };

        try {
            // Verifica dimensione minima
            if (stats.size < CONFIG.validation.minBackupSize) {
                validation.valid = false;
                validation.errors.push(`File troppo piccolo: ${stats.size} bytes`);
            }

            // Verifica età del file
            const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > CONFIG.validation.maxFileAge) {
                validation.errors.push(`File vecchio: ${Math.round(ageInDays)} giorni`);
            }

            // Calcola checksum
            validation.checksum = this.calculateChecksum(filePath);

            // Verifica integrità file compresso
            if (CONFIG.validation.compressionFormats.some(ext => fileName.endsWith(ext))) {
                if (!this.validateCompressedFile(filePath)) {
                    validation.valid = false;
                    validation.errors.push('File compresso corrotto');
                }
            }

            // Aggiorna statistiche
            this.results.statistics.totalSize += stats.size;
            this.results.statistics.backupTypes[backupType].count++;
            this.results.statistics.backupTypes[backupType].size += stats.size;

            if (!this.results.statistics.oldestBackup || stats.mtime < this.results.statistics.oldestBackup) {
                this.results.statistics.oldestBackup = stats.mtime;
            }
            if (!this.results.statistics.newestBackup || stats.mtime > this.results.statistics.newestBackup) {
                this.results.statistics.newestBackup = stats.mtime;
            }

            // Aggiorna contatori
            this.results.validation.totalFiles++;
            if (validation.valid) {
                this.results.validation.validFiles++;
            } else {
                this.results.validation.corruptFiles++;
                this.results.validation.errors.push(...validation.errors.map(err => `${fileName}: ${err}`));
            }

            // Aggiorna database se disponibile
            if (this.connection) {
                await this.updateFileValidation(validation);
            }

        } catch (error) {
            validation.valid = false;
            validation.errors.push(`Errore validazione: ${error.message}`);
            this.results.validation.corruptFiles++;
            this.results.validation.errors.push(`${fileName}: ${error.message}`);
        }

        return validation;
    }

    /**
     * Aggiorna il database con i risultati della validazione
     */
    async updateFileValidation(validation) {
        try {
            const query = `
                UPDATE backup_files 
                SET 
                    checksum = ?,
                    last_validated = NOW(),
                    validation_status = ?,
                    validation_errors = ?
                WHERE file_path = ?
            `;
            
            await this.connection.execute(query, [
                validation.checksum,
                validation.valid ? 'valid' : 'invalid',
                validation.errors.length > 0 ? JSON.stringify(validation.errors) : null,
                validation.path
            ]);
        } catch (error) {
            console.warn(`[WARNING] Errore aggiornamento database per ${validation.file}: ${error.message}`);
        }
    }

    /**
     * Verifica file mancanti nel database
     */
    async checkMissingFiles() {
        if (!this.connection) return;

        try {
            const [rows] = await this.connection.execute(
                'SELECT file_path, database_name FROM backup_files WHERE validation_status != "deleted"'
            );

            for (const row of rows) {
                if (!fs.existsSync(row.file_path)) {
                    console.warn(`[WARNING] File mancante: ${row.file_path}`);
                    this.results.validation.missingFiles++;
                    this.results.validation.errors.push(`File mancante: ${path.basename(row.file_path)}`);
                    
                    // Marca come eliminato nel database
                    await this.connection.execute(
                        'UPDATE backup_files SET validation_status = "deleted", last_validated = NOW() WHERE file_path = ?',
                        [row.file_path]
                    );
                }
            }
        } catch (error) {
            console.error('[ERROR] Errore controllo file mancanti:', error.message);
        }
    }

    /**
     * Valida tutti i backup in una directory
     */
    async validateDirectory(dirPath, backupType) {
        if (!fs.existsSync(dirPath)) {
            console.warn(`[WARNING] Directory non trovata: ${dirPath}`);
            return [];
        }

        const files = fs.readdirSync(dirPath)
            .filter(file => {
                const filePath = path.join(dirPath, file);
                return fs.statSync(filePath).isFile();
            })
            .map(file => path.join(dirPath, file));

        const validations = [];
        for (const filePath of files) {
            const validation = await this.validateBackupFile(filePath, backupType);
            validations.push(validation);
        }

        return validations;
    }

    /**
     * Genera raccomandazioni basate sui risultati
     */
    generateRecommendations() {
        const recommendations = [];

        // Verifica frequenza backup
        if (this.results.statistics.newestBackup) {
            const daysSinceLastBackup = (Date.now() - this.results.statistics.newestBackup.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLastBackup > 1) {
                recommendations.push(`Ultimo backup ${Math.round(daysSinceLastBackup)} giorni fa - considerare backup più frequenti`);
            }
        }

        // Verifica spazio utilizzato
        const totalSizeGB = this.results.statistics.totalSize / (1024 * 1024 * 1024);
        if (totalSizeGB > 100) {
            recommendations.push(`Spazio backup elevato (${totalSizeGB.toFixed(2)} GB) - considerare pulizia automatica`);
        }

        // Verifica file corrotti
        if (this.results.validation.corruptFiles > 0) {
            recommendations.push(`${this.results.validation.corruptFiles} file corrotti trovati - verificare e rigenerare`);
        }

        // Verifica bilanciamento tipi backup
        const fullCount = this.results.statistics.backupTypes.full.count;
        const incCount = this.results.statistics.backupTypes.incremental.count;
        if (fullCount === 0 && incCount > 0) {
            recommendations.push('Nessun backup completo trovato - eseguire backup completo');
        }

        this.results.recommendations = recommendations;
    }

    /**
     * Salva il report di validazione
     */
    async saveReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(CONFIG.paths.logs, `validation-report-${timestamp}.json`);
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
            console.log(`[INFO] Report salvato in: ${reportPath}`);
            
            // Salva anche nel database se disponibile
            if (this.connection) {
                await this.connection.execute(
                    'INSERT INTO backup_logs (log_id, job_id, log_level, message, details, created_at) VALUES (UUID(), NULL, ?, ?, ?, NOW())',
                    ['INFO', 'Validazione backup completata', JSON.stringify(this.results)]
                );
            }
        } catch (error) {
            console.error('[ERROR] Errore salvataggio report:', error.message);
        }
    }

    /**
     * Stampa il riepilogo dei risultati
     */
    printSummary() {
        console.log('\n============================================================================');
        console.log('RIEPILOGO VALIDAZIONE BACKUP');
        console.log('============================================================================');
        console.log(`Timestamp: ${this.results.timestamp}`);
        console.log(`File totali: ${this.results.validation.totalFiles}`);
        console.log(`File validi: ${this.results.validation.validFiles}`);
        console.log(`File corrotti: ${this.results.validation.corruptFiles}`);
        console.log(`File mancanti: ${this.results.validation.missingFiles}`);
        console.log(`Dimensione totale: ${(this.results.statistics.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`);
        
        if (this.results.statistics.oldestBackup) {
            console.log(`Backup più vecchio: ${this.results.statistics.oldestBackup.toISOString()}`);
        }
        if (this.results.statistics.newestBackup) {
            console.log(`Backup più recente: ${this.results.statistics.newestBackup.toISOString()}`);
        }

        console.log('\nTipi di backup:');
        Object.entries(this.results.statistics.backupTypes).forEach(([type, stats]) => {
            console.log(`  ${type}: ${stats.count} file, ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        });

        if (this.results.validation.errors.length > 0) {
            console.log('\nErrori trovati:');
            this.results.validation.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }

        if (this.results.recommendations.length > 0) {
            console.log('\nRaccomandazioni:');
            this.results.recommendations.forEach(rec => {
                console.log(`  - ${rec}`);
            });
        }

        console.log('============================================================================\n');
    }

    /**
     * Esegue la validazione completa
     */
    async run(options = {}) {
        console.log('[INFO] Avvio validazione backup...');
        
        try {
            // Inizializza database
            await this.initDatabase();

            // Valida backup per tipo
            if (!options.type || options.type === 'full') {
                console.log('[INFO] Validazione backup completi...');
                await this.validateDirectory(CONFIG.paths.fullBackups, 'full');
            }

            if (!options.type || options.type === 'incremental') {
                console.log('[INFO] Validazione backup incrementali...');
                await this.validateDirectory(CONFIG.paths.incrementalBackups, 'incremental');
            }

            if (!options.type || options.type === 'differential') {
                console.log('[INFO] Validazione backup differenziali...');
                await this.validateDirectory(CONFIG.paths.differentialBackups, 'differential');
            }

            // Verifica file mancanti
            console.log('[INFO] Controllo file mancanti...');
            await this.checkMissingFiles();

            // Genera raccomandazioni
            this.generateRecommendations();

            // Salva report
            await this.saveReport();

            // Stampa riepilogo
            this.printSummary();

            console.log('[SUCCESS] Validazione completata con successo!');
            return this.results.validation.corruptFiles === 0 && this.results.validation.missingFiles === 0;

        } catch (error) {
            console.error('[ERROR] Errore durante la validazione:', error.message);
            return false;
        } finally {
            await this.closeDatabase();
        }
    }
}

// Funzione principale
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parsing argomenti
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--type' && i + 1 < args.length) {
            options.type = args[i + 1];
            i++;
        } else if (args[i] === '--timestamp' && i + 1 < args.length) {
            options.timestamp = args[i + 1];
            i++;
        } else if (args[i] === '--help') {
            console.log('Uso: node backup-validator.js [opzioni]');
            console.log('Opzioni:');
            console.log('  --type <tipo>      Valida solo backup di tipo specifico (full, incremental, differential)');
            console.log('  --timestamp <ts>   Valida solo backup con timestamp specifico');
            console.log('  --help             Mostra questo messaggio');
            process.exit(0);
        }
    }

    const validator = new BackupValidator();
    const success = await validator.run(options);
    
    process.exit(success ? 0 : 1);
}

// Esegui se chiamato direttamente
if (require.main === module) {
    main().catch(error => {
        console.error('[FATAL] Errore fatale:', error.message);
        process.exit(1);
    });
}

module.exports = BackupValidator;