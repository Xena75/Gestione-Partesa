const mysql = require('mysql2/promise');

// Configurazione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4'
};

// Schema atteso per le tabelle principali
const expectedSchemas = {
  backup_files: [
    'id', 'job_id', 'file_path', 'file_size', 'file_hash', 
    'backup_type', 'database_name', 'compression_type', 
    'created_at', 'updated_at', 'status', 'error_message'
  ],
  backup_schedules: [
    'id', 'schedule_name', 'backup_type', 'cron_expression', 
    'database_names', 'is_active', 'retention_days', 
    'max_parallel_jobs', 'priority', 'notification_emails',
    'created_by', 'created_at', 'updated_at', 'last_run', 
    'next_run', 'description'
  ],
  backup_jobs: [
    'id', 'database_name', 'backup_type', 'status', 
    'started_at', 'completed_at', 'file_path', 'file_size',
    'compression_ratio', 'error_message', 'created_by',
    'schedule_id', 'duration_seconds', 'records_count'
  ],
  backup_configs: [
    'id', 'config_key', 'config_value', 'description',
    'created_at', 'updated_at'
  ],
  backup_alerts: [
    'id', 'alert_type', 'severity', 'message', 'details',
    'job_id', 'schedule_id', 'is_resolved', 'created_at',
    'resolved_at', 'resolved_by'
  ],
  backup_activity_log: [
    'id', 'activity_type', 'user_id', 'description', 
    'details', 'ip_address', 'user_agent', 'created_at'
  ]
};

async function analyzeSchema() {
  let connection;
  
  try {
    console.log('🔍 Analisi struttura database backup_management...');
    connection = await mysql.createConnection(backupDbConfig);
    
    // Ottieni tutte le tabelle
    const [tables] = await connection.execute('SHOW TABLES');
    const existingTables = tables.map(row => Object.values(row)[0]);
    
    console.log('\n📋 Tabelle esistenti:', existingTables);
    
    const missingTables = [];
    const missingColumns = {};
    const extraColumns = {};
    
    // Analizza ogni tabella attesa
    for (const [tableName, expectedCols] of Object.entries(expectedSchemas)) {
      if (!existingTables.includes(tableName)) {
        missingTables.push(tableName);
        console.log(`\n❌ Tabella mancante: ${tableName}`);
        continue;
      }
      
      // Ottieni struttura tabella esistente
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      const existingCols = columns.map(col => col.Field);
      
      console.log(`\n🔍 Analisi tabella: ${tableName}`);
      console.log(`   Colonne esistenti: ${existingCols.join(', ')}`);
      
      // Trova colonne mancanti
      const missing = expectedCols.filter(col => !existingCols.includes(col));
      if (missing.length > 0) {
        missingColumns[tableName] = missing;
        console.log(`   ❌ Colonne mancanti: ${missing.join(', ')}`);
      }
      
      // Trova colonne extra
      const extra = existingCols.filter(col => !expectedCols.includes(col));
      if (extra.length > 0) {
        extraColumns[tableName] = extra;
        console.log(`   ℹ️  Colonne extra: ${extra.join(', ')}`);
      }
      
      if (missing.length === 0 && extra.length === 0) {
        console.log(`   ✅ Schema corretto`);
      }
    }
    
    // Report finale
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORT ANALISI SCHEMA DATABASE');
    console.log('='.repeat(60));
    
    if (missingTables.length > 0) {
      console.log('\n❌ TABELLE MANCANTI:');
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
    
    if (Object.keys(missingColumns).length > 0) {
      console.log('\n❌ COLONNE MANCANTI:');
      Object.entries(missingColumns).forEach(([table, cols]) => {
        console.log(`   ${table}:`);
        cols.forEach(col => console.log(`     - ${col}`));
      });
    }
    
    if (Object.keys(extraColumns).length > 0) {
      console.log('\nℹ️  COLONNE EXTRA (non previste):');
      Object.entries(extraColumns).forEach(([table, cols]) => {
        console.log(`   ${table}:`);
        cols.forEach(col => console.log(`     - ${col}`));
      });
    }
    
    // Suggerimenti per correzioni
    if (missingTables.length > 0 || Object.keys(missingColumns).length > 0) {
      console.log('\n🔧 AZIONI CONSIGLIATE:');
      
      if (missingTables.length > 0) {
        console.log('   1. Creare le tabelle mancanti con lo schema corretto');
      }
      
      if (Object.keys(missingColumns).length > 0) {
        console.log('   2. Aggiungere le colonne mancanti alle tabelle esistenti');
        console.log('   3. Verificare che i tipi di dati siano corretti');
        console.log('   4. Aggiornare gli indici se necessario');
      }
      
      console.log('   5. Testare il sistema di backup dopo le modifiche');
    } else {
      console.log('\n✅ SCHEMA DATABASE CORRETTO');
      console.log('   Tutte le tabelle e colonne necessarie sono presenti.');
    }
    
  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Il database backup_management non esiste.');
      console.log('   Creare il database prima di procedere.');
    }
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

analyzeSchema();