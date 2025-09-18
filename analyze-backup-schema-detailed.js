const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function analyzeBackupSchema() {
  let connection;
  
  try {
    // Connessione al database backup_management
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'backup_management'
    });

    console.log('🔍 ANALISI STRUTTURA DATABASE BACKUP_MANAGEMENT\n');
    console.log('=' .repeat(60));

    // 1. Verifica esistenza tabelle
    console.log('\n📋 TABELLE ESISTENTI:');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'backup_management'
    `);
    
    const existingTables = tables.map(t => t.TABLE_NAME);
    console.log('Tabelle trovate:', existingTables.join(', '));

    // 2. Analisi tabella backup_files
    if (existingTables.includes('backup_files')) {
      console.log('\n📁 STRUTTURA TABELLA backup_files:');
      const [backupFilesColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'backup_management' AND TABLE_NAME = 'backup_files'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('Colonne esistenti:');
      backupFilesColumns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.EXTRA || ''}`);
      });

      // Colonne ideali per backup_files
      const idealBackupFilesColumns = [
        'id', 'filename', 'file_path', 'file_size', 'backup_type', 
        'created_at', 'status', 'checksum', 'compression_type', 
        'retention_days', 'schedule_id', 'error_message'
      ];
      
      const existingBackupFilesColumns = backupFilesColumns.map(c => c.COLUMN_NAME);
      const missingBackupFilesColumns = idealBackupFilesColumns.filter(col => 
        !existingBackupFilesColumns.includes(col)
      );
      
      if (missingBackupFilesColumns.length > 0) {
        console.log('\n⚠️  COLONNE MANCANTI in backup_files:');
        missingBackupFilesColumns.forEach(col => console.log(`  - ${col}`));
      } else {
        console.log('\n✅ Tutte le colonne necessarie sono presenti in backup_files');
      }
    } else {
      console.log('\n❌ TABELLA backup_files NON TROVATA');
    }

    // 3. Analisi tabella backup_schedules
    if (existingTables.includes('backup_schedules')) {
      console.log('\n⏰ STRUTTURA TABELLA backup_schedules:');
      const [backupSchedulesColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'backup_management' AND TABLE_NAME = 'backup_schedules'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('Colonne esistenti:');
      backupSchedulesColumns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.EXTRA || ''}`);
      });

      // Colonne ideali per backup_schedules
      const idealBackupSchedulesColumns = [
        'id', 'name', 'description', 'cron_expression', 'backup_type',
        'target_database', 'retention_days', 'is_active', 'created_at',
        'updated_at', 'last_run', 'next_run', 'max_retries', 'notification_email'
      ];
      
      const existingBackupSchedulesColumns = backupSchedulesColumns.map(c => c.COLUMN_NAME);
      const missingBackupSchedulesColumns = idealBackupSchedulesColumns.filter(col => 
        !existingBackupSchedulesColumns.includes(col)
      );
      
      if (missingBackupSchedulesColumns.length > 0) {
        console.log('\n⚠️  COLONNE MANCANTI in backup_schedules:');
        missingBackupSchedulesColumns.forEach(col => console.log(`  - ${col}`));
      } else {
        console.log('\n✅ Tutte le colonne necessarie sono presenti in backup_schedules');
      }
    } else {
      console.log('\n❌ TABELLA backup_schedules NON TROVATA');
    }

    // 4. Verifica tabella backup_configs
    if (existingTables.includes('backup_configs')) {
      console.log('\n⚙️  STRUTTURA TABELLA backup_configs:');
      const [backupConfigsColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'backup_management' AND TABLE_NAME = 'backup_configs'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('Colonne esistenti:');
      backupConfigsColumns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.EXTRA || ''}`);
      });
    } else {
      console.log('\n❌ TABELLA backup_configs NON TROVATA');
      console.log('   Questa tabella è necessaria per la configurazione avanzata del sistema di backup.');
    }

    // 5. Generazione script SQL
    console.log('\n' + '=' .repeat(60));
    console.log('📝 SCRIPT SQL PER AGGIORNAMENTI NECESSARI:\n');
    
    let sqlScript = '-- Script di aggiornamento database backup_management\n';
    sqlScript += '-- Generato automaticamente\n\n';
    
    // Script per backup_files
    if (existingTables.includes('backup_files')) {
      const [backupFilesColumns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'backup_management' AND TABLE_NAME = 'backup_files'
      `);
      
      const existingCols = backupFilesColumns.map(c => c.COLUMN_NAME);
      
      sqlScript += '-- Aggiornamenti per tabella backup_files\n';
      if (!existingCols.includes('checksum')) {
        sqlScript += 'ALTER TABLE backup_files ADD COLUMN checksum VARCHAR(64) NULL COMMENT \'Hash MD5/SHA256 del file\';\n';
      }
      if (!existingCols.includes('compression_type')) {
        sqlScript += 'ALTER TABLE backup_files ADD COLUMN compression_type ENUM(\'none\', \'gzip\', \'zip\') DEFAULT \'none\';\n';
      }
      if (!existingCols.includes('retention_days')) {
        sqlScript += 'ALTER TABLE backup_files ADD COLUMN retention_days INT DEFAULT 30;\n';
      }
      if (!existingCols.includes('schedule_id')) {
        sqlScript += 'ALTER TABLE backup_files ADD COLUMN schedule_id INT NULL;\n';
      }
      if (!existingCols.includes('error_message')) {
        sqlScript += 'ALTER TABLE backup_files ADD COLUMN error_message TEXT NULL;\n';
      }
    }
    
    // Script per backup_schedules
    if (existingTables.includes('backup_schedules')) {
      const [backupSchedulesColumns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'backup_management' AND TABLE_NAME = 'backup_schedules'
      `);
      
      const existingCols = backupSchedulesColumns.map(c => c.COLUMN_NAME);
      
      sqlScript += '\n-- Aggiornamenti per tabella backup_schedules\n';
      if (!existingCols.includes('description')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN description TEXT NULL;\n';
      }
      if (!existingCols.includes('cron_expression')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN cron_expression VARCHAR(100) NULL;\n';
      }
      if (!existingCols.includes('target_database')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN target_database VARCHAR(100) NULL;\n';
      }
      if (!existingCols.includes('retention_days')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN retention_days INT DEFAULT 30;\n';
      }
      if (!existingCols.includes('is_active')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN is_active BOOLEAN DEFAULT TRUE;\n';
      }
      if (!existingCols.includes('updated_at')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;\n';
      }
      if (!existingCols.includes('last_run')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN last_run TIMESTAMP NULL;\n';
      }
      if (!existingCols.includes('next_run')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN next_run TIMESTAMP NULL;\n';
      }
      if (!existingCols.includes('max_retries')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN max_retries INT DEFAULT 3;\n';
      }
      if (!existingCols.includes('notification_email')) {
        sqlScript += 'ALTER TABLE backup_schedules ADD COLUMN notification_email VARCHAR(255) NULL;\n';
      }
    }
    
    // Script per backup_configs
    if (!existingTables.includes('backup_configs')) {
      sqlScript += '\n-- Creazione tabella backup_configs\n';
      sqlScript += `CREATE TABLE backup_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Configurazioni sistema backup';

`;
      
      sqlScript += `-- Inserimento configurazioni di default
INSERT INTO backup_configs (config_key, config_value, description) VALUES
('backup_retention_days', '30', 'Giorni di retention di default per i backup'),
('max_backup_size_mb', '1024', 'Dimensione massima backup in MB'),
('notification_enabled', 'true', 'Abilitazione notifiche email'),
('compression_enabled', 'true', 'Abilitazione compressione backup'),
('backup_directory', 'M:\\\\Progetti\\\\In produzione\\\\gestione-partesa\\\\backup-system\\\\backups', 'Directory di default per i backup');

`;
    }
    
    console.log(sqlScript);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ ANALISI COMPLETATA');
    console.log('\n📋 RIEPILOGO:');
    console.log(`- Tabelle esistenti: ${existingTables.length}`);
    console.log(`- backup_files: ${existingTables.includes('backup_files') ? '✅ Presente' : '❌ Mancante'}`);
    console.log(`- backup_schedules: ${existingTables.includes('backup_schedules') ? '✅ Presente' : '❌ Mancante'}`);
    console.log(`- backup_configs: ${existingTables.includes('backup_configs') ? '✅ Presente' : '❌ Mancante (da creare)'}`);
    
  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Il database backup_management non esiste ancora.');
      console.log('   Questo è normale se il sistema di backup non è stato ancora inizializzato.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

analyzeBackupSchema();