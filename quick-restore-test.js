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

class QuickRestoreTest {
    constructor() {
        this.connection = null;
        this.results = {
            timestamp: new Date().toISOString(),
            testDatabase: 'viaggi_db_test',
            originalDatabase: 'viaggi_db',
            backupFile: null,
            steps: []
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

    addStep(step, success, message) {
        this.results.steps.push({
            step,
            success,
            message,
            timestamp: new Date().toISOString()
        });
    }

    async createTestDatabase() {
        console.log('\n🔧 CREAZIONE DATABASE DI TEST');
        console.log('='.repeat(40));
        
        try {
            // Elimina database di test se esiste
            await this.connection.execute(`DROP DATABASE IF EXISTS viaggi_db_test`);
            console.log('🗑️  Database viaggi_db_test eliminato (se esisteva)');
            
            // Crea nuovo database di test
            await this.connection.execute(`CREATE DATABASE viaggi_db_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log('✅ Database di test viaggi_db_test creato');
            
            this.addStep('create_test_db', true, 'Database di test creato');
            
        } catch (error) {
            console.error('❌ Errore creazione database:', error.message);
            this.addStep('create_test_db', false, error.message);
            throw error;
        }
    }

    async findLatestBackup() {
        console.log('\n📁 RICERCA BACKUP PIÙ RECENTE DI viaggi_db');
        console.log('='.repeat(40));
        
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
                AND bf.file_path LIKE '%viaggi_db%'
                ORDER BY bf.created_at DESC
                LIMIT 1
            `);
            
            if (files.length === 0) {
                throw new Error('Nessun backup di viaggi_db trovato');
            }
            
            const backup = files[0];
            this.results.backupFile = backup.file_path;
            
            console.log(`📄 Backup trovato: ${path.basename(backup.file_path)}`);
            console.log(`   Dimensione: ${(backup.file_size_bytes / (1024*1024)).toFixed(2)} MB`);
            console.log(`   Data: ${backup.created_at}`);
            console.log(`   Job ID: ${backup.job_id}`);
            
            if (!fs.existsSync(backup.file_path)) {
                throw new Error(`File backup non trovato: ${backup.file_path}`);
            }
            
            console.log('✅ File backup verificato');
            this.addStep('find_backup', true, `Backup trovato: ${path.basename(backup.file_path)}`);
            
            await backupConn.end();
            return backup;
            
        } catch (error) {
            console.error('❌ Errore ricerca backup:', error.message);
            this.addStep('find_backup', false, error.message);
            throw error;
        }
    }

    async restoreBackup(backup) {
        console.log('\n🔄 RIPRISTINO BACKUP');
        console.log('='.repeat(40));
        
        try {
            const mysqlPath = 'C:\\xampp\\mysql\\bin\\mysql.exe';
            const restoreCommand = `"${mysqlPath}" -u root viaggi_db_test < "${backup.file_path}"`;
            
            console.log('🔧 Esecuzione ripristino...');
            console.log(`   File: ${path.basename(backup.file_path)}`);
            
            const startTime = Date.now();
            await execAsync(restoreCommand);
            const duration = Date.now() - startTime;
            
            console.log(`✅ Ripristino completato in ${duration}ms`);
            this.addStep('restore', true, `Ripristino completato in ${duration}ms`);
            
            return { success: true, duration };
            
        } catch (error) {
            console.error('❌ Errore ripristino:', error.message);
            this.addStep('restore', false, error.message);
            throw error;
        }
    }

    async verifyRestore() {
        console.log('\n🔍 VERIFICA RIPRISTINO');
        console.log('='.repeat(40));
        
        try {
            // Conta tabelle database originale
            const [originalTables] = await this.connection.execute(
                `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'viaggi_db'`
            );
            
            // Conta tabelle database di test
            const [testTables] = await this.connection.execute(
                `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'viaggi_db_test'`
            );
            
            const originalCount = originalTables[0].count;
            const testCount = testTables[0].count;
            
            console.log(`📊 Tabelle database originale: ${originalCount}`);
            console.log(`📊 Tabelle database di test: ${testCount}`);
            
            const tablesMatch = originalCount === testCount;
            console.log(`${tablesMatch ? '✅' : '❌'} Numero tabelle: ${tablesMatch ? 'CORRETTO' : 'DIVERSO'}`);
            
            if (tablesMatch) {
                // Verifica alcune tabelle specifiche
                const [testTablesList] = await this.connection.execute(
                    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'viaggi_db_test' ORDER BY table_name`
                );
                
                console.log('📋 Tabelle ripristinate:');
                testTablesList.forEach(table => {
                    console.log(`   - ${table.table_name}`);
                });
                
                this.addStep('verify', true, `${testCount} tabelle ripristinate correttamente`);
            } else {
                this.addStep('verify', false, `Numero tabelle diverso: originale=${originalCount}, test=${testCount}`);
            }
            
            return { originalCount, testCount, tablesMatch };
            
        } catch (error) {
            console.error('❌ Errore verifica:', error.message);
            this.addStep('verify', false, error.message);
            throw error;
        }
    }

    async cleanup() {
        console.log('\n🧹 PULIZIA');
        console.log('='.repeat(40));
        
        try {
            await this.connection.execute(`DROP DATABASE IF EXISTS viaggi_db_test`);
            console.log('🗑️  Database di test eliminato');
            this.addStep('cleanup', true, 'Database di test eliminato');
        } catch (error) {
            console.error('❌ Errore pulizia:', error.message);
            this.addStep('cleanup', false, error.message);
        }
    }

    generateReport() {
        console.log('\n📄 REPORT TEST RIPRISTINO');
        console.log('='.repeat(50));
        
        const successfulSteps = this.results.steps.filter(s => s.success).length;
        const totalSteps = this.results.steps.length;
        
        console.log(`⏰ Timestamp: ${this.results.timestamp}`);
        console.log(`🗄️  Database originale: ${this.results.originalDatabase}`);
        console.log(`🧪 Database di test: ${this.results.testDatabase}`);
        console.log(`📁 File backup: ${this.results.backupFile ? path.basename(this.results.backupFile) : 'N/A'}`);
        console.log(`✅ Passi completati: ${successfulSteps}/${totalSteps}`);
        
        console.log('\n📋 DETTAGLIO PASSI:');
        this.results.steps.forEach((step, index) => {
            const icon = step.success ? '✅' : '❌';
            console.log(`   ${index + 1}. ${icon} ${step.step}: ${step.message}`);
        });
        
        const allSuccess = successfulSteps === totalSteps;
        console.log(`\n🎯 RISULTATO FINALE: ${allSuccess ? '✅ SUCCESSO' : '❌ FALLIMENTO'}`);
        
        // Salva report
        const reportPath = path.join(__dirname, `quick-restore-test-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Report salvato: ${reportPath}`);
        
        return allSuccess;
    }

    async run() {
        try {
            console.log('🚀 TEST RAPIDO DI RIPRISTINO - viaggi_db');
            console.log('='.repeat(60));
            console.log('⚠️  ATTENZIONE: Test su database separato - database originale NON toccato\n');
            
            await this.connect();
            await this.createTestDatabase();
            const backup = await this.findLatestBackup();
            await this.restoreBackup(backup);
            await this.verifyRestore();
            await this.cleanup();
            
            const success = this.generateReport();
            
            if (success) {
                console.log('\n🎉 TEST COMPLETATO CON SUCCESSO!');
                console.log('✅ Il sistema di backup e ripristino funziona correttamente');
            } else {
                console.log('\n⚠️  TEST COMPLETATO CON ERRORI');
                console.log('❌ Verificare i dettagli nel report');
            }
            
            return success;
            
        } catch (error) {
            console.error('\n💥 ERRORE DURANTE IL TEST:', error.message);
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
    const test = new QuickRestoreTest();
    try {
        const success = await test.run();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Test fallito:', error.message);
        process.exit(1);
    }
})();