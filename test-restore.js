const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Configurazione
const config = {
    host: 'localhost',
    user: 'root',
    password: ''
};

const testDatabases = {
    'viaggi_db_test': 'viaggi_db',
    'gestionelogistica_test': 'gestionelogistica'
};

class RestoreTest {
    constructor() {
        this.connection = null;
        this.results = {
            timestamp: new Date().toISOString(),
            testDatabases: [],
            backupFiles: [],
            restoreResults: [],
            verificationResults: [],
            errors: []
        };
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(config);
            console.log('✅ Connessione al database MySQL stabilita');
        } catch (error) {
            console.error('❌ Errore connessione MySQL:', error.message);
            throw error;
        }
    }

    async createTestDatabases() {
        console.log('\n🔧 CREAZIONE DATABASE DI TEST');
        console.log('='.repeat(50));
        
        for (const [testDb, originalDb] of Object.entries(testDatabases)) {
            try {
                // Elimina database di test se esiste
                await this.connection.execute(`DROP DATABASE IF EXISTS ${testDb}`);
                console.log(`🗑️  Database ${testDb} eliminato (se esisteva)`);
                
                // Crea nuovo database di test
                await this.connection.execute(`CREATE DATABASE ${testDb} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                console.log(`✅ Database di test ${testDb} creato`);
                
                this.results.testDatabases.push({
                    name: testDb,
                    original: originalDb,
                    created: true,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`❌ Errore creazione ${testDb}:`, error.message);
                this.results.errors.push(`Creazione ${testDb}: ${error.message}`);
                throw error;
            }
        }
    }

    async getLatestBackupFiles() {
        console.log('\n📁 RICERCA FILE DI BACKUP PIÙ RECENTI');
        console.log('='.repeat(50));
        
        try {
            // Connessione al database backup_management
            const backupConn = await mysql.createConnection({
                ...config,
                database: 'backup_management'
            });
            
            // Query per ottenere i file di backup più recenti
            const [files] = await backupConn.execute(`
                SELECT 
                    bf.file_path,
                    bf.file_size_bytes,
                    bf.created_at,
                    bj.id as job_id,
                    bj.backup_type
                FROM backup_files bf
                JOIN backup_jobs bj ON bf.job_id = bj.id
                WHERE bj.status = 'completed'
                AND bf.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                ORDER BY bf.created_at DESC
                LIMIT 10
            `);
            
            console.log(`📋 Trovati ${files.length} file di backup recenti:`);
            files.forEach(file => {
                console.log(`  📄 ${path.basename(file.file_path)} (${(file.file_size_bytes / (1024*1024)).toFixed(2)} MB)`);
                console.log(`     Job ID: ${file.job_id} | Tipo: ${file.backup_type} | Data: ${file.created_at}`);
                
                // Verifica se il file esiste fisicamente
                if (fs.existsSync(file.file_path)) {
                    console.log(`     ✅ File fisico trovato`);
                    this.results.backupFiles.push({
                        path: file.file_path,
                        size: file.file_size_bytes,
                        jobId: file.job_id,
                        type: file.backup_type,
                        exists: true,
                        database: this.detectDatabaseFromPath(file.file_path)
                    });
                } else {
                    console.log(`     ❌ File fisico NON trovato`);
                    this.results.backupFiles.push({
                        path: file.file_path,
                        size: file.file_size_bytes,
                        jobId: file.job_id,
                        type: file.backup_type,
                        exists: false,
                        database: this.detectDatabaseFromPath(file.file_path)
                    });
                }
            });
            
            await backupConn.end();
            
        } catch (error) {
            console.error('❌ Errore ricerca backup:', error.message);
            this.results.errors.push(`Ricerca backup: ${error.message}`);
            throw error;
        }
    }

    detectDatabaseFromPath(filePath) {
        const fileName = path.basename(filePath).toLowerCase();
        if (fileName.includes('viaggi')) return 'viaggi_db';
        if (fileName.includes('gestione')) return 'gestionelogistica';
        return 'unknown';
    }

    async restoreBackups() {
        console.log('\n🔄 RIPRISTINO BACKUP SUI DATABASE DI TEST');
        console.log('='.repeat(50));
        
        // Raggruppa i backup per database
        const backupsByDb = {};
        this.results.backupFiles.filter(f => f.exists).forEach(file => {
            if (!backupsByDb[file.database]) {
                backupsByDb[file.database] = [];
            }
            backupsByDb[file.database].push(file);
        });
        
        for (const [originalDb, backups] of Object.entries(backupsByDb)) {
            if (backups.length === 0) continue;
            
            const testDb = originalDb + '_test';
            const latestBackup = backups[0]; // Il più recente
            
            console.log(`\n📦 Ripristino ${originalDb} → ${testDb}`);
            console.log(`   File: ${latestBackup.path}`);
            
            try {
                // Comando per il ripristino usando il percorso completo di MySQL
                const mysqlPath = 'C:\\xampp\\mysql\\bin\\mysql.exe';
                const restoreCommand = `"${mysqlPath}" -u root ${testDb} < "${latestBackup.path}"`;
                console.log(`   🔧 Comando: ${restoreCommand}`);
                
                const startTime = Date.now();
                await execAsync(restoreCommand);
                const duration = Date.now() - startTime;
                
                console.log(`   ✅ Ripristino completato in ${duration}ms`);
                
                this.results.restoreResults.push({
                    originalDatabase: originalDb,
                    testDatabase: testDb,
                    backupFile: latestBackup.path,
                    success: true,
                    duration: duration,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`   ❌ Errore ripristino ${testDb}:`, error.message);
                this.results.errors.push(`Ripristino ${testDb}: ${error.message}`);
                
                this.results.restoreResults.push({
                    originalDatabase: originalDb,
                    testDatabase: testDb,
                    backupFile: latestBackup.path,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    async verifyDataIntegrity() {
        console.log('\n🔍 VERIFICA INTEGRITÀ DATI');
        console.log('='.repeat(50));
        
        for (const [testDb, originalDb] of Object.entries(testDatabases)) {
            console.log(`\n📊 Confronto ${originalDb} vs ${testDb}`);
            
            try {
                // Conta tabelle
                const [originalTables] = await this.connection.execute(
                    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?`,
                    [originalDb]
                );
                
                const [testTables] = await this.connection.execute(
                    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?`,
                    [testDb]
                );
                
                const originalCount = originalTables[0].count;
                const testCount = testTables[0].count;
                
                console.log(`   📋 Tabelle originali: ${originalCount}`);
                console.log(`   📋 Tabelle test: ${testCount}`);
                
                const tablesMatch = originalCount === testCount;
                console.log(`   ${tablesMatch ? '✅' : '❌'} Numero tabelle: ${tablesMatch ? 'CORRETTO' : 'DIVERSO'}`);
                
                this.results.verificationResults.push({
                    originalDatabase: originalDb,
                    testDatabase: testDb,
                    originalTables: originalCount,
                    testTables: testCount,
                    tablesMatch: tablesMatch,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`   ❌ Errore verifica ${testDb}:`, error.message);
                this.results.errors.push(`Verifica ${testDb}: ${error.message}`);
            }
        }
    }

    async generateReport() {
        console.log('\n📄 REPORT FINALE TEST DI RIPRISTINO');
        console.log('='.repeat(60));
        
        const report = {
            timestamp: this.results.timestamp,
            summary: {
                testDatabasesCreated: this.results.testDatabases.length,
                backupFilesFound: this.results.backupFiles.filter(f => f.exists).length,
                successfulRestores: this.results.restoreResults.filter(r => r.success).length,
                failedRestores: this.results.restoreResults.filter(r => !r.success).length,
                verificationsPassed: this.results.verificationResults.filter(v => v.tablesMatch).length,
                totalErrors: this.results.errors.length
            },
            details: this.results
        };
        
        console.log('\n📊 RIEPILOGO:');
        console.log(`   🗄️  Database di test creati: ${report.summary.testDatabasesCreated}`);
        console.log(`   📁 File di backup trovati: ${report.summary.backupFilesFound}`);
        console.log(`   ✅ Ripristini riusciti: ${report.summary.successfulRestores}`);
        console.log(`   ❌ Ripristini falliti: ${report.summary.failedRestores}`);
        console.log(`   🔍 Verifiche superate: ${report.summary.verificationsPassed}`);
        console.log(`   ⚠️  Errori totali: ${report.summary.totalErrors}`);
        
        // Salva report su file
        const reportPath = path.join(__dirname, `restore-test-report-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Report salvato: ${reportPath}`);
        
        return report;
    }

    async cleanup() {
        console.log('\n🧹 PULIZIA DATABASE DI TEST');
        console.log('='.repeat(50));
        
        for (const testDb of Object.keys(testDatabases)) {
            try {
                await this.connection.execute(`DROP DATABASE IF EXISTS ${testDb}`);
                console.log(`🗑️  Database ${testDb} eliminato`);
            } catch (error) {
                console.error(`❌ Errore eliminazione ${testDb}:`, error.message);
            }
        }
    }

    async run() {
        try {
            console.log('🚀 AVVIO TEST DI RIPRISTINO BACKUP');
            console.log('='.repeat(60));
            console.log(`⏰ Timestamp: ${this.results.timestamp}`);
            console.log('⚠️  ATTENZIONE: Test su database separati - database originali NON toccati\n');
            
            await this.connect();
            await this.createTestDatabases();
            await this.getLatestBackupFiles();
            await this.restoreBackups();
            await this.verifyDataIntegrity();
            const report = await this.generateReport();
            
            console.log('\n🎉 TEST COMPLETATO CON SUCCESSO!');
            
            return report;
            
        } catch (error) {
            console.error('\n💥 ERRORE DURANTE IL TEST:', error.message);
            this.results.errors.push(`Test generale: ${error.message}`);
            throw error;
        } finally {
            if (this.connection) {
                await this.connection.end();
            }
        }
    }
}

// Esecuzione
(async () => {
    const test = new RestoreTest();
    try {
        await test.run();
    } catch (error) {
        console.error('Test fallito:', error.message);
        process.exit(1);
    }
})();