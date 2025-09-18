const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Script per applicare gli aggiornamenti al database backup_management
async function applyDatabaseUpdate() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'backup_management'
    });

    try {
        console.log('🔄 Applicazione aggiornamenti al database backup_management...');
        
        // Aggiornamenti tabella backup_files
        console.log('\n📊 Aggiornamento tabella backup_files...');
        
        const backupFilesUpdates = [
            {
                sql: `ALTER TABLE backup_files ADD COLUMN execution_time_seconds INT DEFAULT NULL COMMENT 'Tempo di esecuzione del backup in secondi'`,
                desc: 'execution_time_seconds'
            },
            {
                sql: `ALTER TABLE backup_files ADD COLUMN compressed_size BIGINT DEFAULT NULL COMMENT 'Dimensione del file compresso in bytes'`,
                desc: 'compressed_size'
            },
            {
                sql: `ALTER TABLE backup_files ADD COLUMN compression_ratio DECIMAL(5,2) DEFAULT NULL COMMENT 'Rapporto di compressione'`,
                desc: 'compression_ratio'
            },
            {
                sql: `ALTER TABLE backup_files ADD COLUMN file_hash VARCHAR(64) DEFAULT NULL COMMENT 'Hash SHA-256 del file per verifica integrità'`,
                desc: 'file_hash'
            },
            {
                sql: `ALTER TABLE backup_files ADD COLUMN verification_status ENUM('pending', 'verified', 'failed', 'skipped') DEFAULT 'pending' COMMENT 'Stato della verifica di integrità'`,
                desc: 'verification_status'
            },
            {
                sql: `ALTER TABLE backup_files ADD COLUMN last_verified_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Data ultima verifica'`,
                desc: 'last_verified_at'
            }
        ];
        
        for (const update of backupFilesUpdates) {
            try {
                await connection.execute(update.sql);
                console.log(`  ✓ Aggiunta colonna: ${update.desc}`);
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ⚠️ Colonna ${update.desc} già esistente, skip`);
                } else {
                    throw error;
                }
            }
        }
        
        // Aggiornamenti tabella backup_schedules
        console.log('\n📋 Aggiornamento tabella backup_schedules...');
        
        const backupSchedulesUpdates = [
            {
                sql: `ALTER TABLE backup_schedules ADD COLUMN max_retries INT DEFAULT 3 COMMENT 'Numero massimo di tentativi'`,
                desc: 'max_retries'
            },
            {
                sql: `ALTER TABLE backup_schedules ADD COLUMN retry_interval_minutes INT DEFAULT 30 COMMENT 'Intervallo tra i retry in minuti'`,
                desc: 'retry_interval_minutes'
            },
            {
                sql: `ALTER TABLE backup_schedules ADD COLUMN email_notifications BOOLEAN DEFAULT FALSE COMMENT 'Abilita notifiche email'`,
                desc: 'email_notifications'
            },
            {
                sql: `ALTER TABLE backup_schedules ADD COLUMN notification_emails TEXT DEFAULT NULL COMMENT 'Indirizzi email per notifiche'`,
                desc: 'notification_emails'
            },
            {
                sql: `ALTER TABLE backup_schedules ADD COLUMN priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal' COMMENT 'Priorità dello schedule'`,
                desc: 'priority'
            }
        ];
        
        for (const update of backupSchedulesUpdates) {
            try {
                await connection.execute(update.sql);
                console.log(`  ✓ Aggiunta colonna: ${update.desc}`);
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  ⚠️ Colonna ${update.desc} già esistente, skip`);
                } else {
                    throw error;
                }
            }
        }
        
        // Creazione tabella backup_configs
        console.log('\n⚙️ Creazione tabella backup_configs...');
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS backup_configs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    config_key VARCHAR(100) NOT NULL UNIQUE,
                    config_value TEXT NOT NULL,
                    description TEXT DEFAULT NULL,
                    config_type ENUM('string', 'integer', 'boolean', 'json') DEFAULT 'string',
                    is_system BOOLEAN DEFAULT FALSE COMMENT 'Configurazione di sistema',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_config_key (config_key),
                    INDEX idx_is_system (is_system)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                COMMENT='Configurazioni globali del sistema di backup'
            `);
            console.log('  ✓ Tabella backup_configs creata');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('  ⚠️ Tabella backup_configs già esistente, skip');
            } else {
                throw error;
            }
        }
        
        // Inserimento configurazioni default
        console.log('\n📝 Inserimento configurazioni default...');
        const configs = [
            ['system.max_concurrent_backups', '3', 'Numero massimo di backup simultanei', 'integer', true],
            ['system.default_retention_days', '30', 'Giorni di retention predefiniti', 'integer', true],
            ['system.compression_enabled', 'true', 'Abilita compressione dei backup', 'boolean', true],
            ['system.verification_enabled', 'true', 'Abilita verifica automatica', 'boolean', true],
            ['system.cleanup_enabled', 'true', 'Abilita pulizia automatica', 'boolean', true],
            ['notifications.email_enabled', 'false', 'Abilita notifiche email globali', 'boolean', false],
            ['notifications.smtp_host', '', 'Server SMTP per invio email', 'string', false],
            ['notifications.smtp_port', '587', 'Porta SMTP', 'integer', false],
            ['monitoring.health_check_interval', '300', 'Intervallo controlli di salute in secondi', 'integer', true],
            ['monitoring.alert_threshold_failures', '3', 'Soglia di fallimenti per alert', 'integer', true]
        ];
        
        for (const config of configs) {
            try {
                await connection.execute(
                    'INSERT INTO backup_configs (config_key, config_value, description, config_type, is_system) VALUES (?, ?, ?, ?, ?)',
                    config
                );
                console.log(`  ✓ Configurazione inserita: ${config[0]}`);
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`  ⚠️ Configurazione ${config[0]} già esistente, skip`);
                } else {
                    throw error;
                }
            }
        }
        
        // Creazione tabella backup_logs
        console.log('\n📋 Creazione tabella backup_logs...');
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS backup_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    backup_file_id INT DEFAULT NULL,
                    schedule_id INT DEFAULT NULL,
                    log_level ENUM('debug', 'info', 'warning', 'error', 'critical') NOT NULL,
                    message TEXT NOT NULL,
                    details JSON DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_backup_file_id (backup_file_id),
                    INDEX idx_schedule_id (schedule_id),
                    INDEX idx_log_level (log_level),
                    INDEX idx_created_at (created_at),
                    FOREIGN KEY (backup_file_id) REFERENCES backup_files(id) ON DELETE SET NULL,
                    FOREIGN KEY (schedule_id) REFERENCES backup_schedules(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                COMMENT='Log dettagliati delle operazioni di backup'
            `);
            console.log('  ✓ Tabella backup_logs creata');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('  ⚠️ Tabella backup_logs già esistente, skip');
            } else {
                throw error;
            }
        }
        
        // Verifica finale
        console.log('\n🔍 Verifica finale...');
        
        // Conta tabelle
        const [tableCount] = await connection.execute(`
            SELECT COUNT(*) as total_tables 
            FROM information_schema.tables 
            WHERE table_schema = 'backup_management'
        `);
        
        // Conta configurazioni
        const [configCount] = await connection.execute('SELECT COUNT(*) as total_configs FROM backup_configs');
        
        console.log('\n📈 Riepilogo aggiornamento:');
        console.log(`  📊 Totale tabelle nel database: ${tableCount[0].total_tables}`);
        console.log(`  ⚙️ Configurazioni inserite: ${configCount[0].total_configs}`);
        
        console.log('\n🎯 Aggiornamento database completato con successo!');
        console.log('💡 Il sistema di backup continua a funzionare normalmente.');
        console.log('🔧 Le nuove funzionalità di monitoraggio sono ora disponibili.');
        
    } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento del database:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Esegui aggiornamento
if (require.main === module) {
    applyDatabaseUpdate()
        .then(() => {
            console.log('\n✨ Processo completato con successo!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Errore fatale:', error.message);
            process.exit(1);
        });
}

module.exports = { applyDatabaseUpdate };