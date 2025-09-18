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

class GestioneLogisticaRestoreTest {
    constructor() {
        this.connection = null;
        this.results = {
            timestamp: new Date().toISOString(),
            testDatabase: 'gestionelogistica_test',
            originalDatabase: 'gestionelogistica',
            backupFile: null,
            steps: [],
            performance: {}
        };
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(config);
            console.log('✅ Connessione MySQL stabilita');
            this.addStep('connect', true, 'Connessione MySQL stabilita');
        } catch (error) {
            console.error('❌ Errore connessione:', error.message);
            this.addStep('connect', false, error.message);
            throw error;
        }
    }

    addStep(step, success, message, duration = null) {
        this.results.steps.push({
            step,
            success,
            message,
            duration,
            timestamp: new Date().toISOString()
        });
    }

    async createTestDatabase() {
        console.log('\n🔧 CREAZIONE DATABASE DI TEST GESTIONELOGISTICA');
        console.log('='.repeat(50));
        
        const startTime = Date.now();
        try {
            // Elimina database di test se esiste
            await this.connection.execute(`DROP DATABASE IF EXISTS gestionelogistica_test`);
            console.log('🗑️  Database gestionelogistica_test eliminato (se esisteva)');
            
            // Crea nuovo database di test
            await this.connection.execute(`CREATE DATABASE gestionelogistica_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log('✅ Database di test gestionelogistica_test creato');
            
            const duration = Date.now() - startTime;
            this.addStep('create_test_db', true, 'Database di test creato', duration);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Errore creazione database:', error.message);
            this.addStep('create_test_db', false, error.message, duration);
            throw error;
        }
    }

    async findLatestBackup() {
        console.log('\n📁 RICERCA BACKUP PIÙ RECENTE DI gestionelogistica');
        console.log('='.repeat(50));
        
        const startTime = Date.now();
        try {
            const backupConn = await mysql.createConnection({
                ...config,
                database: 'backup_management'
            });
            
            const [files] = await backupConn.execute(`
                SELECT 
                    bf.file_path,
                    bf.file_size_bytes,
                    bf.created_at,
                    bj.id as job_id
                FROM backup_files bf
                JOIN backup_jobs bj ON bf.job_id = bj.id
                WHERE bj.status = 'completed'
                AND bf.file_path LIKE '%gestionelogistica%'
                AND bf.file_path NOT LIKE '%test%'
                ORDER BY bf.created_at DESC
                LIMIT 1
            `);
            
            if (files.length === 0) {
                throw new Error('Nessun backup di gestionelogistica trovato');
            }
            
            const backup = files[0];
            this.results.backupFile = backup.file_path;
            this.results.performance.backupSize = backup.file_size_bytes;
            
            console.log(`📄 Backup trovato: ${path.basename(backup.file_path)}`);
            console.log(`   Dimensione: ${(backup.file_size_bytes / (1024*1024)).toFixed(2)} MB`);
            console.log(`   Data: ${backup.created_at}`);
            console.log(`   Job ID: ${backup.job_id}`);
            
            if (!fs.existsSync(backup.file_path)) {
                throw new Error(`File backup non trovato: ${backup.file_path}`);
            }
            
            console.log('✅ File backup verificato');
            const duration = Date.now() - startTime;
            this.addStep('find_backup', true, `Backup trovato: ${path.basename(backup.file_path)} (${(backup.file_size_bytes / (1024*1024)).toFixed(2)} MB)`, duration);
            
            await backupConn.end();
            return backup;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Errore ricerca backup:', error.message);
            this.addStep('find_backup', false, error.message, duration);
            throw error;
        }
    }

    async restoreBackup(backup) {
        console.log('\n🔄 RIPRISTINO BACKUP GESTIONELOGISTICA');
        console.log('='.repeat(50));
        console.log('⚠️  ATTENZIONE: File di grandi dimensioni - il ripristino potrebbe richiedere diversi minuti');
        
        const startTime = Date.now();
        try {
            const mysqlPath = 'C:\\xampp\\mysql\\bin\\mysql.exe';
            const restoreCommand = `"${mysqlPath}" -u root gestionelogistica_test < "${backup.file_path}"`;
            
            console.log('🔧 Avvio ripristino...');
            console.log(`   File: ${path.basename(backup.file_path)}`);
            console.log(`   Dimensione: ${(backup.file_size_bytes / (1024*1024)).toFixed(2)} MB`);
            console.log('   ⏳ Attendere...');
            
            // Mostra progresso ogni 30 secondi
            const progressInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                console.log(`   ⏳ Ripristino in corso... ${elapsed}s`);
            }, 30000);
            
            await execAsync(restoreCommand);
            clearInterval(progressInterval);
            
            const duration = Date.now() - startTime;
            this.results.performance.restoreTime = duration;
            
            console.log(`✅ Ripristino completato in ${Math.floor(duration/1000)}s (${(duration/60000).toFixed(1)} min)`);
            console.log(`📊 Velocità: ${((backup.file_size_bytes / (1024*1024)) / (duration/1000)).toFixed(2)} MB/s`);
            
            this.addStep('restore', true, `Ripristino completato in ${Math.floor(duration/1000)}s`, duration);
            
            return { success: true, duration };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Errore ripristino:', error.message);
            this.addStep('restore', false, error.message, duration);
            throw error;
        }
    }

    async verifyRestore() {
        console.log('\n🔍 VERIFICA RIPRISTINO GESTIONELOGISTICA');
        console.log('='.repeat(50));
        
        const startTime = Date.now();
        try {
            // Conta tabelle database originale
            const [originalTables] = await this.connection.execute(
                `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'gestionelogistica'`
            );
            
            // Conta tabelle database di test
            const [testTables] = await this.connection.execute(
                `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'gestionelogistica_test'`
            );
            
            const originalCount = originalTables[0].count;
            const testCount = testTables[0].count;
            
            console.log(`📊 Tabelle database originale: ${originalCount}`);
            console.log(`📊 Tabelle database di test: ${testCount}`);
            
            const tablesMatch = originalCount === testCount;
            console.log(`${tablesMatch ? '✅' : '❌'} Numero tabelle: ${tablesMatch ? 'CORRETTO' : 'DIVERSO'}`);
            
            // Verifica alcune tabelle principali
            if (tablesMatch) {
                const [testTablesList] = await this.connection.execute(
                    `SELECT table_name, table_rows FROM information_schema.tables 
                     WHERE table_schema = 'gestionelogistica_test' 
                     AND table_type = 'BASE TABLE'
                     ORDER BY table_rows DESC
                     LIMIT 10`
                );
                
                console.log('📋 Prime 10 tabelle per numero di righe:');
                testTablesList.forEach(table => {
                    console.log(`   - ${table.table_name}: ${table.table_rows || 0} righe`);
                });
                
                // Conta totale righe
                let totalRows = 0;
                for (const table of testTablesList) {
                    try {
                        const [count] = await this.connection.execute(
                            `SELECT COUNT(*) as count FROM gestionelogistica_test.${table.table_name}`
                        );
                        totalRows += count[0].count;
                    } catch (e) {
                        console.log(`   ⚠️  Errore conteggio ${table.table_name}: ${e.message}`);
                    }
                }
                
                console.log(`📊 Totale righe nelle prime 10 tabelle: ${totalRows}`);
                this.results.performance.totalRows = totalRows;
            }
            
            const duration = Date.now() - startTime;
            this.addStep('verify', tablesMatch, 
                tablesMatch ? `${testCount} tabelle ripristinate correttamente` : `Numero tabelle diverso: originale=${originalCount}, test=${testCount}`,
                duration
            );
            
            return { originalCount, testCount, tablesMatch };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Errore verifica:', error.message);
            this.addStep('verify', false, error.message, duration);
            throw error;
        }
    }

    async cleanup() {
        console.log('\n🧹 PULIZIA');
        console.log('='.repeat(50));
        
        const startTime = Date.now();
        try {
            await this.connection.execute(`DROP DATABASE IF EXISTS gestionelogistica_test`);
            console.log('🗑️  Database di test eliminato');
            const duration = Date.now() - startTime;
            this.addStep('cleanup', true, 'Database di test eliminato', duration);
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Errore pulizia:', error.message);
            this.addStep('cleanup', false, error.message, duration);
        }
    }

    generateReport() {
        console.log('\n📄 REPORT TEST RIPRISTINO GESTIONELOGISTICA');
        console.log('='.repeat(60));
        
        const successfulSteps = this.results.steps.filter(s => s.success).length;
        const totalSteps = this.results.steps.length;
        const totalDuration = this.results.steps.reduce((sum, step) => sum + (step.duration || 0), 0);
        
        console.log(`⏰ Timestamp: ${this.results.timestamp}`);
        console.log(`🗄️  Database originale: ${this.results.originalDatabase}`);
        console.log(`🧪 Database di test: ${this.results.testDatabase}`);
        console.log(`📁 File backup: ${this.results.backupFile ? path.basename(this.results.backupFile) : 'N/A'}`);
        console.log(`✅ Passi completati: ${successfulSteps}/${totalSteps}`);
        console.log(`⏱️  Durata totale: ${Math.floor(totalDuration/1000)}s (${(totalDuration/60000).toFixed(1)} min)`);
        
        if (this.results.performance.backupSize) {
            console.log(`📊 Dimensione backup: ${(this.results.performance.backupSize / (1024*1024)).toFixed(2)} MB`);
        }
        if (this.results.performance.restoreTime) {
            console.log(`🔄 Tempo ripristino: ${Math.floor(this.results.performance.restoreTime/1000)}s`);
            console.log(`📈 Velocità ripristino: ${((this.results.performance.backupSize / (1024*1024)) / (this.results.performance.restoreTime/1000)).toFixed(2)} MB/s`);
        }
        if (this.results.performance.totalRows) {
            console.log(`📋 Righe verificate: ${this.results.performance.totalRows}`);
        }
        
        console.log('\n📋 DETTAGLIO PASSI:');
        this.results.steps.forEach((step, index) => {
            const icon = step.success ? '✅' : '❌';
            const duration = step.duration ? ` (${Math.floor(step.duration/1000)}s)` : '';
            console.log(`   ${index + 1}. ${icon} ${step.step}: ${step.message}${duration}`);
        });
        
        const allSuccess = successfulSteps === totalSteps;
        console.log(`\n🎯 RISULTATO FINALE: ${allSuccess ? '✅ SUCCESSO' : '❌ FALLIMENTO'}`);
        
        // Salva report
        const reportPath = path.join(__dirname, `gestionelogistica-test-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Report salvato: ${reportPath}`);
        
        return allSuccess;
    }

    async run() {
        try {
            console.log('🚀 TEST RIPRISTINO GESTIONELOGISTICA (DATABASE GRANDE)');
            console.log('='.repeat(70));
            console.log('⚠️  ATTENZIONE: Test su database separato - database originale NON toccato');
            console.log('⚠️  NOTA: Questo test può richiedere diversi minuti a causa delle dimensioni\n');
            
            await this.connect();
            await this.createTestDatabase();
            const backup = await this.findLatestBackup();
            await this.restoreBackup(backup);
            await this.verifyRestore();
            await this.cleanup();
            
            const success = this.generateReport();
            
            if (success) {
                console.log('\n🎉 TEST GESTIONELOGISTICA COMPLETATO CON SUCCESSO!');
                console.log('✅ Il sistema di backup e ripristino funziona correttamente anche per database grandi');
            } else {
                console.log('\n⚠️  TEST GESTIONELOGISTICA COMPLETATO CON ERRORI');
                console.log('❌ Verificare i dettagli nel report');
            }
            
            return success;
            
        } catch (error) {
            console.error('\n💥 ERRORE DURANTE IL TEST GESTIONELOGISTICA:', error.message);
            this.addStep('general_error', false, error.message);
            this.generateReport();
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
    const test = new GestioneLogisticaRestoreTest();
    try {
        const success = await test.run();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Test fallito:', error.message);
        process.exit(1);
    }
})();